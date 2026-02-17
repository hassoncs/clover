import { z } from "zod";

export const BibleQuipCategorySchema = z.enum([
	"Church-Life Situations",
	"Bible Character + Modern Mashup",
	"Proverbs for People Who _____",
	"Fake Biblical Twist Titles",
	"Best/Worst/Most Surprising",
	"What [Bible Character] Would Say If _____",
]);
export type BibleQuipCategory = z.infer<typeof BibleQuipCategorySchema>;

export const BibleQuipPromptSchema = z.object({
	id: z.string(),
	text: z.string(),
	category: BibleQuipCategorySchema,
	scriptureContext: z.string().optional(),
});
export type BibleQuipPrompt = z.infer<typeof BibleQuipPromptSchema>;
