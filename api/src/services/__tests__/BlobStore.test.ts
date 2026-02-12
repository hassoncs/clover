import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BlobMeta } from "../BlobStore";
import { BlobStore } from "../BlobStore";

type R2Bucket = import("@cloudflare/workers-types").R2Bucket;
type D1Database = import("@cloudflare/workers-types").D1Database;

interface StoredObject {
	body: ArrayBuffer;
	httpMetadata?: { contentType?: string };
}

function createMockBucket() {
	const store = new Map<string, StoredObject>();

	const bucket = {
		put: vi
			.fn()
			.mockImplementation(
				async (
					key: string,
					body: ArrayBuffer,
					options?: { httpMetadata?: { contentType?: string } },
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
			return {
				body: new ReadableStream({
					start(controller) {
						controller.enqueue(new Uint8Array(obj.body));
						controller.close();
					},
				}),
				httpMetadata: obj.httpMetadata ?? {},
			};
		}),
		head: vi.fn(),
		delete: vi.fn(),
		list: vi.fn(),
	} as unknown as R2Bucket & {
		put: ReturnType<typeof vi.fn>;
		get: ReturnType<typeof vi.fn>;
	};

	return { bucket, store };
}

function createMockDb(existingRows: Map<string, { id: string }> = new Map()) {
	const insertedRows: Array<{
		id: string;
		r2Key: string;
		contentHash: string;
		width: number | null;
		height: number | null;
		creatorUserId: string | null;
		source: string;
		compiledPrompt: string | null;
		modelId: string | null;
		themeId: string | null;
		createdAt: number;
	}> = [];

	const db = {
		prepare: vi.fn().mockImplementation((sql: string) => {
			const isSelect = sql.trim().toUpperCase().startsWith("SELECT");
			const isInsert = sql.trim().toUpperCase().startsWith("INSERT");

			return {
				bind: vi.fn().mockImplementation((...args: unknown[]) => {
					if (isSelect) {
						const hash = args[0] as string;
						const row = existingRows.get(hash);
						return {
							first: vi.fn().mockResolvedValue(row ?? null),
						};
					}
					if (isInsert) {
						insertedRows.push({
							id: args[0] as string,
							r2Key: args[1] as string,
							contentHash: args[2] as string,
							width: args[3] as number | null,
							height: args[4] as number | null,
							creatorUserId: args[5] as string | null,
							source: args[6] as string,
							compiledPrompt: args[7] as string | null,
							modelId: args[8] as string | null,
							themeId: args[9] as string | null,
							createdAt: args[10] as number,
						});
						return {
							run: vi.fn().mockResolvedValue({ success: true }),
						};
					}
					return {
						first: vi.fn().mockResolvedValue(null),
						run: vi.fn().mockResolvedValue({ success: true }),
					};
				}),
			};
		}),
	} as unknown as D1Database;

	return { db, insertedRows };
}

