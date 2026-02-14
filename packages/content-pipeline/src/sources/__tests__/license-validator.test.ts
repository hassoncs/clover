import { describe, expect, it } from "vitest";
import { SPDX_LICENSE } from "../../types/sources.js";
import {
	getApprovedLicenses,
	isLicenseApproved,
	validateLicense,
} from "../license-validator.js";

describe("license-validator", () => {
	describe("validateLicense", () => {
		it("accepts CC0-1.0", () => {
			const result = validateLicense(SPDX_LICENSE.CC0_1_0);
			expect(result.valid).toBe(true);
			expect(result.license).toBe(SPDX_LICENSE.CC0_1_0);
		});

		it("accepts CC-BY-4.0", () => {
			const result = validateLicense(SPDX_LICENSE.CC_BY_4_0);
			expect(result.valid).toBe(true);
			expect(result.license).toBe(SPDX_LICENSE.CC_BY_4_0);
		});

		it("accepts CC-BY-SA-4.0", () => {
			const result = validateLicense(SPDX_LICENSE.CC_BY_SA_4_0);
			expect(result.valid).toBe(true);
			expect(result.license).toBe(SPDX_LICENSE.CC_BY_SA_4_0);
		});

		it("accepts Public Domain", () => {
			const result = validateLicense(SPDX_LICENSE.PUBLIC_DOMAIN);
			expect(result.valid).toBe(true);
			expect(result.license).toBe(SPDX_LICENSE.PUBLIC_DOMAIN);
		});

		it("accepts Proprietary-AI", () => {
			const result = validateLicense(SPDX_LICENSE.PROPRIETARY_AI);
			expect(result.valid).toBe(true);
			expect(result.license).toBe(SPDX_LICENSE.PROPRIETARY_AI);
		});

		it("rejects CC-BY-NC-4.0", () => {
			const result = validateLicense("CC-BY-NC-4.0");
			expect(result.valid).toBe(false);
			expect(result.reason).toContain("commercial");
		});

		it("rejects CC-BY-NC-SA-4.0", () => {
			const result = validateLicense("CC-BY-NC-SA-4.0");
			expect(result.valid).toBe(false);
			expect(result.reason).toContain("commercial");
		});

		it("rejects CC-BY-ND-4.0", () => {
			const result = validateLicense("CC-BY-ND-4.0");
			expect(result.valid).toBe(false);
			expect(result.reason).toContain("derivatives");
		});

		it("rejects unknown license", () => {
			const result = validateLicense("MIT");
			expect(result.valid).toBe(false);
			expect(result.reason).toContain("not in approved list");
		});

		it("rejects license with NonCommercial in name", () => {
			const result = validateLicense("Custom-NonCommercial-License");
			expect(result.valid).toBe(false);
			expect(result.reason).toContain("commercial");
		});
	});

	describe("isLicenseApproved", () => {
		it("returns true for approved licenses", () => {
			expect(isLicenseApproved(SPDX_LICENSE.CC0_1_0)).toBe(true);
			expect(isLicenseApproved(SPDX_LICENSE.CC_BY_4_0)).toBe(true);
			expect(isLicenseApproved(SPDX_LICENSE.CC_BY_SA_4_0)).toBe(true);
			expect(isLicenseApproved(SPDX_LICENSE.PUBLIC_DOMAIN)).toBe(true);
			expect(isLicenseApproved(SPDX_LICENSE.PROPRIETARY_AI)).toBe(true);
		});

		it("returns false for non-commercial licenses", () => {
			expect(isLicenseApproved("CC-BY-NC-4.0")).toBe(false);
			expect(isLicenseApproved("CC-BY-NC-SA-4.0")).toBe(false);
		});

		it("returns false for unknown licenses", () => {
			expect(isLicenseApproved("MIT")).toBe(false);
			expect(isLicenseApproved("GPL-3.0")).toBe(false);
		});
	});

	describe("getApprovedLicenses", () => {
		it("returns all approved licenses", () => {
			const licenses = getApprovedLicenses();
			expect(licenses).toContain(SPDX_LICENSE.CC0_1_0);
			expect(licenses).toContain(SPDX_LICENSE.CC_BY_4_0);
			expect(licenses).toContain(SPDX_LICENSE.CC_BY_SA_4_0);
			expect(licenses).toContain(SPDX_LICENSE.PUBLIC_DOMAIN);
			expect(licenses).toContain(SPDX_LICENSE.PROPRIETARY_AI);
			expect(licenses).toHaveLength(5);
		});
	});
});
