// Blocked keywords for content moderation
export const BLOCKED_KEYWORDS = [
	// Violence
	"kill",
	"murder",
	"death",
	"blood",
	"gun",
	"weapon",
	// Adult content
	"sex",
	"porn",
	"nude",
	"naked",
	// Politics (avoid controversy)
	"trump",
	"biden",
	"politics",
	"election",
	// Drugs
	"drug",
	"cocaine",
	"heroin",
	"marijuana",
];

export function containsBlockedKeyword(text: string): {
	blocked: boolean;
	keyword?: string;
} {
	const lower = text.toLowerCase();
	for (const keyword of BLOCKED_KEYWORDS) {
		if (lower.includes(keyword)) {
			return { blocked: true, keyword };
		}
	}
	return { blocked: false };
}
