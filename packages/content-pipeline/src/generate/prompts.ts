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

export interface GameTypeConfig {
	schema: z.ZodType<{ items: unknown[] }>;
	system: string;
	promptTemplate: (count: number) => string;
}

const QuipItemSchema = QuipPromptSchema.omit({ id: true });
const TriviaItemSchema = TriviaQuestionSchema.omit({ id: true }).required();
const DrawingItemSchema = DrawingPromptSchema.omit({ id: true }).required();
const WyrItemSchema = WouldYouRatherSchema.omit({ id: true });
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

export const GAME_TYPE_CONFIGS: Record<string, GameTypeConfig> = {
	quip: {
		schema: z.object({ items: z.array(QuipItemSchema) }),
		system:
			"You generate fill-in-the-blank comedy prompts for a party game. Output must be suitable for ages 8-14. No violence, romance, politics, or copyrighted characters.",
		promptTemplate: (count) =>
			`Generate ${count} fill-in-the-blank prompts across categories: animals, food, technology, workplace, absurd. Each should have a blank (use _____).`,
	},
	trivia: {
		schema: z.object({ items: z.array(TriviaItemSchema) }),
		system:
			"You generate trivia questions with multiple choice answers for a party game. Suitable for ages 8-14. No violence, romance, politics, or copyrighted characters.",
		promptTemplate: (count) =>
			`Generate ${count} trivia questions across categories: science, history, geography, animals, pop culture. Each needs exactly 3 incorrect answers.`,
	},
	drawing: {
		schema: z.object({ items: z.array(DrawingItemSchema) }),
		system:
			"You generate drawing prompts for a party game where players draw and others guess. Suitable for ages 8-14. No violence, romance, politics, or copyrighted characters.",
		promptTemplate: (count) =>
			`Generate ${count} drawing prompts across categories: animals, objects, actions, food, fantasy. Include difficulty levels: easy, medium, hard.`,
	},
	wyr: {
		schema: z.object({ items: z.array(WyrItemSchema) }),
		system:
			"You generate 'Would You Rather' questions for a party game. Two silly or interesting choices. Suitable for ages 8-14. No violence, romance, politics, or copyrighted characters.",
		promptTemplate: (count) =>
			`Generate ${count} 'Would You Rather' questions across categories: superpowers, food, animals, abilities, silly scenarios.`,
	},
	estimation: {
		schema: z.object({ items: z.array(EstimationItemSchema) }),
		system:
			"You generate estimation questions where players guess numbers. Answers should be surprising or interesting. Suitable for ages 8-14. No violence, romance, politics, or copyrighted characters.",
		promptTemplate: (count) =>
			`Generate ${count} estimation questions across categories: animals, geography, human body, food, technology. Include the unit of measurement.`,
	},
	fibbage: {
		schema: z.object({ items: z.array(FibbageItemSchema) }),
		system:
			"You generate obscure fact-based questions for a bluffing party game. Each question presents an interesting fact with a key detail blanked out (use _____). Players try to guess the real answer while fooling others with fake answers. The real answer should be surprising but true. Suitable for ages 8-14. No violence, romance, politics, or copyrighted characters.",
		promptTemplate: (count) =>
			`Generate ${count} obscure fact questions across categories: animals, history, geography, science, food origins, word origins, human body, pop culture trivia. Each should have a surprising but verifiable answer that most people wouldn't know.`,
	},
	caption: {
		schema: z.object({ items: z.array(CaptionItemSchema) }),
		system:
			"You generate descriptions of absurd, weird, or funny hypothetical images for a caption-writing party game. Each prompt describes a bizarre visual scene that players must write funny captions for. The imageUrl should be a descriptive slug (e.g., 'weird-cat-office', 'dinosaur-tea-party'). Suitable for ages 8-14. No violence, romance, politics, or copyrighted characters.",
		promptTemplate: (count) =>
			`Generate ${count} absurd image scene descriptions across categories: animals in human situations, impossible objects, surreal landscapes, bizarre food combinations, strange technology, fantasy creatures doing mundane things. Each description should spark creative and funny captions.`,
	},
	wordgame: {
		schema: z.object({ items: z.array(WordGameItemSchema) }),
		system:
			"You generate word game prompts with different challenge types for a party game. Types include: 'rhyme' (find words that rhyme), 'synonym' (find words with similar meaning), 'category' (list items in a category), 'association' (find words related to a prompt). Suitable for ages 8-14. No violence, romance, politics, or copyrighted characters.",
		promptTemplate: (count) =>
			`Generate ${count} word game prompts with varied types (rhyme, synonym, category, association). Mix difficulties: easy (common words/categories), medium (somewhat obscure), hard (unusual or specific). Categories should include: animals, food, actions, objects, nature, technology, emotions.`,
	},
	chroma: {
		schema: z.object({ items: z.array(ColorClueItemSchema) }),
		system:
			"You generate 1-word clues for colors in a party game. Clues should be evocative associations (like 'ocean' for blue, 'fire' for red-orange, 'grass' for green). NEVER use basic color names (red, blue, green, yellow, orange, purple, pink, brown, black, white, gray, cyan, magenta, lime, teal, indigo, violet). Suitable for ages 8-14.",
		promptTemplate: (count) =>
			`Generate ${count} color clue packs. Each pack should have: clues (5 distinct 1-word clues for a color), bannedColorNames (list any basic color words that would be cheating to use). Cover various hues and saturations across the color spectrum.`,
	},
};
