import { execSync } from "child_process";
import { randomUUID } from "crypto";
import {
	existsSync,
	readdirSync,
	readFileSync,
	unlinkSync,
	writeFileSync,
} from "fs";
import { join, resolve } from "path";

const now = Date.now();
const rootDir = resolve(__dirname, "..", "..");
const r2Dir = join(rootDir, "r2");
const gamesDir = join(r2Dir, "games");
const packsDir = join(r2Dir, "packs");

interface PackManifest {
	version: number;
	packId: string;
	name: string;
	assets: Record<string, { file: string }>;
}

interface PackInfo {
	manifest: PackManifest;
	gameSlug: string;
}

const packToGameSlug = new Map<string, string>();

for (const gameSlug of readdirSync(gamesDir)) {
	const defPath = join(gamesDir, gameSlug, "definition.json");
	if (!existsSync(defPath)) continue;

	try {
		const def = JSON.parse(readFileSync(defPath, "utf-8"));
		const assetSystem = def.assetSystem;
		if (!assetSystem) continue;

		const packIds: string[] = assetSystem.packIds || [];
		for (const packId of packIds) {
			packToGameSlug.set(packId, gameSlug);
		}
		if (assetSystem.activePackId && assetSystem.activePackId !== "default") {
			packToGameSlug.set(assetSystem.activePackId, gameSlug);
		}
	} catch {}
}

// Step 2: Read all pack manifests
const packs: PackInfo[] = [];

for (const packDir of readdirSync(packsDir)) {
	const manifestPath = join(packsDir, packDir, "manifest.json");
	if (!existsSync(manifestPath)) continue;

	try {
		const manifest: PackManifest = JSON.parse(
			readFileSync(manifestPath, "utf-8"),
		);
		const gameSlug = packToGameSlug.get(manifest.packId);
		if (!gameSlug) {
			console.warn(
				`⚠️  Skipping orphan pack ${manifest.packId} (${manifest.name}) — not referenced by any game`,
			);
			continue;
		}
		packs.push({ manifest, gameSlug });
	} catch {}
}

if (packs.length === 0) {
	console.log("No packs found to seed.");
	process.exit(0);
}

const nameGroups = new Map<string, string[]>();
for (const { manifest, gameSlug } of packs) {
	const key = `${gameSlug}:${manifest.name}`;
	if (!nameGroups.has(key)) nameGroups.set(key, []);
	nameGroups.get(key)!.push(manifest.packId);
}

function getPackName(
	gameSlug: string,
	baseName: string,
	packId: string,
): string {
	const key = `${gameSlug}:${baseName}`;
	const group = nameGroups.get(key)!;
	if (group.length === 1) return baseName;
	return `${baseName} (${packId.substring(0, 8)})`;
}

const esc = (s: string) => s.replace(/'/g, "''");
const lines: string[] = [];

const allPackIds = packs.map((p) => `'${p.manifest.packId}'`).join(", ");
lines.push(`DELETE FROM pack_entries WHERE pack_id IN (${allPackIds});`);
lines.push(`DELETE FROM asset_packs WHERE id IN (${allPackIds});`);
lines.push("");

for (const { manifest, gameSlug } of packs) {
	const packName = getPackName(gameSlug, manifest.name, manifest.packId);

	lines.push(`-- ${packName} → ${gameSlug}`);
	lines.push(
		`INSERT INTO asset_packs (id, base_game_id, name, is_complete, created_at, updated_at) ` +
			`VALUES ('${manifest.packId}', (SELECT id FROM games WHERE r2_prefix = 'games/${gameSlug}'), '${esc(packName)}', 1, ${now}, ${now});`,
	);

	for (const [templateId, assetInfo] of Object.entries(manifest.assets)) {
		const r2Key = `packs/${manifest.packId}/${assetInfo.file}`;
		const assetId = randomUUID();
		const entryId = randomUUID();

		lines.push(
			`INSERT OR IGNORE INTO assets (id, r2_key, source, created_at) ` +
				`VALUES ('${assetId}', '${esc(r2Key)}', 'generated', ${now});`,
		);

		lines.push(
			`INSERT INTO pack_entries (id, pack_id, template_id, asset_id) ` +
				`VALUES ('${entryId}', '${manifest.packId}', '${esc(templateId)}', ` +
				`(SELECT id FROM assets WHERE r2_key = '${esc(r2Key)}'));`,
		);
	}

	lines.push("");
}

const sql = lines.join("\n");
const totalAssets = packs.reduce(
	(sum, p) => sum + Object.keys(p.manifest.assets).length,
	0,
);

console.log(
	`Seeding ${packs.length} asset packs with ${totalAssets} total assets...`,
);
console.log("");

const tempFile = "/tmp/seed-asset-packs.sql";
writeFileSync(tempFile, sql);

try {
	const cwd = process.cwd().includes("/api")
		? process.cwd()
		: resolve(process.cwd(), "api");
	execSync(`npx wrangler d1 execute slopcade-db --file=${tempFile} --local`, {
		stdio: "inherit",
		cwd,
	});
	console.log("");
	console.log("✅ Asset packs seeded successfully:");
	for (const { manifest, gameSlug } of packs) {
		const name = getPackName(gameSlug, manifest.name, manifest.packId);
		const assetCount = Object.keys(manifest.assets).length;
		console.log(`   - ${name} (${assetCount} assets) → ${gameSlug}`);
	}
} finally {
	unlinkSync(tempFile);
}
