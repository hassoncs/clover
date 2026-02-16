import { z } from "zod";

export const BibleTriviaCategorySchema = z.enum([
	"Old Testament",
	"New Testament",
	"Gospels",
	"Acts & Epistles",
	"Biblical Geography",
	"Biblical Figures",
	"Psalms & Proverbs",
	"Parables",
	"Miracles",
	"Ten Commandments",
]);
export type BibleTriviaCategory = z.infer<typeof BibleTriviaCategorySchema>;

export const BibleTriviaDifficultySchema = z.enum(["easy", "medium", "hard"]);
export type BibleTriviaDifficulty = z.infer<typeof BibleTriviaDifficultySchema>;

export const BibleTriviaQuestionSchema = z.object({
	id: z.string(),
	question: z.string(),
	correctAnswer: z.string(),
	incorrectAnswers: z.array(z.string()).length(3),
	category: BibleTriviaCategorySchema,
	difficulty: BibleTriviaDifficultySchema,
	scriptureRef: z.string(),
	explanation: z.string(),
});
export type BibleTriviaQuestion = z.infer<typeof BibleTriviaQuestionSchema>;
