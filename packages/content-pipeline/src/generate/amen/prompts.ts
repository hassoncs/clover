import { z } from "zod";
import {
	BibleFibbageQuestionSchema,
	BibleQuipPromptSchema,
	BibleTriviaQuestionSchema,
} from "../../types/index.js";
import type { GameTypeConfig } from "../prompts.js";

const AmenTriviaItemSchema = BibleTriviaQuestionSchema.omit({
	id: true,
}).required();
const AmenQuipItemSchema = BibleQuipPromptSchema.omit({ id: true });
const AmenFibbageItemSchema = BibleFibbageQuestionSchema.omit({
	id: true,
}).required();

export const AMEN_SYSTEM_PREFIX = `You are creating content for Amen, a Christian party game platform. Your content must:

1. BE REVERENT: Never mock, trivialize, or be irreverent toward faith, scripture, or Christian practice.

2. BE EDUCATIONAL: Help players learn about the Bible, Christian history, and spiritual concepts in an engaging way.

3. BE WARM: Use a friendly, welcoming tone that invites fellowship and community.

4. BE INCLUSIVE: Content should be appropriate for all Christian denominations. Avoid topics that are denominationally divisive.

5. INCLUDE SCRIPTURE: All content should reference or be grounded in scripture. Include verse references where appropriate.

6. STAY IN GREEN ZONE: Only generate content on universally accepted Christian topics. Avoid controversial theological debates.

7. RESPECT BOUNDARIES: Never generate content involving violence, romance, politics, horror, or occult themes.

Remember: The goal is to create games that bring people together around scripture and fellowship, not to advance any particular theological position.`;

const AMEN_ADDITIONAL_REQUIREMENTS =
	"Be ecumenical and avoid all Red Zone topics (predestination vs free will, baptism method, Eucharist theology, veneration of Mary/saints, speaking in tongues, end-times/rapture debates, papal authority, ordination debates, and creation timeline disputes). Keep the tone educational and fun, never preachy.";

export const AMEN_GAME_TYPE_CONFIGS: Record<string, GameTypeConfig> = {
	"amen-trivia": {
		schema: z.object({ items: z.array(AmenTriviaItemSchema) }),
		system: `${AMEN_SYSTEM_PREFIX}\n\n${AMEN_ADDITIONAL_REQUIREMENTS}`,
		promptTemplate: (count) =>
			`Generate ${count} Bible trivia questions for Christian party gameplay. Use these categories only: Old Testament, New Testament, Gospels, Acts & Epistles, Biblical Geography, Biblical Figures, Psalms & Proverbs, Parables, Miracles, Ten Commandments. Every item must include scriptureRef in the format Book Chapter:Verse (for example, John 3:16). Mix difficulty levels across the full batch: 40% easy, 40% medium, 20% hard. Keep wording concise, clear, and joyful for group play.`,
	},
	"amen-quip": {
		schema: z.object({ items: z.array(AmenQuipItemSchema) }),
		system: `${AMEN_SYSTEM_PREFIX}\n\n${AMEN_ADDITIONAL_REQUIREMENTS}`,
		promptTemplate: (count) =>
			`Generate ${count} Bible-themed fill-in-the-blank quip prompts. The text field must always contain exactly one blank using ____ (example style: "Moses' excuse for being late to the burning bush: ____"). Use the same biblical categories as amen-trivia. Include scriptureContext when a verse anchor helps, formatted like Book Chapter:Verse. Make prompts playful and clever while staying respectful. Across the full batch, target topic depth equivalent to 40% easy, 40% medium, 20% hard.`,
	},
	"amen-fibbage": {
		schema: z.object({ items: z.array(AmenFibbageItemSchema) }),
		system: `${AMEN_SYSTEM_PREFIX}\n\n${AMEN_ADDITIONAL_REQUIREMENTS}`,
		promptTemplate: (count) =>
			`Generate ${count} obscure-but-accurate Bible fact questions for a Fibbage-style game. Each question should hide one surprising detail with _____, and answer should contain only the true missing detail. Use the same biblical categories as amen-trivia. Every item must include scriptureRef in Book Chapter:Verse format. Prefer memorable facts players can verify in scripture. Across the full batch, target question depth equivalent to 40% easy, 40% medium, 20% hard.`,
	},
};
