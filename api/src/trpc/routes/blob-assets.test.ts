import { env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import {
	createAuthenticatedContext,
	createPublicContext,
	createTestUser,
	initTestDatabase,
	TEST_USER,
	TEST_USER_2,
} from "@/__fixtures__/test-utils";
import { appRouter } from "../router";

describe("Blob Assets Router", () => {
	beforeAll(async () => {
		await initTestDatabase();
		await createTestUser(TEST_USER);
		await createTestUser(TEST_USER_2);
	});

	describe("upload route", () => {
		it("should upload a new blob and return hash + assetId", async () => {
			const ctx = createAuthenticatedContext(TEST_USER);
			const caller = appRouter.createCaller(ctx);

			const testData = "test-blob-content";
			const base64Data = btoa(testData);

			const result = await caller.blobAssets.upload({
				data: base64Data,
				mimeType: "text/plain",
				meta: {
					width: 100,
					height: 100,
					source: "uploaded",
				},
			});

			expect(result.hash).toBeDefined();
			expect(result.hash).toHaveLength(64);
			expect(result.assetId).toBeDefined();
			expect(result.isNew).toBe(true);

			const dbAsset = await env.DB.prepare("SELECT * FROM assets WHERE id = ?")
				.bind(result.assetId)
				.first();

			expect(dbAsset).toBeDefined();
			expect(dbAsset!.content_hash).toBe(result.hash);
			expect(dbAsset!.width).toBe(100);
			expect(dbAsset!.height).toBe(100);
			expect(dbAsset!.source).toBe("uploaded");
			expect(dbAsset!.creator_user_id).toBe(TEST_USER.id);
		});

		it("should deduplicate identical blobs", async () => {
			const ctx = createAuthenticatedContext(TEST_USER);
			const caller = appRouter.createCaller(ctx);

			const testData = "duplicate-test-content";
			const base64Data = btoa(testData);

			const result1 = await caller.blobAssets.upload({
				data: base64Data,
				mimeType: "text/plain",
			});

			expect(result1.isNew).toBe(true);

			const result2 = await caller.blobAssets.upload({
				data: base64Data,
				mimeType: "text/plain",
			});

			expect(result2.isNew).toBe(false);
			expect(result2.hash).toBe(result1.hash);
			expect(result2.assetId).toBe(result1.assetId);
		});

		it("should include optional metadata fields", async () => {
			const ctx = createAuthenticatedContext(TEST_USER);
			const caller = appRouter.createCaller(ctx);

			const testData = "metadata-test";
			const base64Data = btoa(testData);

			const result = await caller.blobAssets.upload({
				data: base64Data,
				mimeType: "image/png",
				meta: {
					width: 512,
					height: 512,
					source: "generated",
					compiledPrompt: "a test prompt",
					modelId: "test-model-id",
				},
			});

			const dbAsset = await env.DB.prepare("SELECT * FROM assets WHERE id = ?")
				.bind(result.assetId)
				.first();

			expect(dbAsset!.width).toBe(512);
			expect(dbAsset!.height).toBe(512);
			expect(dbAsset!.source).toBe("generated");
			expect(dbAsset!.compiled_prompt).toBe("a test prompt");
			expect(dbAsset!.model_id).toBe("test-model-id");
		});

		it("should require authentication", async () => {
			const ctx = createPublicContext();
			const caller = appRouter.createCaller(ctx);

			const testData = "auth-test";
			const base64Data = btoa(testData);

			await expect(
				caller.blobAssets.upload({
					data: base64Data,
					mimeType: "text/plain",
				}),
			).rejects.toThrow();
		});

		it("should associate blob with authenticated user", async () => {
			const ctx1 = createAuthenticatedContext(TEST_USER);
			const caller1 = appRouter.createCaller(ctx1);

			const testData = "user-association-test";
			const base64Data = btoa(testData);

			const result = await caller1.blobAssets.upload({
				data: base64Data,
				mimeType: "text/plain",
			});

			const dbAsset = await env.DB.prepare(
				"SELECT creator_user_id FROM assets WHERE id = ?",
			)
				.bind(result.assetId)
				.first<{ creator_user_id: string }>();

			expect(dbAsset!.creator_user_id).toBe(TEST_USER.id);
		});
	});

	describe("getUrl route", () => {
		it("should return URL for a valid hash", async () => {
			const ctx = createPublicContext();
			const caller = appRouter.createCaller(ctx);

			const hash =
				"abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";

			const result = await caller.blobAssets.getUrl({ hash });

			expect(result.url).toBe(`/assets/blobs/ab/${hash}`);
		});

		it("should work without authentication", async () => {
			const ctx = createPublicContext();
			const caller = appRouter.createCaller(ctx);

			const hash =
				"1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

			const result = await caller.blobAssets.getUrl({ hash });

			expect(result.url).toBeDefined();
			expect(result.url).toContain(hash);
		});

		it("should validate hash length", async () => {
			const ctx = createPublicContext();
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.blobAssets.getUrl({ hash: "short-hash" }),
			).rejects.toThrow();
		});
	});

	describe("exists route", () => {
		it("should return true for existing blob", async () => {
			const ctx = createAuthenticatedContext(TEST_USER);
			const caller = appRouter.createCaller(ctx);

			const testData = "exists-test-content";
			const base64Data = btoa(testData);

			const uploadResult = await caller.blobAssets.upload({
				data: base64Data,
				mimeType: "text/plain",
			});

			const existsResult = await caller.blobAssets.exists({
				hash: uploadResult.hash,
			});

			expect(existsResult.exists).toBe(true);
		});

		it("should return false for non-existent blob", async () => {
			const ctx = createPublicContext();
			const caller = appRouter.createCaller(ctx);

			const fakeHash =
				"0000000000000000000000000000000000000000000000000000000000000000";

			const result = await caller.blobAssets.exists({ hash: fakeHash });

			expect(result.exists).toBe(false);
		});

		it("should work without authentication", async () => {
			const ctx = createPublicContext();
			const caller = appRouter.createCaller(ctx);

			const hash =
				"1111111111111111111111111111111111111111111111111111111111111111";

			const result = await caller.blobAssets.exists({ hash });

			expect(result.exists).toBe(false);
		});
	});

	describe("batchResolve route", () => {
		it("should resolve multiple hashes to URLs", async () => {
			const ctx = createPublicContext();
			const caller = appRouter.createCaller(ctx);

			const hash1 =
				"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
			const hash2 =
				"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
			const hash3 =
				"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";

			const result = await caller.blobAssets.batchResolve({
				hashes: [hash1, hash2, hash3],
			});

			expect(result.urls).toBeDefined();
			expect(Object.keys(result.urls)).toHaveLength(3);
			expect(result.urls[hash1]).toBe(`/assets/blobs/aa/${hash1}`);
			expect(result.urls[hash2]).toBe(`/assets/blobs/bb/${hash2}`);
			expect(result.urls[hash3]).toBe(`/assets/blobs/cc/${hash3}`);
		});

		it("should handle empty array", async () => {
			const ctx = createPublicContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.blobAssets.batchResolve({ hashes: [] });

			expect(result.urls).toEqual({});
		});

		it("should work without authentication", async () => {
			const ctx = createPublicContext();
			const caller = appRouter.createCaller(ctx);

			const hash =
				"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";

			const result = await caller.blobAssets.batchResolve({ hashes: [hash] });

			expect(result.urls[hash]).toBeDefined();
		});
	});
});
