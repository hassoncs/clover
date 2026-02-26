/**
 * Extract the speakable/readable text from a party content item for TTS generation.
 * Each content type stores its "main text" in a different field — this normalizes that.
 */
export function getReadableText(
	body: Record<string, unknown>,
	contentType: string,
): string | null {
	switch (contentType) {
		case "quip":
		case "personal":
			return typeof body.text === "string" ? body.text : null;
		case "trivia":
		case "fibbage":
		case "estimation":
			return typeof body.question === "string" ? body.question : null;
		case "drawing":
			return typeof body.prompt === "string" ? body.prompt : null;
		case "ranking":
			return typeof body.topic === "string" ? body.topic : null;
		case "dilemma":
		case "wyr":
			if (
				typeof body.optionA === "string" &&
				typeof body.optionB === "string"
			) {
				return `Would you rather: ${body.optionA}, or, ${body.optionB}?`;
			}
			return null;
		default:
			return typeof body.text === "string" ? body.text : null;
	}
}

/**
 * Clean up fill-in-the-blank markers for TTS.
 * Removes trailing blanks after punctuation and replaces long underscores with "blank".
 */
export function sanitizeForTTS(text: string): string {
	let cleaned = text.replace(/[,:;]\s*_+\s*$/, "");
	cleaned = cleaned.replace(/_{2,}/g, "blank");
	return cleaned.trim();
}
