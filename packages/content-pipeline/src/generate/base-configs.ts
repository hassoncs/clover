import { z } from "zod";
import {
	CaptionPromptSchema,
	ColorClueSchema,
	DrawingPromptSchema,
	EstimationQuestionSchema,
	FibbageQuestionSchema,
	QuipPromptSchema,
	TriviaQuestionSchema,
	WordGamePromptSchema,
	WouldYouRatherSchema,
} from "../types/index.js";

export interface BaseContentConfig {
	schema: z.ZodType<{ items: unknown[] }>;
	promptTemplate: (count: number) => string;
}

const QuipItemSchema = QuipPromptSchema.omit({ id: true });
const TriviaItemSchema = TriviaQuestionSchema.omit({ id: true }).required();
const DrawingItemSchema = DrawingPromptSchema.omit({ id: true }).required();
const DilemmaItemSchema = WouldYouRatherSchema.omit({ id: true });
const EstimationItemSchema = EstimationQuestionSchema.omit({
	id: true,
}).required();
const FibbageItemSchema = FibbageQuestionSchema.omit({ id: true });
const CaptionItemSchema = CaptionPromptSchema.omit({ id: true });
const WordGameItemSchema = WordGamePromptSchema.omit({ id: true });
const ColorClueItemSchema = ColorClueSchema.omit({
	hue: true,
	saturation: true,
});

const RankingItemSchema = z.object({
	topic: z.string(),
	items: z.array(z.string()).min(4).max(8),
	category: z.string(),
});

const HeadsupItemSchema = z.object({
	name: z.string(),
	words: z.array(z.string()).min(8).max(40),
});

const WagerItemSchema = z.object({
	question: z.string(),
	answer: z.number(),
	unit: z.string().optional(),
	category: z.string(),
	funFact: z.string().optional(),
});

const WordlistItemSchema = z.object({
	name: z.string(),
	words: z.array(z.string()).min(8).max(40),
	category: z.string().optional(),
});

const PersonalItemSchema = z.object({
	prompt: z.string(),
	category: z.string(),
});

export const BASE_CONTENT_CONFIGS: Record<string, BaseContentConfig> = {
	quip: {
		schema: z.object({ items: z.array(QuipItemSchema) }),
		promptTemplate: (count) =>
			`Generate ${count} fill-in-the-blank comedy prompts. Each prompt must contain exactly one blank using _____. Keep prompts concise and make sure player answers can go in many funny directions.`,
	},
	trivia: {
		schema: z.object({ items: z.array(TriviaItemSchema) }),
		promptTemplate: (count) =>
			`Generate ${count} trivia questions with exactly 1 correct answer and exactly 3 incorrect answers per item. Questions should be punchy, clear, and suited for party play.`,
	},
	fibbage: {
		schema: z.object({ items: z.array(FibbageItemSchema) }),
		promptTemplate: (count) =>
			`Generate ${count} fibbage-style prompts with one blank using _____. The real answer should be surprising but verifiable, and the question should invite plausible fake answers.`,
	},
	wager: {
		schema: z.object({ items: z.array(WagerItemSchema) }),
		promptTemplate: (count) =>
			`Generate ${count} numeric estimation questions for a wager-style game. Answers must be numbers. Include unit when useful and prefer surprising reveal-friendly facts.`,
	},
	drawing: {
		schema: z.object({ items: z.array(DrawingItemSchema) }),
		promptTemplate: (count) =>
			`Generate ${count} drawing prompts for short timed rounds. Prompts should describe clear, drawable action moments with one focal scene.`,
	},
	ranking: {
		schema: z.object({ items: z.array(RankingItemSchema) }),
		promptTemplate: (count) =>
			`Generate ${count} opinion-based ranking prompts with 4-8 items each. Keep topics debatable and fun, with no single objectively correct order.`,
	},
	headsup: {
		schema: z.object({ items: z.array(HeadsupItemSchema) }),
		promptTemplate: (count) =>
			`Generate ${count} heads-up decks. Each deck should include a name and 8-24 recognizable words connected by a clear theme.`,
	},
	dilemma: {
		schema: z.object({ items: z.array(DilemmaItemSchema) }),
		promptTemplate: (count) =>
			`Generate ${count} "Would You Rather" dilemmas with balanced options. Each item should create immediate debate and friendly arguments.`,
	},
	wordlist: {
		schema: z.object({ items: z.array(WordlistItemSchema) }),
		promptTemplate: (count) =>
			`Generate ${count} themed word lists. Each list should have a short deck name and 8-24 words that are easy to read quickly in party play.`,
	},
	personal: {
		schema: z.object({ items: z.array(PersonalItemSchema) }),
		promptTemplate: (count) =>
			`Generate ${count} personal-story prompts that invite players to share funny, low-stakes real experiences. Keep prompts specific and socially safe.`,
	},
	history: {
		schema: z.object({ items: z.array(EstimationItemSchema) }),
		promptTemplate: (count) =>
			`Generate ${count} year-estimation questions about historical moments. Answers must be numeric years and acceptableRange should reflect realistic guessing windows.`,
	},
	wyr: {
		schema: z.object({ items: z.array(DilemmaItemSchema) }),
		promptTemplate: (count) =>
			`Generate ${count} "Would You Rather" dilemmas with balanced options. Keep them quick to understand and fun to debate.`,
	},
	estimation: {
		schema: z.object({ items: z.array(EstimationItemSchema) }),
		promptTemplate: (count) =>
			`Generate ${count} estimation questions across varied domains. Each answer must be numeric and include a useful unit where applicable.`,
	},
	caption: {
		schema: z.object({ items: z.array(CaptionItemSchema) }),
		promptTemplate: (count) =>
			`Generate ${count} absurd image-scene descriptions suitable for caption-writing rounds. Keep scenes vivid and easy to imagine instantly.`,
	},
	wordgame: {
		schema: z.object({ items: z.array(WordGameItemSchema) }),
		promptTemplate: (count) =>
			`Generate ${count} word game prompts across rhyme, synonym, category, and association challenge types. Mix easy, medium, and hard difficulty.`,
	},
	chroma: {
		schema: z.object({ items: z.array(ColorClueItemSchema) }),
		promptTemplate: (count) =>
			`Generate ${count} color clue packs with 5 one-word clues each plus bannedColorNames that disallow obvious basic color words.`,
	},
};

export function listBaseGameTypes(): string[] {
	return Object.keys(BASE_CONTENT_CONFIGS);
}
