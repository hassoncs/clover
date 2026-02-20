import { beforeEach, describe, expect, it, vi } from "vitest";
import { GameRepoDO } from "../GameRepoDO";

type R2Bucket = import("@cloudflare/workers-types").R2Bucket;
type DurableObjectState =
	import("@cloudflare/workers-types").DurableObjectState;

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

function createMockState(): DurableObjectState {
	return {
		storage: {
			get: vi.fn(),
			put: vi.fn(),
			delete: vi.fn(),
			list: vi.fn().mockResolvedValue(new Map()),
			setAlarm: vi.fn(),
		},
		getWebSockets: vi.fn().mockReturnValue([]),
		acceptWebSocket: vi.fn(),
		id: { toString: () => "test-id" },
	} as unknown as DurableObjectState;
}

function makeRequest(
	method: string,
	path: string,
	body?: unknown,
	headers?: Record<string, string>,
): Request {
	const init: RequestInit = { method, headers: headers ?? {} };
	if (body) {
		init.body = JSON.stringify(body);
		(init.headers as Record<string, string>)["Content-Type"] =
			"application/json";
	}
	return new Request(`https://fake-host${path}`, init);
}

async function parseJson(response: Response): Promise<unknown> {
	return response.json();
}

describe("GameRepoDO", () => {
	let bucket: R2Bucket;
	let dobj: GameRepoDO;

	beforeEach(() => {
		const mock = createMockBucket();
		bucket = mock.bucket;
		const state = createMockState();
		dobj = new GameRepoDO(state, { ASSETS: bucket });
	});

	describe("init", () => {
		it("initializes a git repo", async () => {
			const req = makeRequest("POST", "/init", { gameId: "game-abc" });
			const res = await dobj.fetch(req);

			expect(res.status).toBe(200);
			const data = (await parseJson(res)) as { ok: boolean };
			expect(data.ok).toBe(true);
		});

		it("returns 400 when gameId is missing", async () => {
			const req = makeRequest("POST", "/init", {});
			const res = await dobj.fetch(req);

			expect(res.status).toBe(400);
			const data = (await parseJson(res)) as { error: string };
			expect(data.error).toContain("gameId");
		});

		it("accepts gameId from X-Game-Id header", async () => {
			const req = makeRequest("POST", "/init", {}, { "X-Game-Id": "game-xyz" });
			const res = await dobj.fetch(req);

			expect(res.status).toBe(200);
		});
	});

	describe("commit + read round-trip", () => {
		it("commits files and reads them back", async () => {
			await dobj.fetch(makeRequest("POST", "/init", { gameId: "game-abc" }));

			const commitRes = await dobj.fetch(
				makeRequest("POST", "/commit", {
					files: [
						{ path: "hello.txt", content: "Hello, world!" },
						{ path: "src/main.ts", content: 'console.log("hi")' },
					],
					message: "Initial commit",
					author: { name: "Test User", email: "test@example.com" },
				}),
			);

			expect(commitRes.status).toBe(200);
			const commitData = (await parseJson(commitRes)) as { sha: string };
			expect(commitData.sha).toBeTruthy();
			expect(typeof commitData.sha).toBe("string");

			const readRes = await dobj.fetch(makeRequest("GET", "/read/hello.txt"));
			expect(readRes.status).toBe(200);
			const readData = (await parseJson(readRes)) as { content: string };
			expect(readData.content).toBe("Hello, world!");
		});

		it("reads nested files", async () => {
			await dobj.fetch(makeRequest("POST", "/init", { gameId: "game-abc" }));
			await dobj.fetch(
				makeRequest("POST", "/commit", {
					files: [{ path: "src/index.ts", content: "export {}" }],
					message: "Add src",
					author: { name: "Test", email: "t@t.com" },
				}),
			);

			const readRes = await dobj.fetch(
				makeRequest("GET", "/read/src/index.ts"),
			);
			expect(readRes.status).toBe(200);
			const data = (await parseJson(readRes)) as { content: string };
			expect(data.content).toBe("export {}");
		});
	});

	describe("tree", () => {
		it("lists files after commit", async () => {
			await dobj.fetch(makeRequest("POST", "/init", { gameId: "game-abc" }));
			await dobj.fetch(
				makeRequest("POST", "/commit", {
					files: [
						{ path: "a.txt", content: "aaa" },
						{ path: "b.txt", content: "bbb" },
						{ path: "dir/c.txt", content: "ccc" },
					],
					message: "Add files",
					author: { name: "Test", email: "t@t.com" },
				}),
			);

			const treeRes = await dobj.fetch(makeRequest("GET", "/tree"));
			expect(treeRes.status).toBe(200);
			const data = (await parseJson(treeRes)) as { files: string[] };
			expect(data.files).toContain("a.txt");
			expect(data.files).toContain("b.txt");
			expect(data.files).toContain("dir/c.txt");
			expect(data.files).toHaveLength(3);
		});
	});

	describe("log", () => {
		it("shows commit history", async () => {
			await dobj.fetch(makeRequest("POST", "/init", { gameId: "game-abc" }));
			await dobj.fetch(
				makeRequest("POST", "/commit", {
					files: [{ path: "a.txt", content: "v1" }],
					message: "First commit",
					author: { name: "Test", email: "t@t.com" },
				}),
			);
			await dobj.fetch(
				makeRequest("POST", "/commit", {
					files: [{ path: "a.txt", content: "v2" }],
					message: "Second commit",
					author: { name: "Test", email: "t@t.com" },
				}),
			);

			const logRes = await dobj.fetch(makeRequest("GET", "/log"));
			expect(logRes.status).toBe(200);
			const data = (await parseJson(logRes)) as {
				commits: Array<{
					oid: string;
					message: string;
					author: { name: string; email: string };
				}>;
			};
			expect(data.commits).toHaveLength(2);
			expect(data.commits[0].message).toBe("Second commit\n");
			expect(data.commits[1].message).toBe("First commit\n");
		});

		it("respects depth parameter", async () => {
			await dobj.fetch(makeRequest("POST", "/init", { gameId: "game-abc" }));
			await dobj.fetch(
				makeRequest("POST", "/commit", {
					files: [{ path: "a.txt", content: "v1" }],
					message: "First",
					author: { name: "Test", email: "t@t.com" },
				}),
			);
			await dobj.fetch(
				makeRequest("POST", "/commit", {
					files: [{ path: "a.txt", content: "v2" }],
					message: "Second",
					author: { name: "Test", email: "t@t.com" },
				}),
			);

			const logRes = await dobj.fetch(makeRequest("GET", "/log?depth=1"));
			expect(logRes.status).toBe(200);
			const data = (await parseJson(logRes)) as {
				commits: Array<{ message: string }>;
			};
			expect(data.commits).toHaveLength(1);
		});
	});

	describe("branch", () => {
		it("creates a branch", async () => {
			await dobj.fetch(makeRequest("POST", "/init", { gameId: "game-abc" }));
			await dobj.fetch(
				makeRequest("POST", "/commit", {
					files: [{ path: "a.txt", content: "v1" }],
					message: "Initial",
					author: { name: "Test", email: "t@t.com" },
				}),
			);

			const branchRes = await dobj.fetch(
				makeRequest("POST", "/branch", { name: "feature-x" }),
			);
			expect(branchRes.status).toBe(200);
			const data = (await parseJson(branchRes)) as { ok: boolean };
			expect(data.ok).toBe(true);
		});

		it("returns 400 when name is missing", async () => {
			await dobj.fetch(makeRequest("POST", "/init", { gameId: "game-abc" }));
			const res = await dobj.fetch(makeRequest("POST", "/branch", {}));
			expect(res.status).toBe(400);
		});
	});

	describe("tag", () => {
		it("creates a tag", async () => {
			await dobj.fetch(makeRequest("POST", "/init", { gameId: "game-abc" }));
			await dobj.fetch(
				makeRequest("POST", "/commit", {
					files: [{ path: "a.txt", content: "v1" }],
					message: "Initial",
					author: { name: "Test", email: "t@t.com" },
				}),
			);

			const tagRes = await dobj.fetch(
				makeRequest("POST", "/tag", { name: "v1.0" }),
			);
			expect(tagRes.status).toBe(200);
			const data = (await parseJson(tagRes)) as { ok: boolean };
			expect(data.ok).toBe(true);
		});

		it("returns 400 when name is missing", async () => {
			await dobj.fetch(makeRequest("POST", "/init", { gameId: "game-abc" }));
			const res = await dobj.fetch(makeRequest("POST", "/tag", {}));
			expect(res.status).toBe(400);
		});
	});

	describe("diff", () => {
		it("detects added and modified files between commits", async () => {
			await dobj.fetch(makeRequest("POST", "/init", { gameId: "game-abc" }));

			const commit1Res = await dobj.fetch(
				makeRequest("POST", "/commit", {
					files: [
						{ path: "keep.txt", content: "same" },
						{ path: "modify.txt", content: "original" },
					],
					message: "First",
					author: { name: "Test", email: "t@t.com" },
				}),
			);
			const { sha: sha1 } = (await parseJson(commit1Res)) as { sha: string };

			const commit2Res = await dobj.fetch(
				makeRequest("POST", "/commit", {
					files: [
						{ path: "modify.txt", content: "changed" },
						{ path: "added.txt", content: "new file" },
					],
					message: "Second",
					author: { name: "Test", email: "t@t.com" },
				}),
			);
			const { sha: sha2 } = (await parseJson(commit2Res)) as { sha: string };

			const diffRes = await dobj.fetch(
				makeRequest("GET", `/diff?refA=${sha1}&refB=${sha2}`),
			);
			expect(diffRes.status).toBe(200);
			const data = (await parseJson(diffRes)) as {
				changes: Array<{ path: string; type: string }>;
			};

			const changeMap = new Map(data.changes.map((c) => [c.path, c.type]));
			expect(changeMap.get("modify.txt")).toBe("modify");
			expect(changeMap.get("added.txt")).toBe("add");
			expect(changeMap.has("keep.txt")).toBe(false);
		});

		it("returns 400 when refs are missing", async () => {
			await dobj.fetch(makeRequest("POST", "/init", { gameId: "game-abc" }));
			const res = await dobj.fetch(makeRequest("GET", "/diff"));
			expect(res.status).toBe(400);
		});
	});

	describe("error handling", () => {
		it("returns 404 for unknown routes", async () => {
			const res = await dobj.fetch(
				makeRequest("GET", "/unknown", undefined, { "X-Game-Id": "game-abc" }),
			);
			expect(res.status).toBe(404);
		});

		it("returns error for reading from uninitialized repo", async () => {
			const res = await dobj.fetch(
				makeRequest("GET", "/read/nonexistent.txt", undefined, {
					"X-Game-Id": "game-abc",
				}),
			);
			expect(res.status).toBeGreaterThanOrEqual(400);
		});

		it("returns 400 for commit with invalid body", async () => {
			await dobj.fetch(makeRequest("POST", "/init", { gameId: "game-abc" }));
			const res = await dobj.fetch(
				makeRequest("POST", "/commit", { files: [], message: "test" }),
			);
			expect(res.status).toBe(400);
		});

		it("returns 400 for commit without author", async () => {
			await dobj.fetch(makeRequest("POST", "/init", { gameId: "game-abc" }));
			const res = await dobj.fetch(
				makeRequest("POST", "/commit", {
					files: [{ path: "a.txt", content: "x" }],
					message: "test",
				}),
			);
			expect(res.status).toBe(400);
		});
	});
});
