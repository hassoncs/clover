import { z } from "zod";

export const BibleRankingCategorySchema = z.enum([
	"Biblical What-Ifs",
	"Church Life",
	"Modern Faith",
	"Bible Characters",
]);
export type BibleRankingCategory = z.infer<typeof BibleRankingCategorySchema>;

export const BibleRankingPromptSchema = z.object({
	id: z.string(),
	topic: z.string(),
	items: z.array(z.string()).min(4).max(8),
	category: BibleRankingCategorySchema,
});
export type BibleRankingPrompt = z.infer<typeof BibleRankingPromptSchema>;