const TEST_DATA = new Uint8Array([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

async function computeExpectedHash(data: Uint8Array): Promise<string> {
	const buffer = data.buffer.slice(
		data.byteOffset,
		data.byteOffset + data.byteLength,
	) as ArrayBuffer;
	const digest = await crypto.subtle.digest("SHA-256", buffer);
	const bytes = new Uint8Array(digest);
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

describe("BlobStore", () => {
	let bucket: ReturnType<typeof createMockBucket>;
	let dbMock: ReturnType<typeof createMockDb>;
	let blobStore: BlobStore;

	beforeEach(() => {
		bucket = createMockBucket();
		dbMock = createMockDb();
		blobStore = new BlobStore(bucket.bucket, dbMock.db);
	});

	describe("put", () => {
		it("uploads new content and inserts into D1", async () => {
			const result = await blobStore.put(TEST_DATA, "image/png");

			expect(result.isNew).toBe(true);
			expect(result.hash).toHaveLength(64);
			expect(result.assetId).toBeTruthy();

			const expectedHash = await computeExpectedHash(TEST_DATA);
			expect(result.hash).toBe(expectedHash);

			const prefix = expectedHash.slice(0, 2);
			const expectedKey = `blobs/${prefix}/${expectedHash}`;
			expect(bucket.bucket.put).toHaveBeenCalledWith(
				expectedKey,
				expect.any(ArrayBuffer),
				{ httpMetadata: { contentType: "image/png" } },
			);

			expect(dbMock.insertedRows).toHaveLength(1);
			expect(dbMock.insertedRows[0].contentHash).toBe(expectedHash);
			expect(dbMock.insertedRows[0].r2Key).toBe(expectedKey);
			expect(dbMock.insertedRows[0].source).toBe("generated");
		});

		it("deduplicates when content already exists", async () => {
			const expectedHash = await computeExpectedHash(TEST_DATA);
			const existingRows = new Map([
				[expectedHash, { id: "existing-asset-id" }],
			]);
			dbMock = createMockDb(existingRows);
			blobStore = new BlobStore(bucket.bucket, dbMock.db);

			const result = await blobStore.put(TEST_DATA, "image/png");

			expect(result.isNew).toBe(false);
			expect(result.hash).toBe(expectedHash);
			expect(result.assetId).toBe("existing-asset-id");

			expect(bucket.bucket.put).not.toHaveBeenCalled();
			expect(dbMock.insertedRows).toHaveLength(0);
		});

		it("stores metadata when provided", async () => {
			const meta: BlobMeta = {
				width: 512,
				height: 256,
				creatorUserId: "user-123",
				source: "uploaded",
				compiledPrompt: "a red ball",
				modelId: "model-abc",
				themeId: "theme-xyz",
			};

			await blobStore.put(TEST_DATA, "image/png", meta);

			expect(dbMock.insertedRows).toHaveLength(1);
			const row = dbMock.insertedRows[0];
			expect(row.width).toBe(512);
			expect(row.height).toBe(256);
			expect(row.creatorUserId).toBe("user-123");
			expect(row.source).toBe("uploaded");
			expect(row.compiledPrompt).toBe("a red ball");
			expect(row.modelId).toBe("model-abc");
			expect(row.themeId).toBe("theme-xyz");
		});

		it("defaults source to 'generated' when no meta provided", async () => {
			await blobStore.put(TEST_DATA, "image/png");

			expect(dbMock.insertedRows[0].source).toBe("generated");
		});

		it("handles ArrayBuffer input", async () => {
			const arrayBuffer = TEST_DATA.buffer.slice(
				TEST_DATA.byteOffset,
				TEST_DATA.byteOffset + TEST_DATA.byteLength,
			);

			const result = await blobStore.put(arrayBuffer, "image/webp");

			expect(result.isNew).toBe(true);
			expect(result.hash).toHaveLength(64);
			expect(bucket.bucket.put).toHaveBeenCalledWith(
				expect.stringContaining("blobs/"),
				expect.any(ArrayBuffer),
				{ httpMetadata: { contentType: "image/webp" } },
			);
		});

		it("produces deterministic hashes for identical content", async () => {
			const data1 = new Uint8Array([1, 2, 3, 4]);
			const data2 = new Uint8Array([1, 2, 3, 4]);

			const result1 = await blobStore.put(data1, "image/png");

			const expectedHash = await computeExpectedHash(data1);
			const existingRows = new Map([[expectedHash, { id: result1.assetId }]]);
			dbMock = createMockDb(existingRows);
			blobStore = new BlobStore(bucket.bucket, dbMock.db);

			const result2 = await blobStore.put(data2, "image/png");

			expect(result1.hash).toBe(result2.hash);
			expect(result2.isNew).toBe(false);
		});

		it("produces different hashes for different content", async () => {
			const hash1 = await computeExpectedHash(new Uint8Array([1, 2, 3]));
			const hash2 = await computeExpectedHash(new Uint8Array([4, 5, 6]));

			expect(hash1).not.toBe(hash2);
		});
	});

	describe("get", () => {
		it("returns data and mimeType for existing blob", async () => {
			const expectedHash = await computeExpectedHash(TEST_DATA);
			const prefix = expectedHash.slice(0, 2);
			const r2Key = `blobs/${prefix}/${expectedHash}`;

			bucket.store.set(r2Key, {
				body: TEST_DATA.buffer.slice(
					TEST_DATA.byteOffset,
					TEST_DATA.byteOffset + TEST_DATA.byteLength,
				) as ArrayBuffer,
				httpMetadata: { contentType: "image/png" },
			});

			const result = await blobStore.get(expectedHash);

			expect(result).not.toBeNull();
			expect(result!.mimeType).toBe("image/png");
			expect(result!.data).toBeInstanceOf(ReadableStream);
		});

		it("returns null for non-existent blob", async () => {
			const result = await blobStore.get(
				"0000000000000000000000000000000000000000000000000000000000000000",
			);

			expect(result).toBeNull();
		});

		it("defaults mimeType to application/octet-stream when not set", async () => {
			const expectedHash = await computeExpectedHash(TEST_DATA);
			const prefix = expectedHash.slice(0, 2);
			const r2Key = `blobs/${prefix}/${expectedHash}`;

			bucket.store.set(r2Key, {
				body: TEST_DATA.buffer.slice(
					TEST_DATA.byteOffset,
					TEST_DATA.byteOffset + TEST_DATA.byteLength,
				) as ArrayBuffer,
			});

			const result = await blobStore.get(expectedHash);

			expect(result).not.toBeNull();
			expect(result!.mimeType).toBe("application/octet-stream");
		});
	});

	describe("exists", () => {
		it("returns true when content_hash exists in D1", async () => {
			const hash =
				"abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
			const existingRows = new Map([[hash, { id: "some-id" }]]);
			dbMock = createMockDb(existingRows);
			blobStore = new BlobStore(bucket.bucket, dbMock.db);

			const result = await blobStore.exists(hash);

			expect(result).toBe(true);
		});

		it("returns false when content_hash does not exist", async () => {
			const result = await blobStore.exists(
				"0000000000000000000000000000000000000000000000000000000000000000",
			);

			expect(result).toBe(false);
		});
	});

	describe("getUrl", () => {
		it("returns correct relative URL with hash prefix fan-out", () => {
			const hash =
				"abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";

			const url = blobStore.getUrl(hash);

			expect(url).toBe(`/assets/blobs/ab/${hash}`);
		});

		it("uses first 2 characters of hash as prefix", () => {
			const hash =
				"ff00001234567890abcdef1234567890abcdef1234567890abcdef1234567890";

			const url = blobStore.getUrl(hash);

			expect(url).toBe(`/assets/blobs/ff/${hash}`);
		});
	});

	describe("R2 key format", () => {
		it("uses blobs/{first2chars}/{fullhash} format", async () => {
			const result = await blobStore.put(TEST_DATA, "image/png");
			const prefix = result.hash.slice(0, 2);

			expect(bucket.bucket.put).toHaveBeenCalledWith(
				`blobs/${prefix}/${result.hash}`,
				expect.any(ArrayBuffer),
				expect.any(Object),
			);
		});
	});

	describe("end-to-end flow", () => {
		it("put then get returns the same content", async () => {
			const putResult = await blobStore.put(TEST_DATA, "image/png");

			const prefix = putResult.hash.slice(0, 2);
			const r2Key = `blobs/${prefix}/${putResult.hash}`;
			expect(bucket.store.has(r2Key)).toBe(true);

			const getResult = await blobStore.get(putResult.hash);
			expect(getResult).not.toBeNull();
			expect(getResult!.mimeType).toBe("image/png");
		});

		it("put then getUrl returns consistent URL", async () => {
			const putResult = await blobStore.put(TEST_DATA, "image/png");
			const url = blobStore.getUrl(putResult.hash);

			const prefix = putResult.hash.slice(0, 2);
			expect(url).toBe(`/assets/blobs/${prefix}/${putResult.hash}`);
		});

		it("put then exists returns true", async () => {
			const putResult = await blobStore.put(TEST_DATA, "image/png");

			const existingRows = new Map([
				[putResult.hash, { id: putResult.assetId }],
			]);
			dbMock = createMockDb(existingRows);
			blobStore = new BlobStore(bucket.bucket, dbMock.db);

			const doesExist = await blobStore.exists(putResult.hash);
			expect(doesExist).toBe(true);
		});
	});
});
