export interface MusicPromptDef {
	id: string;
	prompt: string;
	durationMinutes: number;
	brand?: string;
	tags: string[];
}

export const MUSIC_PROMPTS: MusicPromptDef[] = [
	// Shared
	{
		id: "lobby-chill",
		prompt:
			"Upbeat cheerful acoustic lounge music, warm friendly gathering vibe, soft guitar and light percussion, instrumental only",
		durationMinutes: 3,
		tags: ["lobby"],
	},
	{
		id: "lobby-hype",
		prompt:
			"Building excitement party music, upbeat electronic with claps, getting-started energy, instrumental only",
		durationMinutes: 2,
		tags: ["lobby"],
	},
	{
		id: "thinking-light",
		prompt:
			"Light playful thinking music, gentle piano with soft synth pads, quiz show background, instrumental only",
		durationMinutes: 3,
		tags: ["gameplay"],
	},
	{
		id: "thinking-pressure",
		prompt:
			"Tense ticking clock quiz show music, building urgency, dramatic strings with light percussion, instrumental only",
		durationMinutes: 2,
		tags: ["gameplay"],
	},
	{
		id: "voting-groove",
		prompt:
			"Fun funky voting music, light disco groove, playful bass line, game show vibe, instrumental only",
		durationMinutes: 2,
		tags: ["gameplay"],
	},
	{
		id: "reveal-drama",
		prompt:
			"Dramatic reveal music, building suspense, cinematic tension resolving to surprise, instrumental only",
		durationMinutes: 2,
		tags: ["reveal"],
	},
	{
		id: "scores-celebration",
		prompt:
			"Celebratory results music, triumphant brass and upbeat rhythm, game show scoreboard energy, instrumental only",
		durationMinutes: 2,
		tags: ["results"],
	},
	{
		id: "winner-glory",
		prompt:
			"Grand champion victory music, epic triumphant fanfare transitioning to warm celebration, instrumental only",
		durationMinutes: 1,
		tags: ["results"],
	},
	// Amen brand overrides
	{
		id: "lobby-chill",
		prompt:
			"Warm acoustic worship gathering music, gentle guitar and piano, church fellowship vibe, welcoming and joyful, instrumental only",
		durationMinutes: 3,
		brand: "amen",
		tags: ["lobby"],
	},
	{
		id: "thinking-light",
		prompt:
			"Soft contemplative background, gentle pads and acoustic guitar, peaceful reflection, instrumental only",
		durationMinutes: 3,
		brand: "amen",
		tags: ["gameplay"],
	},
	{
		id: "winner-glory",
		prompt:
			"Joyful celebration worship music, uplifting and triumphant, hallelujah energy, instrumental only",
		durationMinutes: 1,
		brand: "amen",
		tags: ["results"],
	},
];
