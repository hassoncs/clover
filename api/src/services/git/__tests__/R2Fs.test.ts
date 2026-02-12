import { beforeEach, describe, expect, it, vi } from "vitest";
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

describe("R2Fs", () => {
	let bucket: R2Bucket;
	let store: Map<string, StoredObject>;
	let fs: R2Fs;

	beforeEach(() => {
		const mock = createMockBucket();
		bucket = mock.bucket;
		store = mock.store;
		fs = new R2Fs(bucket, "repos/game123/.git");
	});

	describe("key mapping", () => {
		it("maps relative paths to prefixed R2 keys", async () => {
			seed(store, { "repos/game123/.git/HEAD": "ref: refs/heads/main\n" });

			await fs.promises.readFile("HEAD", { encoding: "utf8" });

			expect(bucket.get).toHaveBeenCalledWith("repos/game123/.git/HEAD");
		});

		it("handles nested paths", async () => {
			seed(store, {
				"repos/game123/.git/refs/heads/main": "abc123\n",
			});

			await fs.promises.readFile("refs/heads/main", { encoding: "utf8" });

			expect(bucket.get).toHaveBeenCalledWith(
				"repos/game123/.git/refs/heads/main",
			);
		});

		it("normalizes leading/trailing slashes in paths", async () => {
			seed(store, { "repos/game123/.git/HEAD": "ref: refs/heads/main\n" });

			await fs.promises.readFile("/HEAD/", { encoding: "utf8" });

			expect(bucket.get).toHaveBeenCalledWith("repos/game123/.git/HEAD");
		});

		it("normalizes prefix with trailing slash", () => {
			const fs2 = new R2Fs(bucket, "repos/game123/.git/");
			seed(store, { "repos/game123/.git/HEAD": "data" });

			expect(fs2.promises.readFile("HEAD", { encoding: "utf8" })).resolves.toBe(
				"data",
			);
		});
	});

	describe("readFile", () => {
		it("returns Uint8Array by default", async () => {
			seed(store, { "repos/game123/.git/HEAD": "ref: refs/heads/main\n" });

			const result = await fs.promises.readFile("HEAD");

			expect(result).toBeInstanceOf(Uint8Array);
			expect(new TextDecoder().decode(result as Uint8Array)).toBe(
				"ref: refs/heads/main\n",
			);
		});

		it("returns string when encoding is utf8", async () => {
			seed(store, { "repos/game123/.git/HEAD": "ref: refs/heads/main\n" });

			const result = await fs.promises.readFile("HEAD", {
				encoding: "utf8",
			});

			expect(typeof result).toBe("string");
			expect(result).toBe("ref: refs/heads/main\n");
		});

		it("accepts encoding as string shorthand", async () => {
			seed(store, { "repos/game123/.git/config": "[core]\n" });

			const result = await fs.promises.readFile("config", "utf8");

			expect(typeof result).toBe("string");
			expect(result).toBe("[core]\n");
		});

		it("throws ENOENT for missing files", async () => {
			await expect(fs.promises.readFile("nonexistent")).rejects.toThrow(
				"ENOENT",
			);

			try {
				await fs.promises.readFile("nonexistent");
			} catch (err) {
				expect((err as { code: string }).code).toBe("ENOENT");
			}
		});
	});

	describe("writeFile", () => {
		it("writes string data to R2", async () => {
			await fs.promises.writeFile("HEAD", "ref: refs/heads/main\n");

			expect(bucket.put).toHaveBeenCalledWith(
				"repos/game123/.git/HEAD",
				"ref: refs/heads/main\n",
			);
		});

		it("writes Uint8Array data to R2", async () => {
			const data = new Uint8Array([0x01, 0x02, 0x03]);

			await fs.promises.writeFile("objects/ab/cdef", data);

			expect(bucket.put).toHaveBeenCalledWith(
				"repos/game123/.git/objects/ab/cdef",
				data,
			);
		});

		it("creates the object in the store", async () => {
			await fs.promises.writeFile("config", "[core]\n");

			expect(store.has("repos/game123/.git/config")).toBe(true);
		});
	});

	describe("unlink", () => {
		it("deletes the R2 object", async () => {
			seed(store, { "repos/game123/.git/index.lock": "" });

			await fs.promises.unlink("index.lock");

			expect(bucket.delete).toHaveBeenCalledWith(
				"repos/game123/.git/index.lock",
			);
		});
	});

	describe("readdir", () => {
		it("lists immediate children of a directory", async () => {
			seed(store, {
				"repos/game123/.git/refs/heads/main": "abc123\n",
				"repos/game123/.git/refs/heads/feature": "def456\n",
				"repos/game123/.git/refs/tags/v1.0": "789abc\n",
			});

			const entries = await fs.promises.readdir("refs");

			expect(entries).toContain("heads");
			expect(entries).toContain("tags");
			expect(entries).toHaveLength(2);
		});

		it("lists files in a leaf directory", async () => {
			seed(store, {
				"repos/game123/.git/refs/heads/main": "abc123\n",
				"repos/game123/.git/refs/heads/feature": "def456\n",
			});

			const entries = await fs.promises.readdir("refs/heads");

			expect(entries).toContain("main");
			expect(entries).toContain("feature");
			expect(entries).toHaveLength(2);
		});

		it("lists root directory contents", async () => {
			seed(store, {
				"repos/game123/.git/HEAD": "ref: refs/heads/main\n",
				"repos/game123/.git/config": "[core]\n",
				"repos/game123/.git/refs/heads/main": "abc123\n",
			});

			const entries = await fs.promises.readdir(".");

			expect(entries).toContain("HEAD");
			expect(entries).toContain("config");
			expect(entries).toContain("refs");
		});

		it("returns empty array for empty directory", async () => {
			const entries = await fs.promises.readdir("refs/heads");

			expect(entries).toEqual([]);
		});

		it("handles empty path as root", async () => {
			seed(store, {
				"repos/game123/.git/HEAD": "data",
			});

			const entries = await fs.promises.readdir("");

			expect(entries).toContain("HEAD");
		});
	});

	describe("mkdir", () => {
		it("is a no-op", async () => {
			await expect(
				fs.promises.mkdir("refs/heads", { recursive: true }),
			).resolves.toBeUndefined();
		});
	});

	describe("rmdir", () => {
		it("is a no-op", async () => {
			await expect(fs.promises.rmdir("refs/heads")).resolves.toBeUndefined();
		});
	});

	describe("stat", () => {
		it("returns file stat for existing objects", async () => {
			seed(store, { "repos/game123/.git/HEAD": "ref: refs/heads/main\n" });

			const stat = await fs.promises.stat("HEAD");

			expect(stat.isFile()).toBe(true);
			expect(stat.isDirectory()).toBe(false);
			expect(stat.isSymbolicLink()).toBe(false);
			expect(stat.size).toBe(
				new TextEncoder().encode("ref: refs/heads/main\n").length,
			);
			expect(stat.mtimeMs).toBe(new Date("2026-01-15T00:00:00Z").getTime());
		});

		it("returns directory stat when prefix has children", async () => {
			seed(store, {
				"repos/game123/.git/refs/heads/main": "abc123\n",
			});

			const stat = await fs.promises.stat("refs");

			expect(stat.isFile()).toBe(false);
			expect(stat.isDirectory()).toBe(true);
			expect(stat.isSymbolicLink()).toBe(false);
		});

		it("throws ENOENT for nonexistent paths", async () => {
			await expect(fs.promises.stat("nonexistent")).rejects.toThrow("ENOENT");

			try {
				await fs.promises.stat("nonexistent");
			} catch (err) {
				expect((err as { code: string }).code).toBe("ENOENT");
			}
		});

		it("prefers file over directory when both could match", async () => {
			seed(store, {
				"repos/game123/.git/packed-refs": "# pack-refs\n",
				"repos/game123/.git/packed-refs/extra": "data",
			});

			const stat = await fs.promises.stat("packed-refs");

			expect(stat.isFile()).toBe(true);
		});
	});

	describe("lstat", () => {
		it("behaves identically to stat", async () => {
			seed(store, { "repos/game123/.git/HEAD": "ref: refs/heads/main\n" });

			const stat = await fs.promises.stat("HEAD");
			const lstat = await fs.promises.lstat("HEAD");

			expect(lstat.isFile()).toBe(stat.isFile());
			expect(lstat.isDirectory()).toBe(stat.isDirectory());
			expect(lstat.size).toBe(stat.size);
		});
	});

	describe("binary data round-trip", () => {
		it("preserves binary data through write and read", async () => {
			const original = new Uint8Array([0x00, 0x01, 0x02, 0xff, 0xfe, 0xfd]);

			await fs.promises.writeFile("objects/ab/cdef", original);
			const result = await fs.promises.readFile("objects/ab/cdef");

			expect(result).toBeInstanceOf(Uint8Array);
			const bytes = result as Uint8Array;
			expect(bytes.length).toBe(original.length);
			for (let i = 0; i < original.length; i++) {
				expect(bytes[i]).toBe(original[i]);
			}
		});
	});
});
