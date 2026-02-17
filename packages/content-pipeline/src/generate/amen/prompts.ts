import { z } from "zod";
import {
	BibleFibbageQuestionSchema,
	BibleHeadsUpDeckSchema,
	BibleQuipPromptSchema,
	BibleRankingPromptSchema,
	BibleTriviaQuestionSchema,
	BibleWagerQuestionSchema,
	DrawingPromptSchema,
	EstimationQuestionSchema,
	WouldYouRatherSchema,
} from "../../types/index.js";
import type { GameTypeConfig } from "../prompts.js";

const AmenTriviaItemSchema = BibleTriviaQuestionSchema.omit({
	id: true,
}).required();
const AmenQuipItemSchema = BibleQuipPromptSchema.omit({ id: true });
const AmenFibbageItemSchema = BibleFibbageQuestionSchema.omit({
	id: true,
}).required();
const AmenDrawingItemSchema = DrawingPromptSchema.omit({ id: true }).required();
const AmenHistoryItemSchema = EstimationQuestionSchema.omit({
	id: true,
}).required();
const AmenRankingItemSchema = BibleRankingPromptSchema.omit({
	id: true,
}).required();
const AmenDilemmaItemSchema = WouldYouRatherSchema.omit({
	id: true,
}).required();
const AmenHeadsUpItemSchema = BibleHeadsUpDeckSchema.omit({
	id: true,
}).required();
const AmenWagerItemSchema = BibleWagerQuestionSchema.omit({
	id: true,
}).required();

export const AMEN_SYSTEM_PREFIX = `You are a comedy writer for Amen, a Christian party game platform. Think of yourself as a head writer at a studio that makes Jackbox-style games for church groups, youth retreats, and family game nights.

YOUR JOB: Create content that turns a room full of believers into a comedy machine. The prompts are scaffolding — the players create the real entertainment.

COMEDY PHILOSOPHY:
- The prompt should do 70% of the work. Almost any answer should be at least a little funny.
- Comedy comes from CONSTRAINT. Specific formats, narrow frames, forced collisions.
- Use the comedy of misalignment: biblical/formal language + modern/mundane situations.
- Aim for warm absurdity, not edge. "Youth group at midnight" energy.

WHERE TO FIND THE FUNNY:
- Church life: potlucks, fellowship halls, worship bands, volunteering, announcements, parking lots
- Bible characters in modern situations: social media, job interviews, reality TV, Yelp reviews
- Relatable faith moments: prayer distractions, finding the right verse, that "was that sermon about me?" feeling
- Gentle "we've all been there" humor about being a person of faith in the modern world
- Absurd combinations and playful "what if" scenarios

THE RESPECT LINE:
- Laugh WITH believers about being human, not AT faith
- Never mock God, Jesus, the Holy Spirit, or sacred practices (prayer, communion, baptism)
- Bible stories are a shared world to play in, not a target
- No cynicism, no shame humor, no "gotcha" theology
- The vibe check: "Would this land at a church retreat with all ages present?"

DENOMINATIONAL SAFETY:
- Be ecumenical — welcoming to Catholics, Protestants, and Orthodox
- Avoid: predestination/free will, baptism method, Eucharist theology, Mary/saints veneration, speaking in tongues, end-times/rapture specifics, papal authority, ordination debates, creation timeline
- When in doubt, make the joke about HUMAN behavior, not doctrine

TONE: Warm, silly, a little chaotic, fundamentally kind. Like the best camp counselor you ever had running a game show.`;

