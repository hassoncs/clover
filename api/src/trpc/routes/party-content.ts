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

			const reviewJoin = `
				LEFT JOIN (
					SELECT content_id, quality_score, humor_score, notes, reviewer_user_id, created_at,
						ROW_NUMBER() OVER (PARTITION BY content_id ORDER BY created_at DESC) as rn
					FROM party_content_reviews
				) lr ON lr.content_id = pc.id AND lr.rn = 1
			`;

			if (hasReview === true) {
				conditions.push("lr.content_id IS NOT NULL");
			} else if (hasReview === false) {
				conditions.push("lr.content_id IS NULL");
			}
			if (minQuality !== undefined) {
				conditions.push("lr.quality_score >= ?");
				params.push(minQuality);
			}
			if (minHumor !== undefined) {
				conditions.push("lr.humor_score >= ?");
				params.push(minHumor);
			}

			const whereClause =
				conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

			const sortColumn =
				sortBy === "quality_score" || sortBy === "humor_score"
					? `lr.${sortBy}`
					: `pc.${sortBy}`;

			const countSql = `
				SELECT COUNT(DISTINCT pc.id) as total
				FROM party_content pc
				${reviewJoin}
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
					lr.quality_score as latest_quality_score, lr.humor_score as latest_humor_score,
					lr.notes as latest_notes, lr.reviewer_user_id as latest_reviewer_id, lr.created_at as latest_review_created_at
				FROM party_content pc
				${reviewJoin}
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
					latest_quality_score: number | null;
					latest_humor_score: number | null;
					latest_notes: string | null;
					latest_reviewer_id: string | null;
					latest_review_created_at: number | null;
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
				latestReview:
					row.latest_quality_score !== null
						? {
								qualityScore: row.latest_quality_score,
								humorScore: row.latest_humor_score,
								notes: row.latest_notes,
								reviewerUserId: row.latest_reviewer_id,
								createdAt: row.latest_review_created_at,
							}
						: null,
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
				qualityScore: z.number().int().min(1).max(5),
				humorScore: z.number().int().min(1).max(5),
				notes: z.string().nullable().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const db = ctx.env.DB;
			const now = Date.now();
			const reviewerUserId = ctx.user.id;

			const existing = await db
				.prepare(
					"SELECT id FROM party_content_reviews WHERE content_id = ? AND reviewer_user_id = ?",
				)
				.bind(input.contentId, reviewerUserId)
				.first<{ id: string }>();

			if (existing) {
				await db
					.prepare(
						`UPDATE party_content_reviews
						 SET quality_score = ?, humor_score = ?, notes = ?, created_at = ?
						 WHERE id = ?`,
					)
					.bind(
						input.qualityScore,
						input.humorScore,
						input.notes ?? null,
						now,
						existing.id,
					)
					.run();

				return { id: existing.id, created: false, updatedAt: now };
			}

			const id = crypto.randomUUID();
			await db
				.prepare(
					`INSERT INTO party_content_reviews (id, content_id, reviewer_user_id, quality_score, humor_score, notes, created_at)
					 VALUES (?, ?, ?, ?, ?, ?, ?)`,
				)
				.bind(
					id,
					input.contentId,
					reviewerUserId,
					input.qualityScore,
					input.humorScore,
					input.notes ?? null,
					now,
				)
				.run();

			return { id, created: true, createdAt: now };
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
});
