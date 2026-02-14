type D1Database = import("@cloudflare/workers-types").D1Database;
type R2Bucket = import("@cloudflare/workers-types").R2Bucket;

const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000001";

let seeded = false;

interface GameMetadata {
	id: string;
	slug: string;
	title: string;
	description?: string;
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

			const slug =
				metadata.slug ??
				key.replace("games/", "").replace("/metadata.json", "");
			const r2Prefix = `games/${slug}`;

			await env.DB.prepare(
				`INSERT OR IGNORE INTO games (
					id, user_id, title, description, r2_prefix,
					is_public, play_count, created_at, updated_at, base_game_id,
					validation_valid
				) VALUES (?, ?, ?, ?, ?, 1, 0, ?, ?, ?, 1)`,
			)
				.bind(
					metadata.id,
					SYSTEM_USER_ID,
					metadata.title,
					metadata.description ?? "",
					r2Prefix,
					now,
					now,
					metadata.id,
				)
				.run();

			count++;
		}

		console.log(`[auto-seed] Seeded ${count} games from R2`);
	} catch (err) {
		seeded = false;
		const msg = err instanceof Error ? err.message : String(err);
		console.error(`[auto-seed] Failed: ${msg}`);
	}
}
