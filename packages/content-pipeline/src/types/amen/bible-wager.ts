import { z } from "zod";

export const BibleWagerQuestionSchema = z.object({
	id: z.string(),
	question: z.string(),
	answer: z.number(),
	unit: z.string().optional(),
	category: z.string(),
	scriptureRef: z.string().optional(),
	funFact: z.string().optional(),
});
export type BibleWagerQuestion = z.infer<typeof BibleWagerQuestionSchema>;
