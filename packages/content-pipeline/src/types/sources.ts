import { z } from "zod";

/**
 * SPDX license identifiers for approved licenses
 */
export const SPDX_LICENSE = {
	CC0_1_0: "CC0-1.0",
	CC_BY_4_0: "CC-BY-4.0",
	CC_BY_SA_4_0: "CC-BY-SA-4.0",
	MIT: "MIT",
	PUBLIC_DOMAIN: "Public Domain",
	PROPRIETARY_AI: "Proprietary-AI",
} as const;

export type SpdxLicense = (typeof SPDX_LICENSE)[keyof typeof SPDX_LICENSE];

export const SourceSchema = z.object({
	id: z.string(),
	name: z.string(),
	url: z.string().url(),
	license: z.string(),
	description: z.string(),
	attributionTemplate: z.string(),
});

export type Source = z.infer<typeof SourceSchema>;
