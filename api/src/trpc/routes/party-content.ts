import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
	type AudioProvider,
	createAudioGenerator,
	SKIP_VOICE_TYPES,
} from "@/party/content/audio";
import {
	composeGameTypeConfig,
	computeContentHash as computeGenerationHash,
	containsBlockedKeyword,
	createModel,
	generateItems,
} from "@/party/content-generation";
import {
	getBrandContentConfig,
	getGameTypeConfig,
} from "@/party/content-generation/brand-content-config";
import { adminProcedure, router } from "@/trpc/index";

function getContentPacksRoot(): string {
	return path.resolve("src/party/content/packs");
}

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
	"chroma",
] as const;
type ContentType = (typeof CONTENT_TYPES)[number];

async function computeContentHash(body: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(body);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

const FILENAME_TO_CONTENT_TYPE: Record<string, ContentType> = {
	wager: "estimation",
	"amen-wager": "estimation",
	"amen-chroma": "chroma",
};

function extractContentTypeFromFilename(
	filename: string,
	brand: Brand,
): ContentType | null {
	const baseName = filename.replace(/\.json$/i, "");

	if (FILENAME_TO_CONTENT_TYPE[baseName]) {
		return FILENAME_TO_CONTENT_TYPE[baseName];
	}

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
	const contentPacksRoot = getContentPacksRoot();
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

function extractItemText(
	item: Record<string, unknown>,
	gameType: string,
): string {
	switch (gameType) {
		case "dilemma":
		case "wyr":
			return `Would you rather: ${item.optionA} OR ${item.optionB}`;
		case "drawing":
			return String(item.text || item.prompt || "");
		case "ranking":
			return String(item.topic || "");
		case "headsup":
		case "wordlist":
			return String(item.name || "");
		case "wager":
		case "history":
		case "trivia":
		case "fibbage":
		case "estimation":
			return String(item.question || "");
		case "chroma": {
			const clues = Array.isArray(item.clues)
				? (item.clues as string[]).join(", ")
				: "";
			return clues;
		}
		default:
			return String(item.text || item.question || item.prompt || "");
	}
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

	importItems: adminProcedure
		.input(
			z.object({
				brand: z.enum(["amen", "slopcade"]),
				contentType: z.enum(CONTENT_TYPES),
				items: z.array(z.record(z.unknown())).min(1).max(500),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const db = ctx.env.DB;
			const now = Date.now();
			let inserted = 0;
			let updated = 0;
			let skipped = 0;
			let assetsLinked = 0;

			for (const item of input.items) {
				if (typeof item.id !== "string" || !item.id) {
					skipped++;
					continue;
				}

				const contentId = item.id;
				const body = JSON.stringify(item);
				const encoder = new TextEncoder();
				const hashBuffer = await crypto.subtle.digest(
					"SHA-256",
					encoder.encode(body),
				);
				const contentHash = Array.from(new Uint8Array(hashBuffer))
					.map((b) => b.toString(16).padStart(2, "0"))
					.join("");
				const category =
					typeof item.category === "string" ? item.category : null;
				const difficulty =
					typeof item.difficulty === "number" ? item.difficulty : null;

				const existing = await db
					.prepare("SELECT id, content_hash FROM party_content WHERE id = ?")
					.bind(contentId)
					.first<{ id: string; content_hash: string | null }>();

				if (!existing) {
					await db
						.prepare(
							`INSERT INTO party_content (id, brand_id, content_type, body, category, difficulty, status, source, content_hash, created_at, updated_at)
							 VALUES (?, ?, ?, ?, ?, ?, 'active', 'imported', ?, ?, ?)`,
						)
						.bind(
							contentId,
							input.brand,
							input.contentType,
							body,
							category,
							difficulty,
							contentHash,
							now,
							now,
						)
						.run();
					inserted++;
				} else if (existing.content_hash !== contentHash) {
					await db
						.prepare(
							`UPDATE party_content SET body = ?, category = ?, difficulty = ?, content_hash = ?, updated_at = ? WHERE id = ?`,
						)
						.bind(body, category, difficulty, contentHash, now, contentId)
						.run();
					updated++;
				}

				if (!SKIP_VOICE_TYPES.has(input.contentType)) {
					const audioFields = getAudioTextFields(item, input.contentType);
					if (audioFields) {
						const r2Key = buildAudioR2Key(
							input.brand,
							input.contentType,
							contentId,
						);
						const assetId = `audio-${contentId}`;
						const assetExists = await db
							.prepare(
								"SELECT id FROM party_content_assets WHERE id = ? AND deleted_at IS NULL",
							)
							.bind(assetId)
							.first();
						if (!assetExists) {
							await db
								.prepare(
									`INSERT INTO party_content_assets (id, content_id, r2_key, asset_type, role, mime_type, created_at)
									 VALUES (?, ?, ?, 'audio', 'primary', 'audio/mpeg', ?)`,
								)
								.bind(assetId, contentId, r2Key, now)
								.run();
							assetsLinked++;
						}
					}
				}
			}

			return {
				inserted,
				updated,
				skipped,
				assetsLinked,
				total: input.items.length,
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

	// ============================================================================
	// Admin CRUD Routes
	// ============================================================================

	list: adminProcedure
		.input(
			z.object({
				page: z.number().int().min(1).default(1),
				pageSize: z.number().int().min(1).max(200).default(50),
				brand: z.enum(["amen", "slopcade"]).optional(),
				contentType: z.string().optional(),
				status: z.enum(["draft", "active", "retired"]).optional(),
				category: z.string().optional(),
				hasReview: z.boolean().optional(),
				minQuality: z.number().int().min(1).max(5).optional(),
				minHumor: z.number().int().min(1).max(5).optional(),
				search: z.string().optional(),
				includeDeleted: z.boolean().default(false),
				sortBy: z
					.enum(["created_at", "updated_at", "quality_score", "humor_score"])
					.default("created_at"),
				sortOrder: z.enum(["asc", "desc"]).default("desc"),
			}),
		)
		.query(async ({ ctx, input }) => {
			const db = ctx.env.DB;
			const {
				page,
				pageSize,
				brand,
				contentType,
				status,
				category,
				hasReview,
				minQuality,
				minHumor,
				search,
				includeDeleted,
				sortBy,
				sortOrder,
			} = input;

			const conditions: string[] = [];
			const params: unknown[] = [];

			if (!includeDeleted) {
				conditions.push("pc.deleted_at IS NULL");
			}
			if (brand) {
				conditions.push("pc.brand_id = ?");
				params.push(brand);
			}
			if (contentType) {
				conditions.push("pc.content_type = ?");
				params.push(contentType);
			}
			if (status) {
				conditions.push("pc.status = ?");
				params.push(status);
			}
			if (category) {
				conditions.push("pc.category = ?");
				params.push(category);
			}
			if (search) {
				conditions.push("pc.body LIKE ?");
				params.push(`%${search}%`);
			}

			const reviewerUserId = ctx.user.id;

			const myReviewJoin = `
			LEFT JOIN (
				SELECT content_id, quality_score, humor_score, notes, reviewer_user_id, created_at
				FROM party_content_reviews
				WHERE reviewer_user_id = '${reviewerUserId}'
			) mr ON mr.content_id = pc.id
		`;

			const avgReviewJoin = `
			LEFT JOIN (
				SELECT content_id,
					AVG(quality_score) as avg_quality,
					AVG(humor_score) as avg_humor,
					COUNT(*) as review_count
				FROM party_content_reviews
				GROUP BY content_id
			) ar ON ar.content_id = pc.id
		`;

			if (hasReview === true) {
				conditions.push("ar.content_id IS NOT NULL");
			} else if (hasReview === false) {
				conditions.push("ar.content_id IS NULL");
			}
			if (minQuality !== undefined) {
				conditions.push("ar.avg_quality >= ?");
				params.push(minQuality);
			}
			if (minHumor !== undefined) {
				conditions.push("ar.avg_humor >= ?");
				params.push(minHumor);
			}

			const whereClause =
				conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

			const sortColumn =
				sortBy === "quality_score"
					? "ar.avg_quality"
					: sortBy === "humor_score"
						? "ar.avg_humor"
						: `pc.${sortBy}`;

			const countSql = `
			SELECT COUNT(DISTINCT pc.id) as total
			FROM party_content pc
			${myReviewJoin}
			${avgReviewJoin}
			${whereClause}
		`;
			const countResult = await db
				.prepare(countSql)
				.bind(...params)
				.first<{ total: number }>();
			const total = countResult?.total ?? 0;

			const offset = (page - 1) * pageSize;
			const dataSql = `
			SELECT
				pc.id, pc.brand_id, pc.content_type, pc.body, pc.category, pc.difficulty,
				pc.status, pc.source, pc.content_hash, pc.metadata, pc.created_at, pc.updated_at, pc.deleted_at,
				mr.quality_score as my_quality_score, mr.humor_score as my_humor_score,
				mr.notes as my_notes, mr.created_at as my_review_created_at,
				ar.avg_quality, ar.avg_humor, ar.review_count
			FROM party_content pc
			${myReviewJoin}
			${avgReviewJoin}
			${whereClause}
			ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}
			LIMIT ? OFFSET ?
		`;

			const dataResult = await db
				.prepare(dataSql)
				.bind(...params, pageSize, offset)
				.all<{
					id: string;
					brand_id: string;
					content_type: string;
					body: string;
					category: string | null;
					difficulty: number | null;
					status: string;
					source: string;
					content_hash: string | null;
					metadata: string | null;
					created_at: number;
					updated_at: number;
					deleted_at: number | null;
					my_quality_score: number | null;
					my_humor_score: number | null;
					my_notes: string | null;
					my_review_created_at: number | null;
					avg_quality: number | null;
					avg_humor: number | null;
					review_count: number | null;
				}>();

			const contentIds = (dataResult.results ?? []).map((r) => r.id);

			const assetsByContent: Record<
				string,
				Array<{
					id: string;
					content_id: string;
					r2_key: string;
					asset_type: string;
					role: string;
					mime_type: string | null;
					duration_ms: number | null;
					file_size: number | null;
					created_at: number;
				}>
			> = {};

			if (contentIds.length > 0) {
				const placeholders = contentIds.map(() => "?").join(",");
				const assetsSql = `
					SELECT id, content_id, r2_key, asset_type, role, mime_type, duration_ms, file_size, created_at
					FROM party_content_assets
					WHERE content_id IN (${placeholders}) AND deleted_at IS NULL
				`;
				const assetsResult = await db
					.prepare(assetsSql)
					.bind(...contentIds)
					.all<{
						id: string;
						content_id: string;
						r2_key: string;
						asset_type: string;
						role: string;
						mime_type: string | null;
						duration_ms: number | null;
						file_size: number | null;
						created_at: number;
					}>();

				for (const asset of assetsResult.results ?? []) {
					if (!assetsByContent[asset.content_id]) {
						assetsByContent[asset.content_id] = [];
					}
					assetsByContent[asset.content_id].push(asset);
				}
			}

			const items = (dataResult.results ?? []).map((row) => ({
				id: row.id,
				brandId: row.brand_id,
				contentType: row.content_type,
				body: row.body,
				category: row.category,
				difficulty: row.difficulty,
				status: row.status,
				source: row.source,
				contentHash: row.content_hash,
				metadata: row.metadata,
				createdAt: row.created_at,
				updatedAt: row.updated_at,
				deletedAt: row.deleted_at,
				assets: assetsByContent[row.id] ?? [],
				myReview:
					row.my_quality_score !== null || row.my_humor_score !== null
						? {
								qualityScore: row.my_quality_score,
								humorScore: row.my_humor_score,
								notes: row.my_notes,
								createdAt: row.my_review_created_at,
							}
						: null,
				avgQuality: row.avg_quality,
				avgHumor: row.avg_humor,
				reviewCount: row.review_count ?? 0,
			}));

			return {
				items,
				total,
				page,
				pageSize,
			};
		}),

	update: adminProcedure
		.input(
			z.object({
				id: z.string(),
				body: z.string().optional(),
				category: z.string().nullable().optional(),
				difficulty: z.number().int().min(1).max(10).nullable().optional(),
				status: z.enum(["draft", "active", "retired"]).optional(),
				metadata: z.string().nullable().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const db = ctx.env.DB;
			const now = Date.now();

			const updates: string[] = [];
			const params: unknown[] = [];

			if (input.body !== undefined) {
				updates.push("body = ?");
				params.push(input.body);
			}
			if (input.category !== undefined) {
				updates.push("category = ?");
				params.push(input.category);
			}
			if (input.difficulty !== undefined) {
				updates.push("difficulty = ?");
				params.push(input.difficulty);
			}
			if (input.status !== undefined) {
				updates.push("status = ?");
				params.push(input.status);
			}
			if (input.metadata !== undefined) {
				updates.push("metadata = ?");
				params.push(input.metadata);
			}

			if (updates.length === 0) {
				return { updated: false };
			}

			updates.push("updated_at = ?");
			params.push(now);
			params.push(input.id);

			const sql = `UPDATE party_content SET ${updates.join(", ")} WHERE id = ?`;
			await db
				.prepare(sql)
				.bind(...params)
				.run();

			return { updated: true, updatedAt: now };
		}),

	upsertReview: adminProcedure
		.input(
			z.object({
				contentId: z.string(),
				qualityScore: z.number().int().min(1).max(5).nullable().optional(),
				humorScore: z.number().int().min(1).max(5).nullable().optional(),
				notes: z.string().nullable().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const db = ctx.env.DB;
			const now = Date.now();
			const reviewerUserId = ctx.user.id;

			const existing = await db
				.prepare(
					"SELECT id, quality_score, humor_score FROM party_content_reviews WHERE content_id = ? AND reviewer_user_id = ?",
				)
				.bind(input.contentId, reviewerUserId)
				.first<{
					id: string;
					quality_score: number | null;
					humor_score: number | null;
				}>();

			if (existing) {
				const newQuality =
					input.qualityScore !== undefined
						? input.qualityScore
						: existing.quality_score;
				const newHumor =
					input.humorScore !== undefined
						? input.humorScore
						: existing.humor_score;
				await db
					.prepare(
						`UPDATE party_content_reviews
						 SET quality_score = ?, humor_score = ?, notes = ?, created_at = ?
						 WHERE id = ?`,
					)
					.bind(newQuality, newHumor, input.notes ?? null, now, existing.id)
					.run();

				return { id: existing.id, created: false, updatedAt: now };
			}

			const id = crypto.randomUUID();
			await db
				.prepare(
					`INSERT INTO party_content_reviews (id, content_id, reviewer_user_id, reviewer_type, quality_score, humor_score, notes, created_at)
					 VALUES (?, ?, ?, 'human', ?, ?, ?, ?)`,
				)
				.bind(
					id,
					input.contentId,
					reviewerUserId,
					input.qualityScore ?? null,
					input.humorScore ?? null,
					input.notes ?? null,
					now,
				)
				.run();

			return { id, created: true, createdAt: now };
		}),

	aiReview: adminProcedure
		.input(
			z.object({
				contentIds: z.array(z.string()).min(1).max(100),
				model: z.string().default("google/gemini-2.0-flash-001"),
				dimensions: z
					.array(z.enum(["quality", "humor"]))
					.default(["quality", "humor"]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const apiKey = ctx.env.OPENROUTER_API_KEY;
			if (!apiKey) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "OPENROUTER_API_KEY not configured",
				});
			}

			const db = ctx.env.DB;
			const now = Date.now();
			const botReviewerId = `bot:${input.model}`;

			const placeholders = input.contentIds.map(() => "?").join(",");
			const contentRows = await db
				.prepare(
					`SELECT id, brand_id, content_type, body FROM party_content
					 WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
				)
				.bind(...input.contentIds)
				.all<{
					id: string;
					brand_id: string;
					content_type: string;
					body: string;
				}>();

			const llmModel = createModel({ apiKey, modelOrPreset: input.model });

			let reviewed = 0;
			let skipped = 0;
			const errors: string[] = [];

			const rateQuality = input.dimensions.includes("quality");
			const rateHumor = input.dimensions.includes("humor");

			const dimensionInstructions = [
				rateQuality
					? "quality_score (1-5): 1=unusable garbage, 2=poor, 3=acceptable, 4=good, 5=excellent. Consider: clarity, creativity, appropriateness for party games."
					: null,
				rateHumor
					? "humor_score (1-5): 1=not funny at all, 2=mildly amusing, 3=moderately funny, 4=quite funny, 5=hilarious. Consider: wit, absurdity, party appeal."
					: null,
			]
				.filter(Boolean)
				.join("\n");

			for (const row of contentRows.results ?? []) {
				let parsedBody: Record<string, unknown>;
				try {
					parsedBody = JSON.parse(row.body);
				} catch {
					skipped++;
					continue;
				}

				const contentText = extractItemText(parsedBody, row.content_type);
				if (!contentText) {
					skipped++;
					continue;
				}

				const prompt = `Rate this party game content item.

Content type: ${row.content_type}
Brand: ${row.brand_id}
Content: ${JSON.stringify(parsedBody)}

Rate the following dimensions:
${dimensionInstructions}

Respond with valid JSON only: {"${rateQuality ? "quality_score" : ""}${rateQuality && rateHumor ? '", "' : ""}${rateHumor ? "humor_score" : ""}": number, "reasoning": "brief explanation"}`;

				try {
					const { generateObject } = await import("ai");
					const ratingSchema = z.object({
						...(rateQuality
							? { quality_score: z.number().int().min(1).max(5) }
							: {}),
						...(rateHumor
							? { humor_score: z.number().int().min(1).max(5) }
							: {}),
						reasoning: z.string(),
					});

					const result = await generateObject({
						model: llmModel,
						schema: ratingSchema,
						prompt,
						temperature: 0.3,
					});

					const rating = result.object as {
						quality_score?: number;
						humor_score?: number;
						reasoning?: string;
					};

					const qualityScore = rateQuality
						? (rating.quality_score ?? null)
						: null;
					const humorScore = rateHumor ? (rating.humor_score ?? null) : null;
					const notes = rating.reasoning ?? null;

					const existing = await db
						.prepare(
							"SELECT id FROM party_content_reviews WHERE content_id = ? AND reviewer_user_id = ?",
						)
						.bind(row.id, botReviewerId)
						.first<{ id: string }>();

					if (existing) {
						await db
							.prepare(
								`UPDATE party_content_reviews
								 SET quality_score = ?, humor_score = ?, notes = ?, created_at = ?
								 WHERE id = ?`,
							)
							.bind(qualityScore, humorScore, notes, now, existing.id)
							.run();
					} else {
						const reviewId = crypto.randomUUID();
						await db
							.prepare(
								`INSERT INTO party_content_reviews
								 (id, content_id, reviewer_user_id, reviewer_type, model, quality_score, humor_score, notes, created_at)
								 VALUES (?, ?, ?, 'bot', ?, ?, ?, ?, ?)`,
							)
							.bind(
								reviewId,
								row.id,
								botReviewerId,
								input.model,
								qualityScore,
								humorScore,
								notes,
								now,
							)
							.run();
					}

					reviewed++;
				} catch (e) {
					const msg = e instanceof Error ? e.message : String(e);
					console.error(`[aiReview] ${row.id}: ${msg}`);
					errors.push(`${row.id}: ${msg}`);
				}
			}

			return { reviewed, skipped, errors, botReviewerId };
		}),

	softDelete: adminProcedure
		.input(
			z.object({
				id: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const db = ctx.env.DB;
			const now = Date.now();

			const current = await db
				.prepare("SELECT status FROM party_content WHERE id = ?")
				.bind(input.id)
				.first<{ status: string }>();

			if (!current) {
				throw new Error("Content not found");
			}

			const fromStatus = current.status;
			const toStatus = "retired";

			await db
				.prepare(
					"UPDATE party_content SET deleted_at = ?, updated_at = ? WHERE id = ?",
				)
				.bind(now, now, input.id)
				.run();

			const transitionId = crypto.randomUUID();
			await db
				.prepare(
					`INSERT INTO party_content_status_transitions (id, content_id, from_status, to_status, actor_id, reason, created_at)
					 VALUES (?, ?, ?, ?, ?, ?, ?)`,
				)
				.bind(
					transitionId,
					input.id,
					fromStatus,
					toStatus,
					ctx.user.id,
					"Soft deleted",
					now,
				)
				.run();

			return { deletedAt: now, transitionId };
		}),

	restore: adminProcedure
		.input(
			z.object({
				id: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const db = ctx.env.DB;
			const now = Date.now();

			const current = await db
				.prepare("SELECT status FROM party_content WHERE id = ?")
				.bind(input.id)
				.first<{ status: string }>();

			if (!current) {
				throw new Error("Content not found");
			}

			const fromStatus = current.status;
			const toStatus = "active";

			await db
				.prepare(
					"UPDATE party_content SET deleted_at = NULL, status = ?, updated_at = ? WHERE id = ?",
				)
				.bind(toStatus, now, input.id)
				.run();

			const transitionId = crypto.randomUUID();
			await db
				.prepare(
					`INSERT INTO party_content_status_transitions (id, content_id, from_status, to_status, actor_id, reason, created_at)
					 VALUES (?, ?, ?, ?, ?, ?, ?)`,
				)
				.bind(
					transitionId,
					input.id,
					fromStatus,
					toStatus,
					ctx.user.id,
					"Restored",
					now,
				)
				.run();

			return { restoredAt: now, transitionId };
		}),

	getById: adminProcedure
		.input(
			z.object({
				id: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const db = ctx.env.DB;

			const content = await db
				.prepare(
					`SELECT id, brand_id, content_type, body, category, difficulty, status, source, content_hash, metadata, created_at, updated_at, deleted_at
					 FROM party_content WHERE id = ?`,
				)
				.bind(input.id)
				.first<{
					id: string;
					brand_id: string;
					content_type: string;
					body: string;
					category: string | null;
					difficulty: number | null;
					status: string;
					source: string;
					content_hash: string | null;
					metadata: string | null;
					created_at: number;
					updated_at: number;
					deleted_at: number | null;
				}>();

			if (!content) {
				return null;
			}

			const assetsResult = await db
				.prepare(
					`SELECT id, content_id, r2_key, asset_type, role, mime_type, duration_ms, file_size, created_at
					 FROM party_content_assets WHERE content_id = ? AND deleted_at IS NULL`,
				)
				.bind(input.id)
				.all<{
					id: string;
					content_id: string;
					r2_key: string;
					asset_type: string;
					role: string;
					mime_type: string | null;
					duration_ms: number | null;
					file_size: number | null;
					created_at: number;
				}>();

			const reviewsResult = await db
				.prepare(
					`SELECT id, content_id, reviewer_user_id, quality_score, humor_score, notes, created_at
					 FROM party_content_reviews WHERE content_id = ? ORDER BY created_at DESC`,
				)
				.bind(input.id)
				.all<{
					id: string;
					content_id: string;
					reviewer_user_id: string;
					quality_score: number;
					humor_score: number;
					notes: string | null;
					created_at: number;
				}>();

			return {
				id: content.id,
				brandId: content.brand_id,
				contentType: content.content_type,
				body: content.body,
				category: content.category,
				difficulty: content.difficulty,
				status: content.status,
				source: content.source,
				contentHash: content.content_hash,
				metadata: content.metadata,
				createdAt: content.created_at,
				updatedAt: content.updated_at,
				deletedAt: content.deleted_at,
				assets: (assetsResult.results ?? []).map((a) => ({
					id: a.id,
					contentId: a.content_id,
					r2Key: a.r2_key,
					assetType: a.asset_type,
					role: a.role,
					mimeType: a.mime_type,
					durationMs: a.duration_ms,
					fileSize: a.file_size,
					createdAt: a.created_at,
				})),
				reviews: (reviewsResult.results ?? []).map((r) => ({
					id: r.id,
					contentId: r.content_id,
					reviewerUserId: r.reviewer_user_id,
					qualityScore: r.quality_score,
					humorScore: r.humor_score,
					notes: r.notes,
					createdAt: r.created_at,
				})),
			};
		}),

	statusTransition: adminProcedure
		.input(
			z.object({
				id: z.string(),
				toStatus: z.enum(["draft", "active", "retired"]),
				reason: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const db = ctx.env.DB;
			const now = Date.now();

			const current = await db
				.prepare("SELECT status FROM party_content WHERE id = ?")
				.bind(input.id)
				.first<{ status: string }>();

			if (!current) {
				throw new Error("Content not found");
			}

			const fromStatus = current.status;

			if (fromStatus === input.toStatus) {
				return { transitioned: false, reason: "Already in target status" };
			}

			const transitionId = crypto.randomUUID();
			await db
				.prepare(
					`INSERT INTO party_content_status_transitions (id, content_id, from_status, to_status, actor_id, reason, created_at)
					 VALUES (?, ?, ?, ?, ?, ?, ?)`,
				)
				.bind(
					transitionId,
					input.id,
					fromStatus,
					input.toStatus,
					ctx.user.id,
					input.reason ?? null,
					now,
				)
				.run();

			await db
				.prepare(
					"UPDATE party_content SET status = ?, updated_at = ? WHERE id = ?",
				)
				.bind(input.toStatus, now, input.id)
				.run();

			return {
				transitioned: true,
				transitionId,
				fromStatus,
				toStatus: input.toStatus,
				transitionedAt: now,
			};
		}),

	// ============================================================================
	// Snapshot Pipeline
	// ============================================================================

	publish: adminProcedure
		.input(
			z
				.object({
					metadata: z.string().nullable().optional(),
				})
				.optional(),
		)
		.mutation(async ({ ctx, input }) => {
			const db = ctx.env.DB;
			const now = Date.now();

			const activeContent = await db
				.prepare(
					"SELECT id FROM party_content WHERE status = 'active' AND deleted_at IS NULL",
				)
				.all<{ id: string }>();

			const contentIds = (activeContent.results ?? []).map((r) => r.id);
			const contentCount = contentIds.length;

			if (contentCount === 0) {
				throw new Error("No active content to publish");
			}

			const versionResult = await db
				.prepare(
					"SELECT COALESCE(MAX(version), 0) + 1 as next_version FROM party_content_snapshots",
				)
				.first<{ next_version: number }>();

			const version = versionResult?.next_version ?? 1;
			const snapshotId = crypto.randomUUID();

			await db
				.prepare(
					`INSERT INTO party_content_snapshots (id, version, published_by, published_at, content_count, content_ids, metadata)
					 VALUES (?, ?, ?, ?, ?, ?, ?)`,
				)
				.bind(
					snapshotId,
					version,
					ctx.user.id,
					now,
					contentCount,
					JSON.stringify(contentIds),
					input?.metadata ?? null,
				)
				.run();

			return { snapshotId, version, contentCount, publishedAt: now };
		}),

	getSnapshot: adminProcedure
		.input(
			z.object({
				version: z.number().int().min(1),
			}),
		)
		.query(async ({ ctx, input }) => {
			const db = ctx.env.DB;

			const snapshot = await db
				.prepare(
					"SELECT id, version, published_by, published_at, content_count, content_ids, metadata FROM party_content_snapshots WHERE version = ?",
				)
				.bind(input.version)
				.first<{
					id: string;
					version: number;
					published_by: string;
					published_at: number;
					content_count: number;
					content_ids: string;
					metadata: string | null;
				}>();

			if (!snapshot) {
				return null;
			}

			const contentIds: string[] = JSON.parse(snapshot.content_ids);

			return {
				id: snapshot.id,
				version: snapshot.version,
				publishedBy: snapshot.published_by,
				publishedAt: snapshot.published_at,
				contentCount: snapshot.content_count,
				contentIds,
				metadata: snapshot.metadata,
			};
		}),

	listSnapshots: adminProcedure.query(async ({ ctx }) => {
		const db = ctx.env.DB;

		const result = await db
			.prepare(
				"SELECT id, version, published_by, published_at, content_count FROM party_content_snapshots ORDER BY version DESC",
			)
			.all<{
				id: string;
				version: number;
				published_by: string;
				published_at: number;
				content_count: number;
			}>();

		return (result.results ?? []).map((row) => ({
			id: row.id,
			version: row.version,
			publishedBy: row.published_by,
			publishedAt: row.published_at,
			contentCount: row.content_count,
		}));
	}),

	loadFromSnapshot: adminProcedure
		.input(
			z.object({
				brand: z.enum(["amen", "slopcade"]),
				contentType: z.string(),
				version: z.number().int().min(1).optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const db = ctx.env.DB;

			const snapshotSql = input.version
				? "SELECT version, content_ids FROM party_content_snapshots WHERE version = ?"
				: "SELECT version, content_ids FROM party_content_snapshots ORDER BY version DESC LIMIT 1";
			const snapshotParams = input.version ? [input.version] : [];

			const snapshot = await db
				.prepare(snapshotSql)
				.bind(...snapshotParams)
				.first<{ version: number; content_ids: string }>();

			if (!snapshot) {
				return {
					source: "json" as const,
					version: null,
					items: [] as unknown[],
					count: 0,
				};
			}

			const allIds: string[] = JSON.parse(snapshot.content_ids);
			if (allIds.length === 0) {
				return {
					source: "db" as const,
					version: snapshot.version,
					items: [] as unknown[],
					count: 0,
				};
			}

			const placeholders = allIds.map(() => "?").join(",");
			const result = await db
				.prepare(
					`SELECT body FROM party_content
					 WHERE id IN (${placeholders})
					   AND brand_id = ?
					   AND content_type = ?
					   AND deleted_at IS NULL`,
				)
				.bind(...allIds, input.brand, input.contentType)
				.all<{ body: string }>();

			const items = (result.results ?? []).map(
				(r) => JSON.parse(r.body) as unknown,
			);

			return {
				source: "db" as const,
				version: snapshot.version,
				items,
				count: items.length,
			};
		}),

	generateAudio: adminProcedure
		.input(
			z.object({
				contentIds: z.array(z.string()).min(1).max(50),
				provider: z.enum(["scenario", "elevenlabs"]).default("scenario"),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const db = ctx.env.DB;
			const r2 = ctx.env.ASSETS;

			const generate = createAudioGenerator(
				{
					SCENARIO_API_KEY: ctx.env.SCENARIO_API_KEY,
					SCENARIO_SECRET_API_KEY: ctx.env.SCENARIO_SECRET_API_KEY,
					SCENARIO_API_URL: ctx.env.SCENARIO_API_URL,
					ELEVENLABS_API_KEY: ctx.env.ELEVENLABS_API_KEY,
				},
				input.provider as AudioProvider,
			);

			const placeholders = input.contentIds.map(() => "?").join(",");
			const contentRows = await db
				.prepare(
					`SELECT id, brand_id, content_type, body FROM party_content
					 WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
				)
				.bind(...input.contentIds)
				.all<{
					id: string;
					brand_id: string;
					content_type: string;
					body: string;
				}>();

			let generated = 0;
			let skipped = 0;
			const errors: string[] = [];

			for (const row of contentRows.results ?? []) {
				if (SKIP_VOICE_TYPES.has(row.content_type)) {
					skipped++;
					continue;
				}

				try {
					const result = await generate({
						contentId: row.id,
						brandId: row.brand_id,
						contentType: row.content_type,
						body: row.body,
					});

					if (!result) {
						skipped++;
						continue;
					}

					await r2.put(result.r2Key, result.audioBytes, {
						httpMetadata: { contentType: "audio/mpeg" },
					});

					const assetId = `audio-${row.id}`;
					await db
						.prepare(
							`INSERT OR REPLACE INTO party_content_assets
							 (id, content_id, r2_key, asset_type, role, mime_type, file_size, created_at)
							 VALUES (?, ?, ?, 'audio', 'primary', 'audio/mpeg', ?, ?)`,
						)
						.bind(
							assetId,
							row.id,
							result.r2Key,
							result.audioBytes.byteLength,
							Date.now(),
						)
						.run();

					generated++;
				} catch (e) {
					const msg = e instanceof Error ? e.message : String(e);
					console.error(`[generateAudio] ${row.id}: ${msg}`);
					errors.push(`${row.id}: ${msg}`);
				}
			}

			return { generated, skipped, errors };
		}),

	generateContent: adminProcedure
		.input(
			z.object({
				brandId: z.string(),
				gameType: z.string(),
				count: z.number().int().min(1).max(5000).optional(),
				model: z.string().optional(),
				temperature: z.number().min(0).max(2).optional(),
				batchSize: z.number().int().min(1).max(100).optional(),
				mode: z
					.enum(["fill-to-target", "generate-count"])
					.default("fill-to-target"),
				dryRun: z.boolean().default(false),
				jobId: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const gameConfig = getGameTypeConfig(input.brandId, input.gameType);
			const model = input.model ?? gameConfig.model;
			const temperature = input.temperature ?? gameConfig.temperature;
			const batchSize = input.batchSize ?? gameConfig.batchSize;

			const currentCountResult = await ctx.env.DB.prepare(
				`SELECT COUNT(*) as cnt FROM party_content
				 WHERE brand_id = ? AND content_type = ? AND status = 'active' AND deleted_at IS NULL`,
			)
				.bind(input.brandId, input.gameType)
				.first<{ cnt: number }>();
			const currentCount = currentCountResult?.cnt ?? 0;

			let requestedCount: number;
			if (input.mode === "fill-to-target") {
				const target = input.count ?? gameConfig.targetCount;
				requestedCount = Math.max(target - currentCount, 0);
				if (requestedCount === 0) {
					return {
						jobId: input.jobId ?? crypto.randomUUID(),
						status: "completed" as const,
						requestedCount: 0,
						currentCount,
						targetCount: target,
						generated: 0,
						inserted: 0,
						duplicatesSkipped: 0,
						moderationRejected: 0,
						done: true,
						message: `Target ${target} already met (current: ${currentCount})`,
					};
				}
			} else {
				requestedCount = input.count ?? batchSize;
			}

			const thisBatchSize = Math.min(batchSize, requestedCount);
			const jobId = input.jobId ?? crypto.randomUUID();
			const now = Date.now();

			if (!input.jobId) {
				await ctx.env.DB.prepare(
					`INSERT INTO party_content_generation_jobs
					 (id, brand_id, game_type, status, mode, requested_count, target_count, model, temperature, batch_size, started_at, created_by)
					 VALUES (?, ?, ?, 'running', ?, ?, ?, ?, ?, ?, ?, ?)`,
				)
					.bind(
						jobId,
						input.brandId,
						input.gameType,
						input.mode,
						requestedCount,
						input.mode === "fill-to-target"
							? (input.count ?? gameConfig.targetCount)
							: null,
						model,
						temperature,
						batchSize,
						now,
						ctx.user.id,
					)
					.run();
			}

			if (input.dryRun) {
				return {
					jobId,
					status: "completed" as const,
					requestedCount,
					currentCount,
					targetCount:
						input.mode === "fill-to-target"
							? (input.count ?? gameConfig.targetCount)
							: null,
					generated: 0,
					inserted: 0,
					duplicatesSkipped: 0,
					moderationRejected: 0,
					done: true,
					dryRun: true,
					message: `Would generate ${requestedCount} items (batch size ${thisBatchSize})`,
				};
			}

			const apiKey = ctx.env.OPENROUTER_API_KEY;
			if (!apiKey) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "OPENROUTER_API_KEY not configured",
				});
			}

			const config = composeGameTypeConfig(input.brandId, input.gameType);
			const prompt = config.promptTemplate(thisBatchSize);

			let items: Array<Record<string, unknown>>;
			try {
				const result = await generateItems({
					schema: config.schema,
					system: config.system,
					prompt,
					apiKey,
					model,
					temperature,
				});
				items = (result as { items: Array<Record<string, unknown>> }).items;
			} catch (e) {
				const errorMsg = e instanceof Error ? e.message : String(e);
				await ctx.env.DB.prepare(
					`UPDATE party_content_generation_jobs SET errors = ?, status = 'failed', completed_at = ? WHERE id = ?`,
				)
					.bind(errorMsg, Date.now(), jobId)
					.run();
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Generation failed: ${errorMsg}`,
				});
			}

			let inserted = 0;
			let duplicatesSkipped = 0;
			let moderationRejected = 0;

			for (const item of items.slice(0, thisBatchSize)) {
				const text = extractItemText(item, input.gameType);

				if (containsBlockedKeyword(text).blocked) {
					moderationRejected++;
					continue;
				}

				const body = JSON.stringify(item);
				const contentHash = await computeGenerationHash(text);

				const existing = await ctx.env.DB.prepare(
					"SELECT id FROM party_content WHERE content_hash = ? AND brand_id = ?",
				)
					.bind(contentHash, input.brandId)
					.first();

				if (existing) {
					duplicatesSkipped++;
					continue;
				}

				const contentId = crypto.randomUUID();
				const category =
					typeof item.category === "string" ? item.category : null;

				await ctx.env.DB.prepare(
					`INSERT INTO party_content (id, brand_id, content_type, body, category, status, source, content_hash, created_at, updated_at)
					 VALUES (?, ?, ?, ?, ?, 'active', 'ai', ?, ?, ?)`,
				)
					.bind(
						contentId,
						input.brandId,
						input.gameType,
						body,
						category,
						contentHash,
						now,
						now,
					)
					.run();

				inserted++;
			}

			const generatedCount = items.length;
			await ctx.env.DB.prepare(
				`UPDATE party_content_generation_jobs
				 SET generated = generated + ?, inserted = inserted + ?,
				     duplicates_skipped = duplicates_skipped + ?, moderation_rejected = moderation_rejected + ?
				 WHERE id = ?`,
			)
				.bind(
					generatedCount,
					inserted,
					duplicatesSkipped,
					moderationRejected,
					jobId,
				)
				.run();

			const updatedJob = await ctx.env.DB.prepare(
				"SELECT inserted, requested_count FROM party_content_generation_jobs WHERE id = ?",
			)
				.bind(jobId)
				.first<{ inserted: number; requested_count: number }>();

			const totalInserted = updatedJob?.inserted ?? inserted;
			const totalRequested = updatedJob?.requested_count ?? requestedCount;
			const done =
				totalInserted >= totalRequested || generatedCount < thisBatchSize;

			if (done) {
				await ctx.env.DB.prepare(
					"UPDATE party_content_generation_jobs SET status = 'completed', completed_at = ? WHERE id = ?",
				)
					.bind(Date.now(), jobId)
					.run();
			}

			return {
				jobId,
				status: done ? ("completed" as const) : ("running" as const),
				requestedCount: totalRequested,
				currentCount: currentCount + totalInserted,
				generated: generatedCount,
				inserted,
				duplicatesSkipped,
				moderationRejected,
				totalInserted,
				remaining: Math.max(totalRequested - totalInserted, 0),
				done,
			};
		}),

	getGenerationJob: adminProcedure
		.input(z.object({ jobId: z.string() }))
		.query(async ({ ctx, input }) => {
			const job = await ctx.env.DB.prepare(
				`SELECT id, brand_id, game_type, status, mode, requested_count, target_count,
				        model, temperature, batch_size, generated, inserted,
				        duplicates_skipped, moderation_rejected, errors,
				        started_at, completed_at, created_by
				 FROM party_content_generation_jobs WHERE id = ?`,
			)
				.bind(input.jobId)
				.first();

			if (!job) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Generation job not found",
				});
			}

			return {
				id: job.id as string,
				brandId: job.brand_id as string,
				gameType: job.game_type as string,
				status: job.status as string,
				mode: job.mode as string,
				requestedCount: job.requested_count as number,
				targetCount: job.target_count as number | null,
				model: job.model as string,
				temperature: job.temperature as number,
				batchSize: job.batch_size as number,
				generated: job.generated as number,
				inserted: job.inserted as number,
				duplicatesSkipped: job.duplicates_skipped as number,
				moderationRejected: job.moderation_rejected as number,
				errors: job.errors as string | null,
				startedAt: job.started_at as number,
				completedAt: job.completed_at as number | null,
				createdBy: job.created_by as string | null,
			};
		}),

	listGenerationJobs: adminProcedure
		.input(
			z.object({
				brandId: z.string().optional(),
				gameType: z.string().optional(),
				status: z
					.enum(["running", "completed", "failed", "cancelled"])
					.optional(),
				limit: z.number().int().min(1).max(100).default(20),
			}),
		)
		.query(async ({ ctx, input }) => {
			const conditions: string[] = [];
			const params: unknown[] = [];

			if (input.brandId) {
				conditions.push("brand_id = ?");
				params.push(input.brandId);
			}
			if (input.gameType) {
				conditions.push("game_type = ?");
				params.push(input.gameType);
			}
			if (input.status) {
				conditions.push("status = ?");
				params.push(input.status);
			}

			const where =
				conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

			const result = await ctx.env.DB.prepare(
				`SELECT id, brand_id, game_type, status, mode, requested_count, target_count,
				        model, generated, inserted, duplicates_skipped, moderation_rejected,
				        started_at, completed_at
				 FROM party_content_generation_jobs ${where}
				 ORDER BY started_at DESC
				 LIMIT ?`,
			)
				.bind(...params, input.limit)
				.all();

			return (result.results ?? []).map((row: Record<string, unknown>) => ({
				id: row.id as string,
				brandId: row.brand_id as string,
				gameType: row.game_type as string,
				status: row.status as string,
				mode: row.mode as string,
				requestedCount: row.requested_count as number,
				targetCount: row.target_count as number | null,
				model: row.model as string,
				generated: row.generated as number,
				inserted: row.inserted as number,
				duplicatesSkipped: row.duplicates_skipped as number,
				moderationRejected: row.moderation_rejected as number,
				startedAt: row.started_at as number,
				completedAt: row.completed_at as number | null,
			}));
		}),

	listBrandGameTypes: adminProcedure
		.input(z.object({ brandId: z.string() }))
		.query(({ input }) => {
			const config = getBrandContentConfig(input.brandId);
			return Object.entries(config.gameTypes).map(([gameType, cfg]) => ({
				gameType,
				targetCount: cfg.targetCount,
				model: cfg.model,
				temperature: cfg.temperature,
				batchSize: cfg.batchSize,
			}));
		}),

	backfillAudioAssets: adminProcedure
		.input(
			z.object({
				brand: z.enum(["amen", "slopcade"]).optional(),
				contentType: z.string().optional(),
				dryRun: z.boolean().default(false),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const db = ctx.env.DB;
			const r2 = ctx.env.ASSETS;
			const batchSize = 50;
			const skipTypes = Array.from(SKIP_VOICE_TYPES);
			const skipPlaceholders = skipTypes.map(() => "?").join(",");
			const conditions: string[] = [
				"source = 'imported'",
				"deleted_at IS NULL",
				`content_type NOT IN (${skipPlaceholders})`,
			];
			const params: unknown[] = [...skipTypes];

			if (input.brand) {
				conditions.push("brand_id = ?");
				params.push(input.brand);
			}
			if (input.contentType) {
				conditions.push("content_type = ?");
				params.push(input.contentType);
			}

			const where =
				conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

			let offset = 0;
			let found = 0;
			let alreadyLinked = 0;
			let linked = 0;
			let notInR2 = 0;

			while (true) {
				const rows = await db
					.prepare(
						`SELECT id, brand_id, content_type FROM party_content
						 ${where}
						 ORDER BY id
						 LIMIT ? OFFSET ?`,
					)
					.bind(...params, batchSize, offset)
					.all<{
						id: string;
						brand_id: string;
						content_type: string;
					}>();

				const results = rows.results ?? [];
				if (results.length === 0) {
					break;
				}

				for (const row of results) {
					found++;
					const existing = await db
						.prepare(
							"SELECT id FROM party_content_assets WHERE content_id = ? AND asset_type = 'audio' AND deleted_at IS NULL",
						)
						.bind(row.id)
						.first<{ id: string }>();

					if (existing) {
						alreadyLinked++;
						continue;
					}

					const r2Key = buildAudioR2Key(
						row.brand_id as Brand,
						row.content_type as ContentType,
						row.id,
					);
					const object = await r2.head(r2Key);
					if (!object) {
						notInR2++;
						continue;
					}

					linked++;
					if (!input.dryRun) {
						const assetId = `audio-${row.id}`;
						await db
							.prepare(
								`INSERT OR IGNORE INTO party_content_assets
								 (id, content_id, r2_key, asset_type, role, mime_type, created_at)
								 VALUES (?, ?, ?, 'audio', 'primary', 'audio/mpeg', ?)`,
							)
							.bind(assetId, row.id, r2Key, Date.now())
							.run();
					}
				}

				if (results.length < batchSize) {
					break;
				}

				offset += results.length;
			}

			return {
				found,
				alreadyLinked,
				linked,
				notInR2,
				dryRun: input.dryRun,
			};
		}),
});
