#!/usr/bin/env tsx
/**
 * Imports all content packs from JSON files into the D1 database via the tRPC API.
 * Usage:
 *   hush run -- npx tsx api/scripts/import-content-packs.ts
 *   hush run -- npx tsx api/scripts/import-content-packs.ts --dry-run
 *   hush run -- npx tsx api/scripts/import-content-packs.ts --publish
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKS_ROOT = join(__dirname, "../src/party/content/packs");
const API_URL = "http://api.slopcade.localhost:1355";

const DRY_RUN = process.argv.includes("--dry-run");
const PUBLISH_AFTER = process.argv.includes("--publish");
const BATCH_SIZE = 100;

const SKIP_VOICE_TYPES = new Set(["headsup", "wordlist", "FakeWord", "chroma"]);

interface PackSpec {
	brand: "amen" | "slopcade";
	filename: string;
	contentType: string;
	filePath: string;
}

function discoverPacks(): PackSpec[] {
	const specs: PackSpec[] = [];

	const brandDirs: Array<{
		brand: "amen" | "slopcade";
		dir: string;
	}> = [
		{ brand: "amen", dir: join(PACKS_ROOT, "amen") },
		{ brand: "slopcade", dir: join(PACKS_ROOT, "slopcade") },
	];

	for (const { brand, dir } of brandDirs) {
		let files: string[];
		try {
			files = readdirSync(dir) as string[];
		} catch {
			console.warn(`[warn] Could not read ${dir}, skipping`);
			continue;
		}

		for (const filename of files) {
			if (!filename.endsWith(".json")) continue;

			const contentType = filename.replace(/\.json$/, "");

			specs.push({
				brand,
				filename,
				contentType,
				filePath: join(dir, filename),
			});
		}
	}

	return specs;
}

async function getAdminToken(): Promise<string> {
	const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
	const adminEmail = process.env.ADMIN_EMAILS?.split(",")[0]?.trim();

	if (!supabaseUrl || !serviceRoleKey || !adminEmail) {
		throw new Error(
			"Missing env: EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAILS",
		);
	}

	const linkRes = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${serviceRoleKey}`,
			apikey: serviceRoleKey,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ type: "magiclink", email: adminEmail }),
	});
	const linkData = (await linkRes.json()) as { hashed_token?: string };
	if (!linkData.hashed_token)
		throw new Error("Failed to generate magic link token");

	const verifyRes = await fetch(`${supabaseUrl}/auth/v1/verify`, {
		method: "POST",
		headers: { apikey: serviceRoleKey, "Content-Type": "application/json" },
		body: JSON.stringify({
			type: "magiclink",
			token_hash: linkData.hashed_token,
		}),
	});
	const verifyData = (await verifyRes.json()) as { access_token?: string };
	if (!verifyData.access_token)
		throw new Error("Failed to exchange token for session");

	return verifyData.access_token;
}

async function trpc(
	endpoint: string,
	body: unknown,
	token: string,
	method: "GET" | "POST" = "POST",
): Promise<unknown> {
	const headers: Record<string, string> = {
		Authorization: `Bearer ${token}`,
		"x-brand-id": "slopcade",
	};
	let url = `${API_URL}/trpc/${endpoint}`;
	let fetchInit: RequestInit;
	if (method === "GET") {
		if (body !== undefined) {
			url += `?input=${encodeURIComponent(JSON.stringify(body))}`;
		}
		fetchInit = { method: "GET", headers };
	} else {
		headers["Content-Type"] = "application/json";
		fetchInit = { method: "POST", headers, body: JSON.stringify(body) };
	}
	const res = await fetch(url, fetchInit);
	const data = (await res.json()) as {
		result?: { data?: unknown };
		error?: unknown;
	};
	if (data.error)
		throw new Error(`tRPC ${endpoint}: ${JSON.stringify(data.error)}`);
	return (data.result as { data?: unknown } | undefined)?.data ?? data;
}

async function getImportStatus(token: string) {
	return trpc("partyContent.importStatus", undefined, token, "GET") as Promise<{
		totalContent: number;
		byBrand: Record<string, number>;
		byType: Record<string, number>;
	}>;
}

async function main() {
	console.log(`\n📦 Content Pack Importer${DRY_RUN ? " (DRY RUN)" : ""}\n`);

	console.log("🔑 Authenticating...");
	const token = await getAdminToken();
	console.log("   ✓ Got admin token\n");

	const before = await getImportStatus(token);
	console.log(`📊 DB before: ${before.totalContent} total`);
	console.log(`   By brand: ${JSON.stringify(before.byBrand)}`);
	console.log(`   By type:  ${JSON.stringify(before.byType)}\n`);

	const packs = discoverPacks();
	console.log(`📂 Found ${packs.length} pack files:\n`);

	const jsonCounts: Map<string, number> = new Map();
	for (const p of packs) {
		const raw = JSON.parse(readFileSync(p.filePath, "utf-8")) as unknown[];
		const valid = raw.filter(
			(item): item is Record<string, unknown> =>
				typeof item === "object" &&
				item !== null &&
				typeof (item as Record<string, unknown>).id === "string",
		);
		const key = `${p.brand}:${p.contentType}`;
		jsonCounts.set(key, (jsonCounts.get(key) ?? 0) + valid.length);
		const missing = raw.length - valid.length;
		console.log(
			`   ${p.brand}/${p.filename} → "${p.contentType}" (${raw.length}${missing > 0 ? `, ${missing} missing id` : ""})`,
		);
	}
	console.log();

	if (DRY_RUN) {
		console.log("⚠️  Dry run — no data written.\n");
		return;
	}

	const totals = { inserted: 0, updated: 0, skipped: 0 };

	for (const pack of packs) {
		const raw = JSON.parse(readFileSync(pack.filePath, "utf-8")) as unknown[];
		const items = raw.filter(
			(item): item is Record<string, unknown> =>
				typeof item === "object" && item !== null,
		);

		if (items.length === 0) {
			console.log(`   ⏭  ${pack.brand}/${pack.filename}: empty, skipping`);
			continue;
		}

		process.stdout.write(
			`   ⬆  ${pack.brand}/${pack.filename} (${items.length})... `,
		);

		let ins = 0,
			upd = 0,
			skip = 0;
		for (let i = 0; i < items.length; i += BATCH_SIZE) {
			const result = (await trpc(
				"partyContent.importItems",
				{
					brand: pack.brand,
					contentType: pack.contentType,
					items: items.slice(i, i + BATCH_SIZE),
				},
				token,
			)) as { inserted: number; updated: number; skipped: number };
			ins += result.inserted;
			upd += result.updated;
			skip += result.skipped;
		}

		totals.inserted += ins;
		totals.updated += upd;
		totals.skipped += skip;
		console.log(`✓ +${ins} new, ~${upd} updated, ${skip} skipped`);
	}

	console.log(
		`\n✅ Import totals: +${totals.inserted} new, ~${totals.updated} updated, ${totals.skipped} skipped\n`,
	);

	const after = await getImportStatus(token);
	console.log(`📊 DB after: ${after.totalContent} total`);
	console.log(`   By brand: ${JSON.stringify(after.byBrand)}`);
	console.log(`   By type:  ${JSON.stringify(after.byType)}\n`);

	console.log("🔍 Verification (JSON counts vs DB counts):\n");
	let allGood = true;

	for (const [key, jsonCount] of jsonCounts) {
		const [brand, contentType] = key.split(":");
		const dbCount = after.byType[contentType] ?? 0;
		const ok = dbCount >= jsonCount;
		if (!ok) allGood = false;
		const voiceNote = SKIP_VOICE_TYPES.has(contentType) ? " (no audio)" : "";
		console.log(
			`   ${ok ? "✓" : "❌"} ${brand}/${contentType}: ${jsonCount} JSON → ${dbCount} DB${voiceNote}`,
		);
	}

	if (!allGood) {
		console.log(
			"\n❌ Verification failed — DB counts are lower than JSON. Do NOT delete JSON files yet.\n",
		);
		process.exit(1);
	}

	console.log(
		"\n✅ All content verified in DB. Safe to delete JSON pack files.\n",
	);

	if (PUBLISH_AFTER) {
		console.log("📢 Publishing snapshot...");
		const snap = (await trpc("partyContent.publish", {}, token)) as {
			version: number;
			contentCount: number;
		};
		console.log(
			`   ✓ Published snapshot v${snap.version} (${snap.contentCount} items)\n`,
		);
	} else {
		console.log(
			"ℹ️  Add --publish to create a production snapshot, or use the admin UI.\n",
		);
	}
}

main().catch((err) => {
	console.error("\nFatal:", err);
	process.exit(1);
});
