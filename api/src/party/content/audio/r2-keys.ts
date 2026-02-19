export const SKIP_VOICE_TYPES = new Set([
	"headsup",
	"wordlist",
	"FakeWord",
	"chroma",
]);

export function buildContentAudioR2Key(
	brand: string,
	contentType: string,
	contentId: string,
): string {
	return `audio/voice/${brand}/content/${contentType}/${contentId}.mp3`;
}
