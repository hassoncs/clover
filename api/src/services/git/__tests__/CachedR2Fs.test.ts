import { beforeEach, describe, expect, it, vi } from "vitest";
import { CachedR2Fs } from "../CachedR2Fs";
import { R2Fs } from "../R2Fs";

type R2Bucket = import("@cloudflare/workers-types").R2Bucket;

interface StoredObject {
	body: ArrayBuffer | Uint8Array | string;
	size: number;
	uploaded: Date;
}

function createMockBucket() {
	const store = new Map<string, StoredObject>();

	const bucket = {
		get: vi.fn().mockImplementation(async (key: string) => {
			const obj = store.get(key);
			if (!obj) return null;
			const bodyBytes =
				typeof obj.body === "string"
					? new TextEncoder().encode(obj.body)
					: new Uint8Array(obj.body);
			return {
				key,
				size: obj.size,
				uploaded: obj.uploaded,
				arrayBuffer: async () => bodyBytes.buffer,
				text: async () =>
					typeof obj.body === "string"
						? obj.body
						: new TextDecoder().decode(obj.body),
			};
		}),

		put: vi
			.fn()
			.mockImplementation(
				async (key: string, data: ArrayBuffer | Uint8Array | string) => {
					const size =
						typeof data === "string"
							? new TextEncoder().encode(data).length
							: data instanceof Uint8Array
								? data.length
								: (data as ArrayBuffer).byteLength;
					store.set(key, { body: data, size, uploaded: new Date() });
				},
			),

		delete: vi.fn().mockImplementation(async (key: string) => {
			store.delete(key);
		}),

		head: vi.fn().mockImplementation(async (key: string) => {
			const obj = store.get(key);
			if (!obj) return null;
			return {
				key,
				size: obj.size,
				uploaded: obj.uploaded,
			};
		}),

		list: vi
			.fn()
			.mockImplementation(
				async (opts: {
					prefix?: string;
					delimiter?: string;
					limit?: number;
				}) => {
					const prefix = opts.prefix ?? "";
					const delimiter = opts.delimiter;

					const objects: Array<{ key: string; size: number; uploaded: Date }> =
						[];
					const delimitedPrefixes: string[] = [];
					const seenPrefixes = new Set<string>();

					for (const [key, obj] of store.entries()) {
						if (!key.startsWith(prefix)) continue;

						const rest = key.slice(prefix.length);

						if (delimiter) {
							const delimIdx = rest.indexOf(delimiter);
							if (delimIdx >= 0) {
								const dp = prefix + rest.slice(0, delimIdx + 1);
								if (!seenPrefixes.has(dp)) {
									seenPrefixes.add(dp);
									delimitedPrefixes.push(dp);
								}
							} else {
								objects.push({
									key,
									size: obj.size,
									uploaded: obj.uploaded,
								});
							}
						} else {
							objects.push({
								key,
								size: obj.size,
								uploaded: obj.uploaded,
							});
						}
					}

					if (opts.limit !== undefined) {
						return {
							objects: objects.slice(0, opts.limit),
							delimitedPrefixes: delimitedPrefixes.slice(0, opts.limit),
							truncated: false,
							cursor: undefined,
						};
					}

					return {
						objects,
						delimitedPrefixes,
						truncated: false,
						cursor: undefined,
					};
				},
			),
	} as unknown as R2Bucket;

	return { bucket, store };
}

function seed(store: Map<string, StoredObject>, files: Record<string, string>) {
	for (const [key, content] of Object.entries(files)) {
		store.set(key, {
			body: content,
			size: new TextEncoder().encode(content).length,
			uploaded: new Date("2026-01-15T00:00:00Z"),
		});
	}
}

