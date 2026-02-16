import {
	type BrandId,
	type BrandManifest,
	getBrandManifest,
} from "@slopcade/brands";
import Constants from "expo-constants";

/**
 * Active brand manifest for the current app build.
 *
 * Resolved from the BRAND_ID build-time env var via app.config.ts → extra.brandId.
 * Falls back to 'slopcade' if not set.
 */
export const activeBrand: BrandManifest = getBrandManifest(
	(Constants.expoConfig?.extra as { brandId?: string } | undefined)?.brandId ??
		"slopcade",
);

/**
 * Convenience: the active brand ID
 */
export const activeBrandId: BrandId = activeBrand.id;

/**
 * Check if a feature is enabled for the current brand
 */
export function isBrandFeatureEnabled(
	feature: keyof BrandManifest["features"],
): boolean {
	return activeBrand.features[feature];
}