export const AMEN_GAME_TYPE_CONFIGS: Record<string, GameTypeConfig> = {
	"amen-trivia": {
		schema: z.object({ items: z.array(AmenTriviaItemSchema) }),
		system: AMEN_SYSTEM_PREFIX,
		promptTemplate: (count) =>
			`Generate ${count} Bible trivia questions for Christian party gameplay. Use only these category values: Old Testament, New Testament, Gospels, Acts & Epistles, Biblical Geography, Biblical Figures, Psalms & Proverbs, Parables, Miracles, Ten Commandments. Every item must include scriptureRef in the format Book Chapter:Verse (for example, John 3:16). Mix difficulty levels across the full batch: 40% easy, 40% medium, 20% hard. Questions should feel like a fun challenge, not a Sunday School exam. Mix genuine knowledge tests with surprising and delightful facts. Keep wording concise, clear, and joyful for group play.`,
	},
	"amen-quip": {
		schema: z.object({ items: z.array(AmenQuipItemSchema) }),
		system: AMEN_SYSTEM_PREFIX,
		promptTemplate: (count) =>
			`Generate ${count} Quiplash-style fill-in-the-blank prompts for Amen. The text field must contain exactly one blank using ____.

Use exactly one of these category values per item:
- Church-Life Situations
- Bible Character + Modern Mashup
- Proverbs for People Who _____
- Fake Biblical Twist Titles
- Best/Worst/Most Surprising
- What [Bible Character] Would Say If _____

Prompt design requirements:
- Prompts are scaffolding; player answers are the show
- Every prompt must use a specific frame or constraint
- Avoid generic prompts like "something funny about the Bible"
- Keep them church-retreat safe, warm, and absurd
- Include scriptureContext only when it genuinely helps; use Book Chapter:Verse format

Quality bar examples (match this level):
- "The church announcement nobody expected this Sunday: ____"
- "A new worship song title about losing your car keys: ____"
- "The name of a self-help book written by Jonah: ____"
- "What the pastor is actually thinking during the 7th verse of 'Just As I Am': ____"
- "A proverb for people who always bring store-bought cookies to the potluck: ____"
- "What Paul would text from prison if he had unlimited emoji: ____"`,
	},
	"amen-fibbage": {
		schema: z.object({ items: z.array(AmenFibbageItemSchema) }),
		system: AMEN_SYSTEM_PREFIX,
		promptTemplate: (count) =>
			`Generate ${count} Fibbage-style Bible fact questions where players write plausible fake answers.

Critical game-design rules:
1) The blank MUST be a word or phrase, never a number
2) The real answer must be surprising but verifiable in scripture
3) Players should be able to invent plausible-sounding alternatives
4) The sentence should give enough context for bluffing without making the answer obvious

Question format requirements:
- question contains exactly one blank using _____
- answer contains only the true missing word/phrase
- include scriptureRef in Book Chapter:Verse format
- use category values from amen-trivia categories

Examples of target quality:
- "The name of Moses' wife was _____." -> "Zipporah"
- "Paul's job before becoming a missionary was _____." -> "tentmaker"
- "The animal that spoke to Balaam was a _____." -> "donkey"
- "King Nebuchadnezzar spent seven years living as a _____ in the wilderness." -> "wild animal"`,
	},
	"amen-drawing": {
		schema: z.object({ items: z.array(AmenDrawingItemSchema) }),
		system: AMEN_SYSTEM_PREFIX,
		promptTemplate: (count) =>
			`Generate ${count} drawing prompts for 60-90 second sketches.

Drawing design rules:
- Prompt must describe a specific action moment, not just a noun/topic
- Verbs matter more than nouns
- Scene should be instantly drawable with one clear focal action
- Avoid abstract ideas and overly broad scenes

Examples:
- "Moses dropping the tablets when he sees the golden calf"
- "Jonah being yeeted out of the whale"
- "Peter trying to walk on water and sinking"

Use category values from amen-trivia where possible and mix difficulty 40% easy, 40% medium, 20% hard.`,
	},
	"amen-history": {
		schema: z.object({ items: z.array(AmenHistoryItemSchema) }),
		system: AMEN_SYSTEM_PREFIX,
		promptTemplate: (count) =>
			`Generate ${count} Bible history year-estimation questions. The question should ask for a year, answer must be a number, and acceptableRange should be realistic for timeline guessing. Prefer major events (patriarch era, exodus, united kingdom, exile, early church). Include unit as "year" and keep categories biblically grounded.`,
	},
	"amen-ranking": {
		schema: z.object({ items: z.array(AmenRankingItemSchema) }),
		system: AMEN_SYSTEM_PREFIX,
		promptTemplate: (count) =>
			`Generate ${count} ranking prompts that spark friendly debate.

Critical rule: Rankings must be opinion-based, not fact-based. If there is one objectively correct answer, it is trivia, not a ranking prompt.

Each item must include:
- topic
- items (4-8 entries)
- category (one of: Biblical What-Ifs, Church Life, Modern Faith, Bible Characters)

Target examples:
- "Rank these Bible characters by who you'd most want on your road trip"
- "Rank these miracles by how useful they'd be in modern life"
- "Rank these church potluck dishes from best to worst"
- "Rank these Biblical jobs from easiest to hardest"
- "Rank these Bible characters as wedding DJs"

Keep every ranking clearly debatable with no single right order.`,
	},
	"amen-dilemma": {
		schema: z.object({ items: z.array(AmenDilemmaItemSchema) }),
		system: AMEN_SYSTEM_PREFIX,
		promptTemplate: (count) =>
			`Generate ${count} "Would You Rather" dilemmas for Amen.

Tone and design:
- Mix absurd biblical scenarios with relatable church-life chaos
- Keep options balanced so either side could win votes
- Make people immediately argue and laugh
- Keep everything respectful and denomination-safe

Rotate across these categories:
1) Biblical superpowers/artifacts (Moses' staff vs David's sling)
2) Biblical situations to survive (whale belly vs lion's den)
3) Church volunteer role comedy
4) Modern faith-life trade-offs
5) Bible-character problems translated into modern life

Examples:
- "Lead worship with a terrible singing voice OR give the sermon with no preparation"
- "Only speak in King James English OR only speak in parables"
- "Organize VBS for 200 kids OR chaperone the youth group ski trip"`,
	},
	"amen-headsup": {
		schema: z.object({ items: z.array(AmenHeadsUpItemSchema) }),
		system: AMEN_SYSTEM_PREFIX,
		promptTemplate: (count) =>
			`Generate ${count} Bible Heads Up decks. Each deck should include a clear deck name and a words array of 8-24 recognizable Bible people, places, or events grouped by a coherent theme (for example Old Testament heroes, parables, prophets, journeys, women of the Bible). Keep clues guessable for mixed church groups and avoid obscure denominational terminology.`,
	},
	"amen-wager": {
		schema: z.object({ items: z.array(AmenWagerItemSchema) }),
		system: AMEN_SYSTEM_PREFIX,
		promptTemplate: (count) =>
			`Generate ${count} numeric-answer Bible questions for Solomon's Bet (a Wits & Wagers style game).

Content rules:
- Every answer must be a single number and should be surprising enough to trigger a "Really?!" reveal
- Include unit when it helps (chapters, verses, years, people, days, coins, etc.)
- Keep questions verifiable, scripture-grounded, and denomination-safe
- Focus on fun estimation moments where players can still bet smart even if they guess wrong
- Include funFact whenever possible for a delightful post-reveal line

Use category values such as: Books of the Bible, Biblical Figures, Biblical Ages, Bible History, Bible Numbers, Biblical Places.
Keep wording concise for party play and avoid doctrinal debate topics.`,
	},
};
