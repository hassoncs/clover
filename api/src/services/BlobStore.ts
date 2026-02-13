type R2Bucket = import("@cloudflare/workers-types").R2Bucket;
type D1Database = import("@cloudflare/workers-types").D1Database;

export interface BlobStoreResult {
	hash: string;
	assetId: string;
	isNew: boolean;
}

export interface BlobMeta {
	width?: number;
	height?: number;
	creatorUserId?: string;
	source?: "generated" | "uploaded";
	compiledPrompt?: string;
	modelId?: string;
	themeId?: string;
}

export class BlobStore {
	constructor(
		private readonly bucket: R2Bucket,
		private readonly db: D1Database,
	) {}

	async put(
		data: ArrayBuffer | Uint8Array,
		mimeType: string,
		meta?: BlobMeta,
	): Promise<BlobStoreResult> {
		const buffer: ArrayBuffer =
			data instanceof Uint8Array
				? (data.buffer.slice(
						data.byteOffset,
						data.byteOffset + data.byteLength,
					) as ArrayBuffer)
				: data;

		const hash = await this.computeHash(buffer);

		const existing = await this.db
			.prepare("SELECT id FROM assets WHERE content_hash = ?")
			.bind(hash)
			.first<{ id: string }>();

		if (existing) {
			return { hash, assetId: existing.id, isNew: false };
		}

		const r2Key = this.buildR2Key(hash);
		await this.bucket.put(r2Key, buffer, {
			httpMetadata: { contentType: mimeType },
		});
		if (__DEV__) {
			const { mirrorBlobToLocalR2 } = await import("@/lib/dev-mirror");
			mirrorBlobToLocalR2(r2Key, buffer);
		}

		const assetId = crypto.randomUUID();
		const now = Math.floor(Date.now() / 1000);

		await this.db
			.prepare(
				`INSERT INTO assets (id, r2_key, content_hash, width, height, creator_user_id, source, compiled_prompt, model_id, theme_id, created_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.bind(
				assetId,
				r2Key,
				hash,
				meta?.width ?? null,
				meta?.height ?? null,
				meta?.creatorUserId ?? null,
				meta?.source ?? "generated",
				meta?.compiledPrompt ?? null,
				meta?.modelId ?? null,
				meta?.themeId ?? null,
				now,
			)
			.run();

		return { hash, assetId, isNew: true };
	}

	async get(
		hash: string,
	): Promise<{ data: ReadableStream; mimeType: string } | null> {
		const r2Key = this.buildR2Key(hash);
		const obj = await this.bucket.get(r2Key);
		if (!obj) return null;

		return {
			data: obj.body,
			mimeType: obj.httpMetadata?.contentType ?? "application/octet-stream",
		};
	}

	async exists(hash: string): Promise<boolean> {
		const row = await this.db
			.prepare("SELECT 1 FROM assets WHERE content_hash = ?")
			.bind(hash)
			.first();
		return row !== null;
	}

	getUrl(hash: string): string {
		const r2Key = this.buildR2Key(hash);
		return `/assets/${r2Key}`;
	}

	private buildR2Key(hash: string): string {
		const prefix = hash.slice(0, 2);
		return `blobs/${prefix}/${hash}`;
	}

	private async computeHash(data: ArrayBuffer): Promise<string> {
		const digest = await crypto.subtle.digest("SHA-256", data);
		const bytes = new Uint8Array(digest);
		return Array.from(bytes)
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");
	}
}
