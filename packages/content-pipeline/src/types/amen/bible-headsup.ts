import { z } from "zod";

export const BibleHeadsUpDeckSchema = z.object({
	id: z.string(),
	name: z.string(),
	words: z.array(z.string()).min(8).max(40),
});
export type BibleHeadsUpDeck = z.infer<typeof BibleHeadsUpDeckSchema>;
