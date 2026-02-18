import type { BrandTheme } from "../types/brand-theme.js";
import { amenBrand } from "./amen.js";
import { slopcadeBrand } from "./slopcade.js";

const brands: Record<string, BrandTheme> = {
	amen: amenBrand,
	slopcade: slopcadeBrand,
};

export function getBrandTheme(brandId: string): BrandTheme {
	const brand = brands[brandId];
	if (!brand) {
		throw new Error(
			`Unknown brand: ${brandId}. Available: ${Object.keys(brands).join(", ")}`,
		);
	}
	return brand;
}

export function listBrands(): string[] {
	return Object.keys(brands);
}

export { amenBrand, slopcadeBrand };
