import type { ContentType } from "./party-content";

/**
 * Party naming taxonomy:
 * - templateId: stable mechanic identifier used in runtime routing.
 * - contentType: canonical schema token used for content storage/loading.
 * - brandTitle: presentation label for UI copy, never used as a storage key.
 */
export const TEMPLATE_IDS = [
	"about-you-bluff",
	"chain-reaction",
	"chroma-clues",
	"consensus-mine",
	"drawful-animate",
	"half-and-half",
	"heads-up",
	"lexicon-ladder",
	"quiplash",
	"percent-panic",
	"punchline-ferry",
	"quickfire-qa",
	"rival-roster",
	"role-replay",
	"ruin-and-redeem",
	"shirt-clash",
	"sketch-bluff",
	"spectrum-guess",
	"truth-trap",
	"year-jinx",
] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const TEMPLATE_CONTENT_MAP: Record<TemplateId, ContentType[]> = {
	"about-you-bluff": ["personal"],
	"chain-reaction": ["wordlist"],
	"chroma-clues": ["chroma"],
	"consensus-mine": ["ranking"],
	"drawful-animate": ["drawing"],
	"half-and-half": ["dilemma"],
	"heads-up": ["headsup"],
	"lexicon-ladder": ["FakeWord"],
	quiplash: ["quip"],
	"percent-panic": ["estimation"],
	"punchline-ferry": ["quip"],
	"quickfire-qa": ["trivia"],
	"rival-roster": [],
	"role-replay": ["quip"],
	"ruin-and-redeem": ["quip"],
	"shirt-clash": [],
	"sketch-bluff": ["drawing"],
	"spectrum-guess": ["estimation"],
	"truth-trap": ["fibbage"],
	"year-jinx": ["estimation"],
};

export const TEMPLATE_BRAND_TITLES: Record<TemplateId, string> = {
	"about-you-bluff": "About You Bluff",
	"chain-reaction": "Chain Reaction",
	"chroma-clues": "Chroma Clues",
	"consensus-mine": "Consensus Mine",
	"drawful-animate": "Flicker Frames",
	"half-and-half": "Half and Half",
	"heads-up": "Heads Up",
	"lexicon-ladder": "Lexicon Ladder",
	quiplash: "Quiplash",
	"percent-panic": "Percent Panic",
	"punchline-ferry": "Guffaw Galleon",
	"quickfire-qa": "Quickfire Q&A",
	"rival-roster": "Rival Roster",
	"role-replay": "Role Replay",
	"ruin-and-redeem": "Ruin and Redeem",
	"shirt-clash": "Shirt Clash",
	"sketch-bluff": "Sketch Bluff",
	"spectrum-guess": "The Calibration Lab",
	"truth-trap": "Truth Trap",
	"year-jinx": "Year Jinx",
};

export function isTemplateId(value: string): value is TemplateId {
	return value in TEMPLATE_CONTENT_MAP;
}

export function assertTemplateId(value: string): TemplateId {
	if (!isTemplateId(value)) {
		throw new Error(`Invalid templateId: ${value}`);
	}
	return value;
}
