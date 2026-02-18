import { z } from "zod";

export const BrandThemeSchema = z.object({
	id: z.string(),
	name: z.string(),
	tone: z.string(),
	audience: z.string(),

	voice: z.object({
		systemPrefix: z.string(),
		comedyStyle: z.string(),
		doNotTouch: z.array(z.string()),
		encouraged: z.array(z.string()),
	}),

	categories: z.record(z.array(z.string())).optional(),
	factualDomains: z.array(z.string()).optional(),
});

export type BrandTheme = z.infer<typeof BrandThemeSchema>;
