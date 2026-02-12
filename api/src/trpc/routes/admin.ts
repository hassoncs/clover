import { z } from "zod";
import { protectedProcedure, router } from "../index";

export const adminRouter = router({
	backfillContentHash: protectedProcedure
		.input(z.object({ batchSize: z.number().default(50) }))
		.mutation(async ({ ctx, input }) => {
			const { DB, ASSETS } = ctx.env;

			// 1. Fetch assets without content_hash
			const assets = await DB.prepare(
				"SELECT id, r2_key FROM assets WHERE content_hash IS NULL LIMIT ?",
			)
				.bind(input.batchSize)
				.all<{ id: string; r2_key: string }>();

			if (!assets.results || assets.results.length === 0) {
				return { processed: 0, skipped: 0, errors: [] };
			}

			let processed = 0;
			let skipped = 0;
			const errors: Array<{ assetId: string; error: string }> = [];

			for (const asset of assets.results) {
				try {
					// 2. Fetch binary from R2 using old r2_key
					const obj = await ASSETS.get(asset.r2_key);
					if (!obj) {
						errors.push({
							assetId: asset.id,
							error: `R2 object not found: ${asset.r2_key}`,
						});
						skipped++;
						continue;
					}

					const arrayBuffer = await obj.arrayBuffer();

					// 3. Compute SHA-256 hash
					const digest = await crypto.subtle.digest("SHA-256", arrayBuffer);
					const bytes = new Uint8Array(digest);
					const hash = Array.from(bytes)
						.map((b) => b.toString(16).padStart(2, "0"))
						.join("");

					// 4. Check if this hash already exists (deduplication)
					const existing = await DB.prepare(
						"SELECT id FROM assets WHERE content_hash = ?",
					)
						.bind(hash)
						.first<{ id: string }>();

					if (existing && existing.id !== asset.id) {
						// Hash collision - another asset has this content
						// Just update the hash, don't copy to blobs/ (it's already there)
						await DB.prepare("UPDATE assets SET content_hash = ? WHERE id = ?")
							.bind(hash, asset.id)
							.run();
						processed++;
						continue;
					}

					// 5. Copy to new blobs/ prefix
					const prefix = hash.slice(0, 2);
					const newR2Key = `blobs/${prefix}/${hash}`;

					// Check if blob already exists at new location
					const blobExists = await ASSETS.head(newR2Key);
					if (!blobExists) {
						// Copy to new location
						await ASSETS.put(newR2Key, arrayBuffer, {
							httpMetadata: obj.httpMetadata,
						});
					}

					// 6. Update D1 with content_hash (keep old r2_key for backward compat)
					await DB.prepare("UPDATE assets SET content_hash = ? WHERE id = ?")
						.bind(hash, asset.id)
						.run();

					processed++;
				} catch (err) {
					errors.push({
						assetId: asset.id,
						error: err instanceof Error ? err.message : String(err),
					});
					skipped++;
				}
			}

			return { processed, skipped, errors };
		}),
});
