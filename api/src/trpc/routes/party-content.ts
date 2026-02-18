import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { z } from "zod";
import { adminProcedure, router } from "@/trpc/index";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const contentPacksRoot = path.resolve(scriptDir, "../../party/content/packs");

type Brand = "amen" | "slopcade";

const CONTENT_TYPES = [
	"quip",
	"trivia",
	"drawing",
	"dilemma",
	"wyr",
	"estimation",
	"fibbage",
	"caption",
	"wordgame",
	"wordlist",
	"personal",
	"FakeWord",
	"ranking",
	"headsup",
] as const;
type ContentType = (typeof CONTENT_TYPES)[number];

const SKIP_VOICE_TYPES = new Set(["headsup", "wordlist", "FakeWord"]);

async function computeContentHash(body: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(body);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function extractContentTypeFromFilename(
	filename: string,
	brand: Brand,
): ContentType | null {
	const baseName = filename.replace(/\.json$/i, "");

	if (brand === "amen") {
		const withoutPrefix = baseName.replace(/^amen-/, "");
		if (CONTENT_TYPES.includes(withoutPrefix as ContentType)) {
			return withoutPrefix as ContentType;
		}
	}

	if (CONTENT_TYPES.includes(baseName as ContentType)) {
		return baseName as ContentType;
	}

	return null;
}

function getAudioTextFields(
	item: Record<string, unknown>,
	contentType: ContentType,
): { text: string } | null {
	switch (contentType) {
		case "quip":
		case "personal":
			return typeof item.text === "string" ? { text: item.text } : null;
		case "trivia":
		case "fibbage":
		case "estimation":
			return typeof item.question === "string" ? { text: item.question } : null;
		case "drawing":
			return typeof item.prompt === "string" ? { text: item.prompt } : null;
		case "ranking":
			return typeof item.topic === "string" ? { text: item.topic } : null;
		case "dilemma":
		case "wyr":
			if (
				typeof item.optionA === "string" &&
				typeof item.optionB === "string"
			) {
				return {
					text: `Would you rather: ${item.optionA}, or, ${item.optionB}?`,
				};
			}
			return null;
		default:
			return null;
	}
}

function buildAudioR2Key(
	brand: Brand,
	contentType: ContentType,
	contentId: string,
): string {
	return `audio/voice/${brand}/content/${contentType}/${contentId}.mp3`;
}

async function loadPackFiles(brand: Brand): Promise<
	Array<{
		filename: string;
		contentType: ContentType;
		items: Array<Record<string, unknown>>;
	}>
> {
	const brandDir = path.join(contentPacksRoot, brand);
	let files: string[];

	try {
		files = await readdir(brandDir);
	} catch {
		return [];
	}

	const packs: Array<{
		filename: string;
		contentType: ContentType;
		items: Array<Record<string, unknown>>;
	}> = [];

	for (const filename of files) {
		if (!filename.endsWith(".json")) continue;

		const contentType = extractContentTypeFromFilename(filename, brand);
		if (!contentType) continue;

		const filePath = path.join(brandDir, filename);
		const raw = await readFile(filePath, "utf-8");

		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch {
			console.warn(`Failed to parse ${filePath}: invalid JSON`);
			continue;
		}

		if (!Array.isArray(parsed)) {
			console.warn(`Skipping ${filePath}: not an array`);
			continue;
		}

		const items = parsed.filter(
			(item): item is Record<string, unknown> =>
				typeof item === "object" && item !== null,
		);

		packs.push({ filename, contentType, items });
	}

	return packs;
}

export const partyContentRouter = router({
	importPacks: adminProcedure
		.input(
			z.object({
				brands: z.array(z.enum(["amen", "slopcade"])).optional(),
				dryRun: z.boolean().default(false),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const brands = input.brands ?? (["amen", "slopcade"] as Brand[]);
			const now = Date.now();

			const brandCounts: Record<Brand, number> = { amen: 0, slopcade: 0 };
			const contentTypeCounts: Record<string, number> = {};
			let totalItems = 0;
			let assetsLinked = 0;
			let skipped = 0;

			const contentRows: Array<{
				id: string;
				brandId: Brand;
				contentType: ContentType;
				body: string;
				category: string | null;
				difficulty: number | null;
				contentHash: string;
			}> = [];

			const assetRows: Array<{
				id: string;
				contentId: string;
				r2Key: string;
			}> = [];

			for (const brand of brands) {
				const packs = await loadPackFiles(brand);

				for (const pack of packs) {
					const { contentType, items } = pack;

					for (const item of items) {
						if (typeof item.id !== "string" || !item.id) {
							skipped++;
							continue;
						}

						const contentId = item.id;
						const body = JSON.stringify(item);
						const contentHash = await computeContentHash(body);

						const category =
							typeof item.category === "string" ? item.category : null;
						const difficulty =
							typeof item.difficulty === "number" ? item.difficulty : null;

						contentRows.push({
							id: contentId,
							brandId: brand,
							contentType,
							body,
							category,
							difficulty,
							contentHash,
						});

						brandCounts[brand]++;
						contentTypeCounts[contentType] =
							(contentTypeCounts[contentType] ?? 0) + 1;
						totalItems++;

						if (!SKIP_VOICE_TYPES.has(contentType)) {
							const audioFields = getAudioTextFields(item, contentType);
							if (audioFields) {
								const r2Key = buildAudioR2Key(brand, contentType, contentId);
								const assetId = `audio-${contentId}`;

								assetRows.push({
									id: assetId,
									contentId,
									r2Key,
								});

								assetsLinked++;
							}
						}
					}
				}
			}

			if (input.dryRun) {
				return {
					dryRun: true,
					brandsImported: brands,
					brandCounts,
					contentTypeCounts,
					totalItems,
					assetsLinked,
					skipped,
					inserted: 0,
					updated: 0,
				};
			}

			const db = ctx.env.DB;
			let inserted = 0;
			let updated = 0;

			for (const row of contentRows) {
				const existing = await db
					.prepare("SELECT id, content_hash FROM party_content WHERE id = ?")
					.bind(row.id)
					.first<{ id: string; content_hash: string | null }>();

				if (!existing) {
					await db
						.prepare(
							`INSERT INTO party_content (id, brand_id, content_type, body, category, difficulty, status, source, content_hash, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, 'active', 'imported', ?, ?, ?)`,
						)
						.bind(
							row.id,
							row.brandId,
							row.contentType,
							row.body,
							row.category,
							row.difficulty,
							row.contentHash,
							now,
							now,
						)
						.run();
					inserted++;
				} else if (existing.content_hash !== row.contentHash) {
					await db
						.prepare(
							`UPDATE party_content SET body = ?, category = ?, difficulty = ?, content_hash = ?, updated_at = ? WHERE id = ?`,
						)
						.bind(
							row.body,
							row.category,
							row.difficulty,
							row.contentHash,
							now,
							row.id,
						)
						.run();
					updated++;
				}
			}

			for (const asset of assetRows) {
				const existing = await db
					.prepare(
						"SELECT id FROM party_content_assets WHERE id = ? AND deleted_at IS NULL",
					)
					.bind(asset.id)
					.first();

				if (!existing) {
					await db
						.prepare(
							`INSERT INTO party_content_assets (id, content_id, r2_key, asset_type, role, mime_type, created_at)
               VALUES (?, ?, ?, 'audio', 'primary', 'audio/mpeg', ?)`,
						)
						.bind(asset.id, asset.contentId, asset.r2Key, now)
						.run();
				}
			}

			return {
				dryRun: false,
				brandsImported: brands,
				brandCounts,
				contentTypeCounts,
				totalItems,
				assetsLinked,
				skipped,
				inserted,
				updated,
			};
		}),

	importStatus: adminProcedure.query(async ({ ctx }) => {
		const db = ctx.env.DB;

		const contentResult = await db
			.prepare(
				"SELECT brand_id, content_type, COUNT(*) as count FROM party_content WHERE deleted_at IS NULL GROUP BY brand_id, content_type",
			)
			.all<{ brand_id: string; content_type: string; count: number }>();

		const assetResult = await db
			.prepare(
				"SELECT COUNT(*) as count FROM party_content_assets WHERE deleted_at IS NULL",
			)
			.first<{ count: number }>();

		const byBrand: Record<string, number> = {};
		const byType: Record<string, number> = {};
		let totalContent = 0;

		for (const row of contentResult.results ?? []) {
			byBrand[row.brand_id] = (byBrand[row.brand_id] ?? 0) + row.count;
			byType[row.content_type] = (byType[row.content_type] ?? 0) + row.count;
			totalContent += row.count;
		}

		return {
			totalContent,
			totalAssets: assetResult?.count ?? 0,
			byBrand,
			byType,
		};
	}),
});
