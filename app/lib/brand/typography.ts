import { activeBrand } from "./index";

type FontRole = "heading" | "body";

/**
 * Returns the font family name for the given role based on the active brand.
 *
 * For Amen brand: heading = "Lora", body = "Inter"
 * For Slopcade: heading = "Inter", body = "Inter"
 */
export function getBrandFont(role: FontRole): string {
	const fontFamily = activeBrand.theme.fontFamily;
	if (!fontFamily) return "Inter";

	switch (role) {
		case "heading":
			return fontFamily.heading ?? "Inter";
		case "body":
			return fontFamily.body ?? "Inter";
		default:
			return "Inter";
	}
}

/**
 * React hook version of getBrandFont.
 * Returns the font family for the given role.
 */
export function useBrandFont(role: FontRole = "body"): string {
	return getBrandFont(role);
}
