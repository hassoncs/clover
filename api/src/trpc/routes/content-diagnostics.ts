import { z } from "zod";
import { adminProcedure, router } from "@/trpc/index";

const CONTENT_PREFIX = "audio/voice/";
const CONTENT_SUFFIX = ".mp3";

interface DriftReportItem {
	contentId: string;
	r2Key: string;
	brand?: string;
	contentType?: string;
}

interface MissingReviewItem {
	contentId: string;
	createdAt: number;
	daysSinceCreation: number;
	brand?: string;
}

export interface ContentDiagnosticsResult {
	missingInR2: DriftReportItem[];
	orphanedInR2: DriftReportItem[];
	missingReviews: MissingReviewItem[];
	summary: {
		missingR2Count: number;
		orphanCount: number;
		missingReviewCount: number;
	};
}

async function listR2Objects(
	assets: R2Bucket,
	prefix: string,
): Promise<string[]> {
	const keys: string[] = [];
	let cursor: string | undefined;

	do {
		const listResult = await assets.list({
			prefix,
			cursor,
			limit: 1000,
		});
		for (const obj of listResult.objects) {
			keys.push(obj.key);
		}
		cursor = listResult.truncated
			? (listResult.cursor ?? undefined)
			: undefined;
	} while (cursor !== undefined);

	return keys;
}

function parseR2ContentKey(key: string): {
	brand: string;
	contentType: string;
	id: string;
} | null {
	// Pattern: audio/voice/{brand}/content/{contentType}/{id}.mp3
	const prefix = CONTENT_PREFIX;
	const suffix = CONTENT_SUFFIX;

	if (!key.startsWith(prefix) || !key.endsWith(suffix)) {
		return null;
	}

	const withoutPrefix = key.slice(prefix.length);
	const withoutSuffix = withoutPrefix.slice(0, -suffix.length);

	// {brand}/content/{contentType}/{id}
	const parts = withoutSuffix.split("/");
	if (parts.length !== 3) {
		return null;
	}

	const [brand, contentWord, id] = parts;
	if (contentWord !== "content") {
		return null;
	}

	return { brand, contentType: id.split("-")[0], id };
}

async function getDbContentAssets(
	db: D1Database,
	brand?: string,
): Promise<Set<string>> {
	const assets = new Set<string>();

	try {
		// Query for voice content assets - will fail gracefully if table doesn't exist
		let query = "SELECT id, brand, audio_key FROM voice_content WHERE 1=1";
		const params: (string | number)[] = [];

		if (brand) {
			query += " AND brand = ?";
			params.push(brand);
		}

		const result = await db
			.prepare(query)
			.bind(...params)
			.all<{
				id: string;
				brand: string;
				audio_key: string;
			}>();

		if (result.results) {
			for (const row of result.results) {
				assets.add(row.audio_key);
			}
		}
	} catch {
		// Table doesn't exist yet - return empty set
	}

	return assets;
}

async function getDbContentMissingReviews(
	db: D1Database,
	daysThreshold: number,
	brand?: string,
): Promise<MissingReviewItem[]> {
	const items: MissingReviewItem[] = [];
	const now = Date.now();
	const thresholdMs = daysThreshold * 24 * 60 * 60 * 1000;
	const thresholdTime = now - thresholdMs;

	try {
		// Query for content that's active but hasn't been reviewed
		// Looks for content created before threshold without review_metadata
		let query = `
			SELECT id, brand, created_at 
			FROM voice_content 
			WHERE status = 'active' 
			AND (review_status IS NULL OR review_status = 'pending')
			AND created_at < ?
		`;
		const params: (string | number)[] = [thresholdTime];

		if (brand) {
			query += " AND brand = ?";
			params.push(brand);
		}

		const result = await db
			.prepare(query)
			.bind(...params)
			.all<{
				id: string;
				brand: string;
				created_at: number;
			}>();

		if (result.results) {
			for (const row of result.results) {
				const daysSinceCreation = Math.floor(
					(now - row.created_at) / (24 * 60 * 60 * 1000),
				);
				items.push({
					contentId: row.id,
					createdAt: row.created_at,
					daysSinceCreation,
					brand: row.brand,
				});
			}
		}
	} catch {
		// Table doesn't exist yet - return empty array
	}

	return items;
}

export const contentDiagnosticsRouter = router({
	checkDrift: adminProcedure
		.input(
			z.object({
				brand: z
					.string()
					.optional()
					.describe(
						"Brand ID to check (e.g., 'amen'). If omitted, checks all brands.",
					),
				daysWithoutReview: z
					.number()
					.default(7)
					.describe(
						"Number of days after which content is considered missing review",
					),
			}),
		)
		.query(async ({ ctx, input }): Promise<ContentDiagnosticsResult> => {
			const { DB, ASSETS } = ctx.env;
			const brand = input.brand;
			const daysWithoutReview = input.daysWithoutReview;

			// Build prefix for listing R2 objects
			const r2Prefix = brand
				? `${CONTENT_PREFIX}${brand}/content/`
				: `${CONTENT_PREFIX}`;

			// Get all R2 objects under the content prefix
			const r2Keys = await listR2Objects(ASSETS, r2Prefix);

			// Parse R2 keys to extract content info
			const r2ContentMap = new Map<string, DriftReportItem>();
			const r2KeySet = new Set<string>();

			for (const key of r2Keys) {
				const parsed = parseR2ContentKey(key);
				if (parsed) {
					// Only include keys matching the brand filter
					if (!brand || parsed.brand === brand) {
						r2KeySet.add(key);
						r2ContentMap.set(key, {
							contentId: parsed.id,
							r2Key: key,
							brand: parsed.brand,
							contentType: parsed.contentType,
						});
					}
				}
			}

			// Get DB content assets
			const dbAssetKeys = await getDbContentAssets(DB, brand);

			// Find missing in R2: DB has record but R2 object doesn't exist
			const missingInR2: DriftReportItem[] = [];
			for (const dbKey of dbAssetKeys) {
				if (!r2KeySet.has(dbKey)) {
					const parsed = parseR2ContentKey(dbKey);
					missingInR2.push({
						contentId: parsed?.id ?? dbKey,
						r2Key: dbKey,
						brand: parsed?.brand,
						contentType: parsed?.contentType,
					});
				}
			}

			// Find orphaned in R2: R2 object exists but no DB record
			const orphanedInR2: DriftReportItem[] = [];
			for (const r2Key of r2KeySet) {
				if (!dbAssetKeys.has(r2Key)) {
					const item = r2ContentMap.get(r2Key);
					if (item) {
						orphanedInR2.push(item);
					}
				}
			}

			// Find content missing review
			const missingReviews = await getDbContentMissingReviews(
				DB,
				daysWithoutReview,
				brand,
			);

			return {
				missingInR2,
				orphanedInR2,
				missingReviews,
				summary: {
					missingR2Count: missingInR2.length,
					orphanCount: orphanedInR2.length,
					missingReviewCount: missingReviews.length,
				},
			};
		}),
});
