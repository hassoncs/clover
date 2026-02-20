import { beforeEach, describe, expect, it, vi } from "vitest";
import { type ForkParams, ForkService } from "../ForkService";

type R2Bucket = import("@cloudflare/workers-types").R2Bucket;
type D1Database = import("@cloudflare/workers-types").D1Database;
type DurableObjectNamespace =
	import("@cloudflare/workers-types").DurableObjectNamespace;

interface StoredObject {
	body: ArrayBuffer | string;
	httpMetadata?: Record<string, string>;
}

function createMockBucket() {
	const store = new Map<string, StoredObject>();

	const bucket = {
		put: vi
			.fn()
			.mockImplementation(
				async (
					key: string,
					body: ArrayBuffer | string,
					options?: { httpMetadata?: Record<string, string> },
				) => {
					store.set(key, {
						body,
						httpMetadata: options?.httpMetadata,
					});
				},
			),
		get: vi.fn().mockImplementation(async (key: string) => {
			const obj = store.get(key);
			if (!obj) return null;
			const bodyBytes =
				typeof obj.body === "string"
					? new TextEncoder().encode(obj.body)
					: new Uint8Array(obj.body);
			return {
				arrayBuffer: async () => bodyBytes.buffer,
				text: async () =>
					typeof obj.body === "string"
						? obj.body
						: new TextDecoder().decode(obj.body),
				httpMetadata: obj.httpMetadata ?? {},
			};
		}),
		list: vi
			.fn()
			.mockImplementation(
				async (opts: { prefix?: string; cursor?: string }) => {
					const prefix = opts.prefix ?? "";
					const objects = Array.from(store.keys())
						.filter((k) => k.startsWith(prefix))
						.map((key) => ({ key, size: 0, uploaded: new Date() }));
					return { objects, truncated: false, cursor: undefined };
				},
			),
		head: vi.fn(),
		delete: vi.fn(),
	} as unknown as R2Bucket & {
		put: ReturnType<typeof vi.fn>;
		get: ReturnType<typeof vi.fn>;
		list: ReturnType<typeof vi.fn>;
	};

	return { bucket, store };
}

function createMockDB() {
	const bindFn = vi.fn().mockReturnThis();
	const runFn = vi.fn().mockResolvedValue({ success: true });

	const db = {
		prepare: vi.fn().mockReturnValue({
			bind: bindFn,
			run: runFn,
			first: vi.fn(),
			all: vi.fn(),
		}),
	} as unknown as D1Database & {
		prepare: ReturnType<typeof vi.fn>;
	};

	return { db, bindFn, runFn };
}

function createMockDONamespace() {
	const fetchFn = vi
		.fn()
		.mockResolvedValue(
			new Response(JSON.stringify({ ok: true }), { status: 200 }),
		);
	const stubObj = { fetch: fetchFn };

	const ns = {
		idFromName: vi.fn().mockReturnValue("mock-do-id"),
		get: vi.fn().mockReturnValue(stubObj),
	} as unknown as DurableObjectNamespace & {
		idFromName: ReturnType<typeof vi.fn>;
		get: ReturnType<typeof vi.fn>;
	};

	return { ns, fetchFn };
}

function baseForkParams(overrides?: Partial<ForkParams>): ForkParams {
	return {
		sourceGameId: "source-game-id",
		newGameId: "new-game-id",
		userId: "user-123",
		title: "My Game (Fork)",
		description: "A forked game",
		r2Prefix: "games/new-game-id",
		baseGameId: "root-game-id",
		validationReport: JSON.stringify({ summary: { topIssues: [] } }),
		validationScore: 85,
		validationCriticalCount: 0,
		validationWarningCount: 2,
		validationValid: 1,
		validatorVersion: "1.0.0",
		...overrides,
	};
}

