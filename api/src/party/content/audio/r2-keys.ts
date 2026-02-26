export const SKIP_VOICE_TYPES = new Set([
	"headsup",
	"wordlist",
	"FakeWord",
	"chroma",
]);

export const LEGACY_AUDIO_CONTENT_TYPE_ALIASES: Record<string, string> = {
	wager: "estimation",
	history: "estimation",
};

export function buildContentAudioR2Key(
	brand: string,
	contentType: string,
	contentId: string,
): string {
	return `audio/voice/${brand}/content/${contentType}/${contentId}.mp3`;
}

export function buildContentAudioR2KeyCandidates(
	brand: string,
	contentType: string,
	contentId: string,
): string[] {
	const canonical = buildContentAudioR2Key(brand, contentType, contentId);
	const legacyAliases = Object.entries(LEGACY_AUDIO_CONTENT_TYPE_ALIASES)
		.filter(([, canonical_]) => canonical_ === contentType)
		.map(([legacy]) => buildContentAudioR2Key(brand, legacy, contentId));

	return [canonical, ...legacyAliases];
}
