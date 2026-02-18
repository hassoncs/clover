export interface MusicModelDef {
	id: string;
	name: string;
	scenarioModelId: string;
	maxDurationSeconds: number;
	supportsLyrics: boolean;
	supportsNegativePrompt: boolean;
	description: string;
}

export const MUSIC_MODELS: Record<string, MusicModelDef> = {
	beatoven: {
		id: "beatoven",
		name: "Beatoven",
		scenarioModelId: "model_beatoven-music-generation",
		maxDurationSeconds: 150,
		supportsLyrics: false,
		supportsNegativePrompt: true,
		description: "Instrumental background music and loops, up to 2.5 minutes",
	},
	minimax: {
		id: "minimax",
		name: "MiniMax Music 2.0",
		scenarioModelId: "model_minimax-music-2-0",
		maxDurationSeconds: 240,
		supportsLyrics: true,
		supportsNegativePrompt: false,
		description: "Full songs with optional vocals/lyrics, up to 4 minutes",
	},
	musicgen: {
		id: "musicgen",
		name: "Meta MusicGen",
		scenarioModelId: "model_meta-musicgen",
		maxDurationSeconds: 30,
		supportsLyrics: false,
		supportsNegativePrompt: false,
		description:
			"Short high-quality clips with melody conditioning, up to 30 seconds",
	},
	lyria: {
		id: "lyria",
		name: "Google Lyria 2",
		scenarioModelId: "model_lyria-2",
		maxDurationSeconds: 30,
		supportsLyrics: false,
		supportsNegativePrompt: true,
		description: "High-fidelity instrumental music, up to 30 seconds",
	},
	reve: {
		id: "reve",
		name: "Reve Create",
		scenarioModelId: "model_reve-create",
		maxDurationSeconds: 240,
		supportsLyrics: true,
		supportsNegativePrompt: false,
		description: "AI music creation with vocals and lyrics support",
	},
};

export const DEFAULT_MUSIC_MODEL = "beatoven";