describe("ForkService", () => {
	let bucket: ReturnType<typeof createMockBucket>["bucket"];
	let store: ReturnType<typeof createMockBucket>["store"];
	let db: ReturnType<typeof createMockDB>["db"];
	let bindFn: ReturnType<typeof createMockDB>["bindFn"];
	let ns: ReturnType<typeof createMockDONamespace>["ns"];
	let fetchFn: ReturnType<typeof createMockDONamespace>["fetchFn"];
	let service: ForkService;

	beforeEach(() => {
		const mockBucket = createMockBucket();
		bucket = mockBucket.bucket;
		store = mockBucket.store;

		const mockDB = createMockDB();
		db = mockDB.db;
		bindFn = mockDB.bindFn;

		const mockNS = createMockDONamespace();
		ns = mockNS.ns;
		fetchFn = mockNS.fetchFn;

		service = new ForkService(
			bucket as unknown as R2Bucket,
			db as unknown as D1Database,
			ns as unknown as DurableObjectNamespace,
		);
	});

	it("copies Git objects from source to new repo prefix", async () => {
		store.set("repos/source-game-id/.git/HEAD", {
			body: "ref: refs/heads/main",
			httpMetadata: { contentType: "text/plain" },
		});
		store.set("repos/source-game-id/.git/objects/ab/cdef1234", {
			body: new Uint8Array([1, 2, 3]).buffer,
			httpMetadata: { contentType: "application/octet-stream" },
		});
		store.set("repos/source-game-id/.git/refs/heads/main", {
			body: "abc123",
		});

		const result = await service.forkGame(baseForkParams());

		expect(result.copiedObjectCount).toBe(3);
		expect(store.has("repos/new-game-id/.git/HEAD")).toBe(true);
		expect(store.has("repos/new-game-id/.git/objects/ab/cdef1234")).toBe(true);
		expect(store.has("repos/new-game-id/.git/refs/heads/main")).toBe(true);
	});

	it("does NOT copy blob assets", async () => {
		store.set("repos/source-game-id/.git/HEAD", {
			body: "ref: refs/heads/main",
		});
		store.set("blobs/ab/cdef1234567890", {
			body: new Uint8Array([10, 20, 30]).buffer,
		});

		await service.forkGame(baseForkParams());

		expect(store.has("repos/new-game-id/.git/HEAD")).toBe(true);
		const blobKeys = Array.from(store.keys()).filter((k) =>
			k.startsWith("blobs/"),
		);
		expect(blobKeys).toHaveLength(1);
		expect(blobKeys[0]).toBe("blobs/ab/cdef1234567890");
	});

	it("inserts D1 row with correct fork lineage", async () => {
		await service.forkGame(baseForkParams());

		expect(db.prepare).toHaveBeenCalledWith(
			expect.stringContaining("INSERT INTO games"),
		);
		expect(bindFn).toHaveBeenCalledWith(
			"new-game-id",
			"user-123",
			"My Game (Fork)",
			"A forked game",
			"games/new-game-id",
			expect.any(Number),
			expect.any(Number),
			"root-game-id",
			"source-game-id",
			expect.any(String),
			85,
			0,
			2,
			1,
			expect.any(Number),
			"1.0.0",
			"1.0.0",
			1,
		);
	});

	it("sets base_game_id to source's base_game_id (not source itself)", async () => {
		await service.forkGame(baseForkParams({ baseGameId: "original-root-id" }));

		expect(bindFn).toHaveBeenCalledWith(
			expect.anything(),
			expect.anything(),
			expect.anything(),
			expect.anything(),
			expect.anything(),
			expect.any(Number),
			expect.any(Number),
			"original-root-id",
			"source-game-id",
			expect.anything(),
			expect.anything(),
			expect.anything(),
			expect.anything(),
			expect.anything(),
			expect.any(Number),
			expect.anything(),
			expect.anything(),
			expect.anything(),
		);
	});

	it("initializes the new game's Durable Object", async () => {
		await service.forkGame(baseForkParams());

		expect(ns.idFromName).toHaveBeenCalledWith("new-game-id");
		expect(ns.get).toHaveBeenCalled();
		expect(fetchFn).toHaveBeenCalledWith(
			expect.objectContaining({
				method: "POST",
			}),
		);
	});

	it("handles missing GAME_REPO binding gracefully", async () => {
		const serviceNoRepo = new ForkService(
			bucket as unknown as R2Bucket,
			db as unknown as D1Database,
			undefined,
		);

		store.set("repos/source-game-id/.git/HEAD", {
			body: "ref: refs/heads/main",
		});

		const result = await serviceNoRepo.forkGame(baseForkParams());

		expect(result.gameId).toBe("new-game-id");
		expect(ns.idFromName).not.toHaveBeenCalled();
	});

	it("handles empty source Git repo (no objects to copy)", async () => {
		const result = await service.forkGame(baseForkParams());

		expect(result.copiedObjectCount).toBe(0);
		expect(db.prepare).toHaveBeenCalled();
	});

	it("handles paginated R2 list for large repos", async () => {
		store.set("repos/source-game-id/.git/HEAD", {
			body: "ref: refs/heads/main",
		});
		store.set("repos/source-game-id/.git/objects/aa/111", {
			body: "obj1",
		});
		store.set("repos/source-game-id/.git/objects/bb/222", {
			body: "obj2",
		});

		let callCount = 0;
		bucket.list = vi
			.fn()
			.mockImplementation(
				async (opts: { prefix?: string; cursor?: string }) => {
					callCount++;
					const prefix = opts.prefix ?? "";
					const allKeys = Array.from(store.keys()).filter((k) =>
						k.startsWith(prefix),
					);

					if (callCount === 1 && !opts.cursor) {
						return {
							objects: [{ key: allKeys[0], size: 0, uploaded: new Date() }],
							truncated: true,
							cursor: "page2",
						};
					}
					return {
						objects: allKeys.slice(1).map((key) => ({
							key,
							size: 0,
							uploaded: new Date(),
						})),
						truncated: false,
						cursor: undefined,
					};
				},
			) as unknown as typeof bucket.list;

		const result = await service.forkGame(baseForkParams());

		expect(result.copiedObjectCount).toBe(3);
		expect(bucket.list).toHaveBeenCalledTimes(2);
	});

	it("preserves httpMetadata when copying Git objects", async () => {
		store.set("repos/source-game-id/.git/objects/ab/cdef", {
			body: new Uint8Array([1, 2, 3]).buffer,
			httpMetadata: { contentType: "application/octet-stream" },
		});

		await service.forkGame(baseForkParams());

		const putCalls = (bucket.put as ReturnType<typeof vi.fn>).mock.calls;
		const gitObjPut = putCalls.find(
			(c: unknown[]) => c[0] === "repos/new-game-id/.git/objects/ab/cdef",
		);
		expect(gitObjPut).toBeDefined();
		expect(gitObjPut![2]).toEqual({
			httpMetadata: { contentType: "application/octet-stream" },
		});
	});

	it("returns the new game ID", async () => {
		const result = await service.forkGame(baseForkParams());
		expect(result.gameId).toBe("new-game-id");
	});

	it("handles DO init failure gracefully without failing the fork", async () => {
		fetchFn.mockRejectedValueOnce(new Error("DO unavailable"));

		store.set("repos/source-game-id/.git/HEAD", {
			body: "ref: refs/heads/main",
		});

		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		const result = await service.forkGame(baseForkParams());

		expect(result.gameId).toBe("new-game-id");
		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("[Fork new-game-id]"),
			expect.any(String),
		);

		consoleSpy.mockRestore();
	});
});
