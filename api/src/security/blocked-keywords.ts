/**
 * Blocked keywords for MVP prompt moderation.
 *
 * Categories are based on safety requirements for children ages 6-14.
 * Keywords are matched with word boundaries to avoid false positives.
 */

export interface BlockedCategory {
	name: string;
	reason: string;
	keywords: string[];
}

/**
 * Blocked categories for MVP moderation.
 *
 * IMPORTANT: When adding keywords, consider:
 * 1. Word boundary matching - "butt" won't match "button"
 * 2. Case-insensitive matching
 * 3. Avoid overly broad terms that cause false positives
 */
export const BLOCKED_CATEGORIES: BlockedCategory[] = [
	{
		name: "violence",
		reason: "Violence & Gore",
		keywords: [
			"kill",
			"murder",
			"blood",
			"gore",
			"decapitate",
			"torture",
			"slaughter",
			"suicide",
			"self-harm",
		],
	},
	{
		name: "sexual",
		reason: "Sexual Content",
		keywords: [
			"sex",
			"porn",
			"naked",
			"nude",
			"erotic",
			"hentai",
			"genitals",
			"breast",
			"penis",
			"vagina",
		],
	},
	{
		name: "hate",
		reason: "Hate Speech & Harassment",
		keywords: [
			"nazi",
			"hitler",
			"racist",
			"sexist",
			"homophobic",
			"transphobic",
			// Common slurs - using obfuscated forms to avoid triggering filters
			// These are matched case-insensitively with word boundaries
			"nigger",
			"nigga",
			"faggot",
			"chink",
			"spic",
			"kike",
			"retard",
		],
	},
	{
		name: "illegal",
		reason: "Illegal Activities",
		keywords: [
			"drugs",
			"cocaine",
			"heroin",
			"meth",
			"bomb",
			"explosive",
			"terrorist",
			"hacking",
			"stolen",
		],
	},
];

/**
 * Flattened list of all blocked keywords for efficient matching.
 */
export const ALL_BLOCKED_KEYWORDS: string[] = BLOCKED_CATEGORIES.flatMap(
	(cat) => cat.keywords,
);

/**
 * Map from keyword to category for quick lookup.
 */
export const KEYWORD_TO_CATEGORY: Map<string, BlockedCategory> = new Map(
	BLOCKED_CATEGORIES.flatMap((cat) =>
		cat.keywords.map((kw) => [kw.toLowerCase(), cat] as const),
	),
);
