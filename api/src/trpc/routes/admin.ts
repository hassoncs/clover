import { z } from "zod";
import { AuditService } from "@/services/audit-service";
import { adminProcedure, router } from "../index";

export const adminRouter = router({
	backfillContentHash: adminProcedure
		.input(z.object({ batchSize: z.number().default(50) }))
		.mutation(async ({ ctx, input }) => {
			const { DB, ASSETS } = ctx.env;

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

					const digest = await crypto.subtle.digest("SHA-256", arrayBuffer);
					const bytes = new Uint8Array(digest);
					const hash = Array.from(bytes)
						.map((b) => b.toString(16).padStart(2, "0"))
						.join("");

					const existing = await DB.prepare(
						"SELECT id FROM assets WHERE content_hash = ?",
					)
						.bind(hash)
						.first<{ id: string }>();

					if (existing && existing.id !== asset.id) {
						await DB.prepare("UPDATE assets SET content_hash = ? WHERE id = ?")
							.bind(hash, asset.id)
							.run();
						processed++;
						continue;
					}

					const prefix = hash.slice(0, 2);
					const newR2Key = `blobs/${prefix}/${hash}`;

					const blobExists = await ASSETS.head(newR2Key);
					if (!blobExists) {
						await ASSETS.put(newR2Key, arrayBuffer, {
							httpMetadata: obj.httpMetadata,
						});
					}

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

			const audit = new AuditService(ctx.env.DB);
			await audit.logEvent({
				actorId: ctx.user.id,
				action: "admin.backfill_content_hash",
				metadata: { batchSize: input.batchSize, processed, skipped },
			});

			return { processed, skipped, errors };
		}),
});
