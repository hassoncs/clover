import { z } from "zod";

// Core content types
export const ModerationStatusSchema = z.enum([
	"pending",
	"approved",
	"rejected",
	"flagged",
]);
export type ModerationStatus = z.infer<typeof ModerationStatusSchema>;

export const ProvenanceSchema = z.object({
	source: z.enum(["ai", "human", "curated", "imported"]),
	generatedAt: z.string().datetime().optional(),
	generatedBy: z.string().optional(), // model name or user id
	prompt: z.string().optional(),
	metadata: z.record(z.unknown()).optional(),
});
export type Provenance = z.infer<typeof ProvenanceSchema>;

export const ContentItemSchema = z.object({
	id: z.string(),
	gameType: z.string(),
	text: z.string(),
	category: z.string().optional(),
	provenance: ProvenanceSchema,
	moderationStatus: ModerationStatusSchema,
	moderationNotes: z.string().optional(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
	metadata: z.record(z.unknown()).optional(),
});
export type ContentItem = z.infer<typeof ContentItemSchema>;

export const ContentPackSchema = z.object({
	id: z.string(),
	name: z.string(),
	gameType: z.string(),
	version: z.string(),
	items: z.array(ContentItemSchema),
	createdAt: z.string().datetime(),
	metadata: z.record(z.unknown()).optional(),
});
export type ContentPack = z.infer<typeof ContentPackSchema>;

// Game-specific schemas
export const TriviaQuestionSchema = z.object({
	id: z.string(),
	question: z.string(),
	correctAnswer: z.string(),
	incorrectAnswers: z.array(z.string()).min(3).max(3),
	category: z.string(),
	difficulty: z.enum(["easy", "medium", "hard"]).optional(),
});
export type TriviaQuestion = z.infer<typeof TriviaQuestionSchema>;

export const QuipPromptSchema = z.object({
	id: z.string(),
	text: z.string(), // prompt with blank: "The worst name for a pet: _____"
	category: z.string(),
});
export type QuipPrompt = z.infer<typeof QuipPromptSchema>;

export const DrawingPromptSchema = z.object({
	id: z.string(),
	prompt: z.string(),
	category: z.string(),
	difficulty: z.enum(["easy", "medium", "hard"]).optional(),
});
export type DrawingPrompt = z.infer<typeof DrawingPromptSchema>;

export const WouldYouRatherSchema = z.object({
	id: z.string(),
	optionA: z.string(),
	optionB: z.string(),
	category: z.string(),
});
export type WouldYouRather = z.infer<typeof WouldYouRatherSchema>;

export const FibbageQuestionSchema = z.object({
	id: z.string(),
	question: z.string(),
	answer: z.string(),
	category: z.string(),
	alternateSpellings: z.array(z.string()).optional(),
});
export type FibbageQuestion = z.infer<typeof FibbageQuestionSchema>;

export const EstimationQuestionSchema = z.object({
	id: z.string(),
	question: z.string(),
	answer: z.number(),
	unit: z.string().optional(),
	category: z.string(),
	acceptableRange: z
		.object({
			min: z.number(),
			max: z.number(),
		})
		.optional(),
});
export type EstimationQuestion = z.infer<typeof EstimationQuestionSchema>;

export const CaptionPromptSchema = z.object({
	id: z.string(),
	imageUrl: z.string(),
	category: z.string(),
	context: z.string().optional(),
});
export type CaptionPrompt = z.infer<typeof CaptionPromptSchema>;

export const WordGamePromptSchema = z.object({
	id: z.string(),
	type: z.enum(["rhyme", "synonym", "category", "association"]),
	prompt: z.string(),
	category: z.string(),
	difficulty: z.enum(["easy", "medium", "hard"]).optional(),
});
export type WordGamePrompt = z.infer<typeof WordGamePromptSchema>;

export * from "./chroma-clues.js";
