import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function queryD1(sql: string): any[] {
	try {
		const output = execSync(
			`npx wrangler d1 execute slopcade-db --local --command "${sql}" --json`,
			{ encoding: "utf-8", cwd: path.join(process.cwd(), "api") },
		);
		const match = output.match(/^[[{]/m);
		if (match && match.index !== undefined) {
			const jsonStr = output.slice(match.index);
			const parsed = JSON.parse(jsonStr);
			return Array.isArray(parsed) && parsed[0]?.results
				? parsed[0].results
				: [];
		}
		return [];
	} catch (error) {
		console.error("Failed to query D1:", error);
		return [];
	}
}

async function main() {
	console.log("Pulling blobs from local API to disk...");

	const assets = queryD1(
		"SELECT id, r2_key, content_hash FROM assets WHERE source = 'generated'",
	);

	if (!assets || assets.length === 0) {
		console.log("No generated assets found in local D1.");
		return;
	}

	console.log(`Found ${assets.length} generated assets.`);

	const r2Base = path.resolve(process.cwd(), "r2");

	for (const asset of assets) {
		if (!asset.r2_key) continue;

		const localPath = path.join(r2Base, asset.r2_key);
		if (fs.existsSync(localPath)) {
			console.log(`[SKIP] ${asset.r2_key} already exists on disk`);
			continue;
		}

		console.log(`[FETCH] ${asset.r2_key}...`);
		const url = `http://api.slopcade.localhost:1355/assets/${asset.r2_key}`;

		try {
			const res = await fetch(url);
			if (!res.ok) {
				console.error(`Failed to fetch ${url}: ${res.statusText}`);
				continue;
			}
			const arrayBuffer = await res.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);

			const dir = path.dirname(localPath);
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir, { recursive: true });
			}

			fs.writeFileSync(localPath, buffer);
			console.log(`[SAVED] ${localPath}`);
		} catch (err) {
			console.error(`Error fetching ${asset.r2_key}:`, err);
		}
	}

	console.log("Done.");
}

main().catch(console.error);
