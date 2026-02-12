import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type WorkspaceCopyOptions,
	WorkspaceCopyService,
} from "../WorkspaceCopyService";

type R2Bucket = import("@cloudflare/workers-types").R2Bucket;

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

function seedStore(
	store: Map<string, StoredObject>,
	files: Record<string, string>,
) {
	for (const [key, content] of Object.entries(files)) {
		store.set(key, {
			body: content,
			httpMetadata: { contentType: "application/json" },
		});
	}
}

describe("WorkspaceCopyService", () => {
	let bucket: ReturnType<typeof createMockBucket>["bucket"];
	let store: ReturnType<typeof createMockBucket>["store"];
	let service: WorkspaceCopyService;

	beforeEach(() => {
		const mock = createMockBucket();
		bucket = mock.bucket;
		store = mock.store;
		service = new WorkspaceCopyService(bucket as unknown as R2Bucket);
	});

	it("copies all workspace files from source to destination", async () => {
		seedStore(store, {
			"games/src-id/workspace/slopcade.json": JSON.stringify({
				id: "src-id",
				name: "Source Game",
				version: "0.1.0",
			}),
			"games/src-id/workspace/world.json": JSON.stringify({
				gravity: { x: 0, y: 10 },
			}),
			"games/src-id/workspace/entities.json": "[]",
			"games/src-id/workspace/rules.json": "[]",
			"games/src-id/workspace/prefabs/default.json": JSON.stringify({
				id: "default",
			}),
			"games/src-id/workspace/scripts/main.js":
				"exports.onStart = function() {};",
			"games/src-id/workspace/effects/screen.json": JSON.stringify({
				nodes: [],
			}),
		});

		const result = await service.copyWorkspace({
			sourcePrefix: "games/src-id",
			destPrefix: "games/dest-id",
		});

		expect(result.skipped).toBe(false);
		expect(result.copiedFiles).toHaveLength(7);
		expect(result.copiedFiles).toContain("slopcade.json");
		expect(result.copiedFiles).toContain("world.json");
		expect(result.copiedFiles).toContain("entities.json");
		expect(result.copiedFiles).toContain("rules.json");
		expect(result.copiedFiles).toContain("prefabs/default.json");
		expect(result.copiedFiles).toContain("scripts/main.js");
		expect(result.copiedFiles).toContain("effects/screen.json");

		expect(store.has("games/dest-id/workspace/slopcade.json")).toBe(true);
		expect(store.has("games/dest-id/workspace/world.json")).toBe(true);
		expect(store.has("games/dest-id/workspace/scripts/main.js")).toBe(true);
	});

	it("updates slopcade.json with metadata overrides", async () => {
		seedStore(store, {
			"games/src-id/workspace/slopcade.json": JSON.stringify({
				id: "src-id",
				name: "Original Name",
				version: "0.1.0",
				activeScene: null,
			}),
			"games/src-id/workspace/world.json": JSON.stringify({
				gravity: { x: 0, y: 10 },
			}),
		});

		const result = await service.copyWorkspace({
			sourcePrefix: "games/src-id",
			destPrefix: "games/dest-id",
			metadataOverrides: {
				id: "dest-id",
				title: "Forked Game",
			},
		});

		expect(result.updatedFiles).toContain("slopcade.json");

		const destManifest = store.get("games/dest-id/workspace/slopcade.json");
		expect(destManifest).toBeDefined();
		const parsed = JSON.parse(destManifest!.body as string);
		expect(parsed.id).toBe("dest-id");
		expect(parsed.name).toBe("Forked Game");
		expect(parsed.version).toBe("0.1.0");
		expect(parsed.activeScene).toBeNull();
	});

	it("returns skipped=true when source has no workspace files", async () => {
		const result = await service.copyWorkspace({
			sourcePrefix: "games/src-id",
			destPrefix: "games/dest-id",
			metadataOverrides: { id: "dest-id", title: "Fork" },
		});

		expect(result.skipped).toBe(true);
		expect(result.copiedFiles).toHaveLength(0);
		expect(result.updatedFiles).toHaveLength(0);
	});

	it("copies files without modification when no metadataOverrides provided", async () => {
		const originalContent = JSON.stringify({
			id: "src-id",
			name: "Original",
			version: "0.1.0",
		});
		seedStore(store, {
			"games/src-id/workspace/slopcade.json": originalContent,
		});

		const result = await service.copyWorkspace({
			sourcePrefix: "games/src-id",
			destPrefix: "games/dest-id",
		});

		expect(result.updatedFiles).toHaveLength(0);
		expect(result.copiedFiles).toContain("slopcade.json");

		const destObj = store.get("games/dest-id/workspace/slopcade.json");
		const decoded = new TextDecoder().decode(destObj!.body as ArrayBuffer);
		expect(JSON.parse(decoded)).toEqual(JSON.parse(originalContent));
	});

	it("handles paginated R2 list results", async () => {
		seedStore(store, {
			"games/src-id/workspace/slopcade.json": "{}",
			"games/src-id/workspace/entities.json": "[]",
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

		const result = await service.copyWorkspace({
			sourcePrefix: "games/src-id",
			destPrefix: "games/dest-id",
		});

		expect(result.copiedFiles).toHaveLength(2);
		expect(bucket.list).toHaveBeenCalledTimes(2);
	});

	it("preserves httpMetadata from source objects", async () => {
		store.set("games/src-id/workspace/scripts/main.js", {
			body: "exports.onStart = function() {};",
			httpMetadata: { contentType: "text/javascript" },
		});

		await service.copyWorkspace({
			sourcePrefix: "games/src-id",
			destPrefix: "games/dest-id",
		});

		const putCalls = bucket.put.mock.calls;
		const jsPut = putCalls.find(
			(c: unknown[]) => c[0] === "games/dest-id/workspace/scripts/main.js",
		);
		expect(jsPut).toBeDefined();
		expect(jsPut![2]).toEqual({
			httpMetadata: { contentType: "text/javascript" },
		});
	});

	it("handles invalid slopcade.json gracefully during metadata override", async () => {
		seedStore(store, {
			"games/src-id/workspace/slopcade.json": "not-valid-json{{{",
		});

		const result = await service.copyWorkspace({
			sourcePrefix: "games/src-id",
			destPrefix: "games/dest-id",
			metadataOverrides: { id: "dest-id", title: "Fork" },
		});

		expect(result.copiedFiles).toContain("slopcade.json");
		expect(result.updatedFiles).not.toContain("slopcade.json");
	});

	it("skips source keys where get returns null", async () => {
		store.set("games/src-id/workspace/entities.json", {
			body: "[]",
			httpMetadata: { contentType: "application/json" },
		});

		const originalGet = bucket.get;
		bucket.get = vi
			.fn()
			.mockResolvedValue(null) as unknown as typeof bucket.get;

		const result = await service.copyWorkspace({
			sourcePrefix: "games/src-id",
			destPrefix: "games/dest-id",
		});

		expect(result.copiedFiles).toHaveLength(0);
		bucket.get = originalGet;
	});
});
