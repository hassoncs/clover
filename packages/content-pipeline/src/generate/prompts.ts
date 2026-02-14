import { z } from "zod";
import {
	DrawingPromptSchema,
	EstimationQuestionSchema,
	QuipPromptSchema,
	TriviaQuestionSchema,
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
};
