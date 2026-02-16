import { z } from "zod";
import { BibleTriviaCategorySchema } from "./bible-trivia.js";

export const BibleFibbageQuestionSchema = z.object({
	id: z.string(),
	question: z.string(),
	answer: z.string(),
	category: BibleTriviaCategorySchema,
	scriptureRef: z.string(),
	alternateSpellings: z.array(z.string()).optional(),
});
export type BibleFibbageQuestion = z.infer<typeof BibleFibbageQuestionSchema>;
