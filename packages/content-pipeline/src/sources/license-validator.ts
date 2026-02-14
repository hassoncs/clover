import { z } from "zod";
import { SPDX_LICENSE } from "../types/sources.js";

const APPROVED_LICENSES = new Set<string>([
	SPDX_LICENSE.CC0_1_0,
	SPDX_LICENSE.CC_BY_4_0,
	SPDX_LICENSE.CC_BY_SA_4_0,
	SPDX_LICENSE.PUBLIC_DOMAIN,
	SPDX_LICENSE.PROPRIETARY_AI,
]);

const REJECTED_LICENSE_PATTERNS = [
	/CC-BY-NC/i,
	/CC-BY-ND/i,
	/NonCommercial/i,
	/NoDerivatives/i,
];

export const LicenseValidationResultSchema = z.object({
	valid: z.boolean(),
	license: z.string(),
	reason: z.string().optional(),
});

export type LicenseValidationResult = z.infer<
	typeof LicenseValidationResultSchema
>;

export function validateLicense(license: string): LicenseValidationResult {
	if (APPROVED_LICENSES.has(license)) {
		return { valid: true, license };
	}

	for (const pattern of REJECTED_LICENSE_PATTERNS) {
		if (pattern.test(license)) {
			return {
				valid: false,
				license,
				reason: "License prohibits commercial use or derivatives",
			};
		}
	}

	return {
		valid: false,
		license,
		reason: "License not in approved list",
	};
}

export function isLicenseApproved(license: string): boolean {
	return validateLicense(license).valid;
}

export function getApprovedLicenses(): string[] {
	return Array.from(APPROVED_LICENSES);
}
