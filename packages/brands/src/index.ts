/**
 * @slopcade/brands
 *
 * Brand manifest system - single source of truth for all brand configuration
 * across the Slopcade multi-brand platform.
 */

import { amenManifest } from "./manifests/amen";
import { slopcadeManifest } from "./manifests/slopcade";
import type { BrandId, BrandManifest } from "./types";

// Re-export content policy
export {
	AMEN_SYSTEM_PREFIX,
	GREEN_ZONE_TOPICS,
	RED_ZONE_TOPICS,
	YELLOW_ZONE_TOPICS,
} from "./content-policy";
// Re-export all types
export type {
	BrandContentPolicy,
	BrandFeatures,
	BrandId,
	BrandManifest,
	BrandMonetization,
	BrandTheme,
} from "./types";

/**
 * All valid brand IDs
 */
export const BRAND_IDS: readonly BrandId[] = ["slopcade", "amen"] as const;

/**
 * Default brand ID for the platform
 */
export const DEFAULT_BRAND_ID: BrandId = "slopcade";

/**
 * Brand manifest registry
 */
const manifestRegistry: Record<BrandId, BrandManifest> = {
	slopcade: slopcadeManifest,
	amen: amenManifest,
};

/**
 * Type guard to check if a string is a valid BrandId
 */
export function isValidBrandId(id: string): id is BrandId {
	return BRAND_IDS.includes(id as BrandId);
}

/**
 * Get a brand manifest by ID
 *
 * @throws Error if the brand ID is invalid
 */
export function getBrandManifest(brandId: string): BrandManifest {
	if (!isValidBrandId(brandId)) {
		throw new Error(
			`Invalid brand ID: "${brandId}". Valid IDs are: ${BRAND_IDS.join(", ")}`,
		);
	}
	return manifestRegistry[brandId];
}

/**
 * Get all brand manifests
 */
export function getAllBrandManifests(): Record<BrandId, BrandManifest> {
	return { ...manifestRegistry };
}
