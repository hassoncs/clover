import { z } from "zod";
import { BibleTriviaCategorySchema } from "./bible-trivia.js";

export const BibleQuipPromptSchema = z.object({
	id: z.string(),
	text: z.string(),
	category: BibleTriviaCategorySchema,
	scriptureContext: z.string().optional(),
});
export type BibleQuipPrompt = z.infer<typeof BibleQuipPromptSchema>;