describe("CachedR2Fs", () => {
	let bucket: R2Bucket;
	let store: Map<string, StoredObject>;
	let r2fs: R2Fs;
	let cached: CachedR2Fs;

	beforeEach(() => {
		const mock = createMockBucket();
		bucket = mock.bucket;
		store = mock.store;
		r2fs = new R2Fs(bucket, "repos/game123/.git");
		cached = new CachedR2Fs(r2fs);
	});

	describe("readFile cache hit", () => {
		it("returns cached data on second read of a git object", async () => {
			seed(store, {
				"repos/game123/.git/objects/ab/cdef1234": "blob data",
			});

			const first = await cached.promises.readFile(
				"objects/ab/cdef1234",
				"utf8",
			);
			const second = await cached.promises.readFile(
				"objects/ab/cdef1234",
				"utf8",
			);

			expect(first).toBe("blob data");
			expect(second).toBe("blob data");
			expect(bucket.get).toHaveBeenCalledTimes(1);
		});

		it("returns cached data on second read of a ref", async () => {
			seed(store, {
				"repos/game123/.git/refs/heads/main": "abc123\n",
			});

			const first = await cached.promises.readFile("refs/heads/main", "utf8");
			const second = await cached.promises.readFile("refs/heads/main", "utf8");

			expect(first).toBe("abc123\n");
			expect(second).toBe("abc123\n");
			expect(bucket.get).toHaveBeenCalledTimes(1);
		});

		it("caches HEAD reads", async () => {
			seed(store, {
				"repos/game123/.git/HEAD": "ref: refs/heads/main\n",
			});

			await cached.promises.readFile("HEAD", "utf8");
			await cached.promises.readFile("HEAD", "utf8");

			expect(bucket.get).toHaveBeenCalledTimes(1);
		});

		it("caches .idx file reads", async () => {
			seed(store, {
				"repos/game123/.git/objects/pack/pack-abc.idx": "index data",
			});

			await cached.promises.readFile("objects/pack/pack-abc.idx", "utf8");
			await cached.promises.readFile("objects/pack/pack-abc.idx", "utf8");

			expect(bucket.get).toHaveBeenCalledTimes(1);
		});

		it("caches .pack file reads", async () => {
			seed(store, {
				"repos/game123/.git/objects/pack/pack-abc.pack": "pack data",
			});

			await cached.promises.readFile("objects/pack/pack-abc.pack", "utf8");
			await cached.promises.readFile("objects/pack/pack-abc.pack", "utf8");

			expect(bucket.get).toHaveBeenCalledTimes(1);
		});
	});

	describe("readFile cache miss", () => {
		it("falls through to R2 on first read", async () => {
			seed(store, {
				"repos/game123/.git/objects/ab/cdef1234": "blob data",
			});

			const result = await cached.promises.readFile(
				"objects/ab/cdef1234",
				"utf8",
			);

			expect(result).toBe("blob data");
			expect(bucket.get).toHaveBeenCalledTimes(1);
		});

		it("does not cache 'other' category files", async () => {
			seed(store, {
				"repos/game123/.git/config": "[core]\n",
			});

			await cached.promises.readFile("config", "utf8");
			await cached.promises.readFile("config", "utf8");

			expect(bucket.get).toHaveBeenCalledTimes(2);
		});

		it("does not cache index file", async () => {
			seed(store, {
				"repos/game123/.git/index": "binary index data",
			});

			await cached.promises.readFile("index", "utf8");
			await cached.promises.readFile("index", "utf8");

			expect(bucket.get).toHaveBeenCalledTimes(2);
		});
	});

	describe("readFile encoding variants", () => {
		it("caches separately for different encodings", async () => {
			seed(store, {
				"repos/game123/.git/objects/ab/cdef1234": "blob data",
			});

			const asString = await cached.promises.readFile(
				"objects/ab/cdef1234",
				"utf8",
			);
			const asBinary = await cached.promises.readFile("objects/ab/cdef1234");

			expect(typeof asString).toBe("string");
			expect(asBinary).toBeInstanceOf(Uint8Array);
			expect(bucket.get).toHaveBeenCalledTimes(2);
		});
	});

	describe("writeFile write-through", () => {
		it("updates cache on write for git objects", async () => {
			const data = new Uint8Array([0x01, 0x02, 0x03]);

			await cached.promises.writeFile("objects/ab/newobj", data);
			const result = await cached.promises.readFile("objects/ab/newobj");

			expect(result).toBe(data);
			expect(bucket.get).not.toHaveBeenCalled();
		});

		it("writes through to underlying R2", async () => {
			await cached.promises.writeFile("objects/ab/newobj", "blob content");

			expect(bucket.put).toHaveBeenCalledWith(
				"repos/game123/.git/objects/ab/newobj",
				"blob content",
			);
		});

		it("invalidates existing cache entry on write", async () => {
			seed(store, {
				"repos/game123/.git/refs/heads/main": "old-sha\n",
			});

			await cached.promises.readFile("refs/heads/main", "utf8");
			expect(bucket.get).toHaveBeenCalledTimes(1);

			await cached.promises.writeFile("refs/heads/main", "new-sha\n");

			const result = await cached.promises.readFile("refs/heads/main", "utf8");
			expect(result).toBe("new-sha\n");
			expect(bucket.get).toHaveBeenCalledTimes(1);
		});

		it("invalidates stat cache on write", async () => {
			seed(store, {
				"repos/game123/.git/refs/heads/main": "abc123\n",
			});

			await cached.promises.stat("refs/heads/main");
			expect(bucket.head).toHaveBeenCalledTimes(1);

			await cached.promises.writeFile("refs/heads/main", "def456\n");

			await cached.promises.stat("refs/heads/main");
			expect(bucket.head).toHaveBeenCalledTimes(2);
		});
	});

	describe("unlink", () => {
		it("removes from cache and underlying R2", async () => {
			seed(store, {
				"repos/game123/.git/objects/ab/cdef1234": "blob data",
			});

			await cached.promises.readFile("objects/ab/cdef1234", "utf8");
			expect(bucket.get).toHaveBeenCalledTimes(1);

			await cached.promises.unlink("objects/ab/cdef1234");

			expect(bucket.delete).toHaveBeenCalledWith(
				"repos/game123/.git/objects/ab/cdef1234",
			);

			await expect(
				cached.promises.readFile("objects/ab/cdef1234", "utf8"),
			).rejects.toThrow("ENOENT");
			expect(bucket.get).toHaveBeenCalledTimes(2);
		});

		it("invalidates stat cache on unlink", async () => {
			seed(store, {
				"repos/game123/.git/refs/heads/main": "abc123\n",
			});

			await cached.promises.stat("refs/heads/main");
			await cached.promises.unlink("refs/heads/main");

			await expect(cached.promises.stat("refs/heads/main")).rejects.toThrow(
				"ENOENT",
			);
		});
	});

	describe("stat caching", () => {
		it("caches stat results for git objects", async () => {
			seed(store, {
				"repos/game123/.git/objects/ab/cdef1234": "blob data",
			});

			const first = await cached.promises.stat("objects/ab/cdef1234");
			const second = await cached.promises.stat("objects/ab/cdef1234");

			expect(first.isFile()).toBe(true);
			expect(second.isFile()).toBe(true);
			expect(bucket.head).toHaveBeenCalledTimes(1);
		});

		it("does not cache stat for 'other' category", async () => {
			seed(store, {
				"repos/game123/.git/config": "[core]\n",
			});

			await cached.promises.stat("config");
			await cached.promises.stat("config");

			expect(bucket.head).toHaveBeenCalledTimes(2);
		});

		it("lstat delegates to stat with caching", async () => {
			seed(store, {
				"repos/game123/.git/objects/ab/cdef1234": "blob data",
			});

			await cached.promises.lstat("objects/ab/cdef1234");
			await cached.promises.lstat("objects/ab/cdef1234");

			expect(bucket.head).toHaveBeenCalledTimes(1);
		});
	});

	describe("readdir is NOT cached", () => {
		it("always calls through to R2", async () => {
			seed(store, {
				"repos/game123/.git/refs/heads/main": "abc123\n",
				"repos/game123/.git/refs/heads/feature": "def456\n",
			});

			const first = await cached.promises.readdir("refs/heads");
			const second = await cached.promises.readdir("refs/heads");

			expect(first).toEqual(second);
			expect(bucket.list).toHaveBeenCalledTimes(2);
		});
	});

	describe("LRU eviction", () => {
		it("evicts least recently used entries when cache is full", async () => {
			const smallCache = new CachedR2Fs(r2fs, 100);

			seed(store, {
				"repos/game123/.git/objects/aa/first": "a".repeat(40),
				"repos/game123/.git/objects/bb/second": "b".repeat(40),
				"repos/game123/.git/objects/cc/third": "c".repeat(40),
			});

			await smallCache.promises.readFile("objects/aa/first", "utf8");
			await smallCache.promises.readFile("objects/bb/second", "utf8");
			await smallCache.promises.readFile("objects/cc/third", "utf8");

			(bucket.get as ReturnType<typeof vi.fn>).mockClear();

			await smallCache.promises.readFile("objects/cc/third", "utf8");
			expect(bucket.get).toHaveBeenCalledTimes(0);

			await smallCache.promises.readFile("objects/aa/first", "utf8");
			expect(bucket.get).toHaveBeenCalledTimes(1);
		});
	});

	describe("clearCache", () => {
		it("clears all cached entries", async () => {
			seed(store, {
				"repos/game123/.git/objects/ab/cdef1234": "blob data",
			});

			await cached.promises.readFile("objects/ab/cdef1234", "utf8");
			expect(cached.cacheSize).toBeGreaterThan(0);

			cached.clearCache();

			expect(cached.cacheSize).toBe(0);
			expect(cached.cacheBytes).toBe(0);

			await cached.promises.readFile("objects/ab/cdef1234", "utf8");
			expect(bucket.get).toHaveBeenCalledTimes(2);
		});
	});

	describe("refs TTL expiration", () => {
		it("expires ref cache entries after TTL", async () => {
			seed(store, {
				"repos/game123/.git/refs/heads/main": "abc123\n",
			});

			await cached.promises.readFile("refs/heads/main", "utf8");
			expect(bucket.get).toHaveBeenCalledTimes(1);

			vi.useFakeTimers();
			try {
				vi.advanceTimersByTime(6_000);

				await cached.promises.readFile("refs/heads/main", "utf8");
				expect(bucket.get).toHaveBeenCalledTimes(2);
			} finally {
				vi.useRealTimers();
			}
		});

		it("does not expire immutable git objects", async () => {
			seed(store, {
				"repos/game123/.git/objects/ab/cdef1234": "blob data",
			});

			await cached.promises.readFile("objects/ab/cdef1234", "utf8");

			vi.useFakeTimers();
			try {
				vi.advanceTimersByTime(60_000);

				await cached.promises.readFile("objects/ab/cdef1234", "utf8");
				expect(bucket.get).toHaveBeenCalledTimes(1);
			} finally {
				vi.useRealTimers();
			}
		});
	});

	describe("passthrough operations", () => {
		it("mkdir passes through to R2Fs", async () => {
			await expect(
				cached.promises.mkdir("refs/heads", { recursive: true }),
			).resolves.toBeUndefined();
		});

		it("rmdir passes through to R2Fs", async () => {
			await expect(
				cached.promises.rmdir("refs/heads"),
			).resolves.toBeUndefined();
		});
	});

	describe("ENOENT propagation", () => {
		it("propagates ENOENT from readFile", async () => {
			await expect(
				cached.promises.readFile("objects/ab/nonexistent"),
			).rejects.toThrow("ENOENT");
		});

		it("propagates ENOENT from stat", async () => {
			await expect(cached.promises.stat("nonexistent")).rejects.toThrow(
				"ENOENT",
			);
		});

		it("does not cache ENOENT errors", async () => {
			try {
				await cached.promises.readFile("objects/ab/missing", "utf8");
			} catch {
				/* empty */
			}

			seed(store, {
				"repos/game123/.git/objects/ab/missing": "now exists",
			});

			const result = await cached.promises.readFile(
				"objects/ab/missing",
				"utf8",
			);
			expect(result).toBe("now exists");
		});
	});
});
