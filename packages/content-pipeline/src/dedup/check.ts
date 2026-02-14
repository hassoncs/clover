import type { ContentItemRow, PipelineDB } from "../db/index.js";

export interface DuplicateCheckResult {
	isDuplicate: boolean;
	existingItemId?: string;
}

export function checkDuplicate(
	db: PipelineDB,
	contentHash: string,
): DuplicateCheckResult {
	const existing = db.getContentItemByHash(contentHash);

	if (existing) {
		return {
			isDuplicate: true,
			existingItemId: existing.id,
		};
	}

	return { isDuplicate: false };
}
