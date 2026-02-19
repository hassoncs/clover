export const BLOCKED_KEYWORDS = [
	"kill",
	"murder",
	"death",
	"blood",
	"gun",
	"weapon",
	"sex",
	"porn",
	"nude",
	"naked",
	"trump",
	"biden",
	"politics",
	"election",
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
