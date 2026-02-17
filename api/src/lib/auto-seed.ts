import { createHash } from "node:crypto";
import { DEFAULT_BRAND_ID, isValidBrandId } from "@slopcade/brands";

type D1Database = import("@cloudflare/workers-types").D1Database;
type R2Bucket = import("@cloudflare/workers-types").R2Bucket;

const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000001";

let seeded = false;

interface GameMetadata {
	id: string;
	slug: string;
	title: string;
	description?: string;
	brands?: string[];
	brandTitles?: Record<string, { title: string; description?: string }>;
}

function deterministicId(baseId: string, brandId: string): string {
	const hash = createHash("sha256")
		.update(`${baseId}:${brandId}`)
		.digest("hex");
	return [
		hash.slice(0, 8),
		hash.slice(8, 12),
		hash.slice(12, 16),
		hash.slice(16, 20),
		hash.slice(20, 32),
	].join("-");
}

function extractR2Prefix(key: string): string {
	return key.replace(/\/metadata\.json$/, "");
}

export async function autoSeedGamesFromR2(env: {
	DB: D1Database;
	ASSETS: R2Bucket;
}): Promise<void> {
	if (seeded) return;
	seeded = true;

	try {
		const listed = await env.ASSETS.list({ prefix: "games/" });

		const metadataKeys = listed.objects
			.map((obj) => obj.key)
			.filter((key) => key.endsWith("/metadata.json"));

		if (metadataKeys.length === 0) return;

		const now = Date.now();

		await env.DB.prepare(
			`INSERT OR IGNORE INTO users (id, email, display_name, created_at, updated_at) VALUES (?, 'system@slopcade.dev', 'Slop', ?, ?)`,
		)
			.bind(SYSTEM_USER_ID, now, now)
			.run();

		let count = 0;

		for (const key of metadataKeys) {
			const obj = await env.ASSETS.get(key);
			if (!obj) continue;

			let metadata: GameMetadata;
			try {
				metadata = (await obj.json()) as GameMetadata;
			} catch {
				console.warn(`[auto-seed] Failed to parse ${key}, skipping`);
				continue;
			}

			if (!metadata.id || !metadata.title) {
				console.warn(`[auto-seed] Missing id/title in ${key}, skipping`);
				continue;
			}

			const r2Prefix = extractR2Prefix(key);
			const brands = (metadata.brands ?? [DEFAULT_BRAND_ID]).filter(
				isValidBrandId,
			);

			for (const brandId of brands) {
				const gameId =
					brands.length === 1
						? metadata.id
						: deterministicId(metadata.id, brandId);

				const brandOverride = metadata.brandTitles?.[brandId];
				const title = brandOverride?.title ?? metadata.title;
				const description =
					brandOverride?.description ?? metadata.description ?? "";

				await env.DB.prepare(
					`INSERT OR IGNORE INTO games (
						id, user_id, title, description, r2_prefix,
						is_public, play_count, created_at, updated_at, base_game_id,
						validation_valid, brand_id
					) VALUES (?, ?, ?, ?, ?, 1, 0, ?, ?, ?, 1, ?)`,
				)
					.bind(
						gameId,
						SYSTEM_USER_ID,
						title,
						description,
						r2Prefix,
						now,
						now,
						gameId,
						brandId,
					)
					.run();

				count++;
			}
		}

		console.log(`[auto-seed] Seeded ${count} game rows from R2`);
	} catch (err) {
		seeded = false;
		const msg = err instanceof Error ? err.message : String(err);
		console.error(`[auto-seed] Failed: ${msg}`);
	}
}
