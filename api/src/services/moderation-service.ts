/**
 * ModerationService - MVP prompt moderation pre-filter
 *
 * Implements a "cheap, weak" filter using keyword/regex matching.
 * Normalizes input before checking to catch evasion attempts.
 */

export interface ModerationResult {
	allowed: boolean;
	reason?: string;
	category?: string;
}

export interface ModerationRejectionLog {
	promptHash: string;
	category: string;
	reason: string;
	timestamp: number;
	[key: string]: unknown;
}

/**
 * Blocked categories with keywords and regex patterns.
 * Based on MVP moderation policy baseline.
 */
const BLOCKED_PATTERNS = {
	NSFW: {
		keywords: [
			"porn",
			"nsfw",
			"naked",
			"nude",
			"sex",
			"erotic",
			"hentai",
			"fetish",
			"xxx",
			"adult",
			"explicit",
			"obscene",
		],
		regexes: [/\b(s[e3]x|p[o0]rn|n[u0]de|n[a4]k[e3]d)\b/i],
	},
	VIOLENCE: {
		keywords: [
			"gore",
			"blood",
			"murder",
			"kill",
			"suicide",
			"torture",
			"decapitate",
			"mutilate",
			"massacre",
			"slaughter",
			"assassinate",
		],
		regexes: [/\b(k[i1]ll|m[u0]rd[e3]r|bl[o0][o0]d|g[o0]r[e3])\b/i],
	},
	HATE_SPEECH: {
		keywords: [
			// Standard slurs - intentionally minimal for MVP
			"nigger",
			"faggot",
			"kike",
			"chink",
			"spic",
			"retard",
			"racist",
		],
		regexes: [/\b(n[i1]gg[e3]r|f[a4]gg[o0]t|k[i1]k[e3]|ch[i1]nk|sp[i1]c)\b/i],
	},
	ILLEGAL: {
		keywords: [
			"drugs",
			"cocaine",
			"heroin",
			"meth",
			"bomb",
			"explosive",
			"terrorist",
			"hack",
			"illegal",
			"crime",
			"weapon",
			"assault",
		],
		regexes: [/\b(dr[u0]gs|b[o0]mb|h[a4]ck|t[e3]rr[o0]r[i1]st)\b/i],
	},
	PII: {
		keywords: [
			"address",
			"phone number",
			"social security",
			"credit card",
			"password",
			"email",
			"ssn",
			"passport",
			"license",
		],
		regexes: [/\b(ssn|credit\s*card|passw[o0]rd)\b/i],
	},
} as const;

function normalize(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

/**
 * Hash a prompt for logging purposes.
 * Uses SHA-256 truncated to 16 chars for compact storage.
 */
export async function hashPrompt(prompt: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(prompt);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const hashHex = hashArray
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
	return hashHex.slice(0, 16);
}

export class ModerationService {
	/**
	 * Check if a prompt passes moderation.
	 * Returns { allowed: true } if safe, or { allowed: false, reason, category } if blocked.
	 */
	check(prompt: string): ModerationResult {
		const normalized = normalize(prompt);

		for (const [category, patterns] of Object.entries(BLOCKED_PATTERNS)) {
			// Check keywords
			for (const keyword of patterns.keywords) {
				if (normalized.includes(normalize(keyword))) {
					return {
						allowed: false,
						reason: `Prompt contains blocked content`,
						category,
					};
				}
			}

			// Check regexes
			for (const regex of patterns.regexes) {
				if (regex.test(normalized)) {
					return {
						allowed: false,
						reason: `Prompt contains blocked content`,
						category,
					};
				}
			}
		}

		return { allowed: true };
	}

	/**
	 * Check multiple prompts at once.
	 * Returns the first rejection if any, otherwise allowed.
	 */
	checkMultiple(prompts: string[]): ModerationResult {
		for (const prompt of prompts) {
			const result = this.check(prompt);
			if (!result.allowed) {
				return result;
			}
		}
		return { allowed: true };
	}

	/**
	 * Create a log entry for a rejected prompt.
	 * Does NOT store the plaintext prompt - only a hash.
	 */
	async createRejectionLog(
		prompt: string,
		result: ModerationResult,
	): Promise<ModerationRejectionLog> {
		return {
			promptHash: await hashPrompt(prompt),
			category: result.category ?? "UNKNOWN",
			reason: result.reason ?? "Blocked",
			timestamp: Date.now(),
		};
	}
}

/**
 * Standard error message for blocked prompts.
 * Deliberately vague to avoid helping bad actors.
 */
export const MODERATION_ERROR_MESSAGE =
	"Your prompt contains content that violates our safety guidelines.";
