/**
 * Voice/Text-to-Speech models available through Scenario.com
 *
 * Scenario provides access to both ElevenLabs and Minimax TTS models.
 * Voice selection uses named presets (e.g., "Aria", "George") rather than IDs.
 */

export interface VoiceModelDef {
	id: string;
	name: string;
	scenarioModelId: string;
	provider: "elevenlabs" | "minimax";
	description: string;
}

export const VOICE_MODELS: Record<string, VoiceModelDef> = {
	"elevenlabs-v3": {
		id: "elevenlabs-v3",
		name: "ElevenLabs v3",
		scenarioModelId: "model_elevenlabs-tts-v3",
		provider: "elevenlabs",
		description: "Latest ElevenLabs multilingual TTS with highest quality",
	},
	"elevenlabs-turbo": {
		id: "elevenlabs-turbo",
		name: "ElevenLabs Turbo v2.5",
		scenarioModelId: "elevenlabs-turbo-v2-5",
		provider: "elevenlabs",
		description: "Low-latency ElevenLabs TTS for real-time applications",
	},
	"elevenlabs-multilingual": {
		id: "elevenlabs-multilingual",
		name: "ElevenLabs Multilingual v2",
		scenarioModelId: "model_elevenlabs-multilingual-v2",
		provider: "elevenlabs",
		description: "Multilingual support with 29+ languages",
	},
	"minimax-hd": {
		id: "minimax-hd",
		name: "Minimax Speech 2.6 HD",
		scenarioModelId: "model_minimax-speech-2-6-hd",
		provider: "minimax",
		description: "High-definition Minimax TTS with emotion control",
	},
	"minimax-turbo": {
		id: "minimax-turbo",
		name: "Minimax Speech 2.6 Turbo",
		scenarioModelId: "model_minimax-speech-2-6-turbo",
		provider: "minimax",
		description: "Fast Minimax TTS with emotion control",
	},
};

export const DEFAULT_VOICE_MODEL = "elevenlabs-v3";

/**
 * Available voice presets in Scenario (ElevenLabs voices)
 * These are named voices, not voice IDs
 */
export const SCENARIO_VOICES = {
	// Female voices
	aria: {
		name: "Aria",
		gender: "female",
		description: "Warm, versatile female voice",
	},
	sarah: {
		name: "Sarah",
		gender: "female",
		description: "Clear, professional female voice",
	},
	laura: {
		name: "Laura",
		gender: "female",
		description: "Soft, gentle female voice",
	},
	charlotte: {
		name: "Charlotte",
		gender: "female",
		description: "British female voice",
	},
	alice: {
		name: "Alice",
		gender: "female",
		description: "Friendly female voice",
	},
	matilda: {
		name: "Matilda",
		gender: "female",
		description: "Australian female voice",
	},
	lily: { name: "Lily", gender: "female", description: "Young female voice" },
	jessica: {
		name: "Jessica",
		gender: "female",
		description: "Energetic female voice",
	},
	river: {
		name: "River",
		gender: "female",
		description: "Calm, soothing female voice",
	},

	// Male voices
	roger: {
		name: "Roger",
		gender: "male",
		description: "Deep, authoritative male voice",
	},
	charlie: {
		name: "Charlie",
		gender: "male",
		description: "Casual, friendly male voice",
	},
	george: {
		name: "George",
		gender: "male",
		description: "Warm, narrator-style male voice",
	},
	callum: {
		name: "Callum",
		gender: "male",
		description: "Scottish male voice",
	},
	liam: { name: "Liam", gender: "male", description: "Irish male voice" },
	will: { name: "Will", gender: "male", description: "Young male voice" },
	eric: { name: "Eric", gender: "male", description: "American male voice" },
	chris: {
		name: "Chris",
		gender: "male",
		description: "Casual American male voice",
	},
	brian: {
		name: "Brian",
		gender: "male",
		description: "Professional male voice",
	},
	daniel: { name: "Daniel", gender: "male", description: "British male voice" },
	bill: { name: "Bill", gender: "male", description: "Older male voice" },
} as const;

export type ScenarioVoiceId = keyof typeof SCENARIO_VOICES;

/**
 * Minimax voice IDs (different from ElevenLabs named voices)
 */
export const MINIMAX_VOICES = {
	wise_woman: "Wise_Woman",
	friendly_person: "Friendly_Person",
	inspirational_girl: "Inspirational_girl",
	deep_voice_man: "Deep_Voice_Man",
	calm_woman: "Calm_Woman",
	casual_guy: "Casual_Guy",
	lively_girl: "Lively_Girl",
	patient_man: "Patient_Man",
	young_knight: "Young_Knight",
	determined_man: "Determined_Man",
	lovely_girl: "Lovely_Girl",
	decent_boy: "Decent_Boy",
	imposing_manner: "Imposing_Manner",
	elegant_man: "Elegant_Man",
	abbess: "Abbess",
	sweet_girl_2: "Sweet_Girl_2",
	exuberant_girl: "Exuberant_Girl",
} as const;

export type MinimaxVoiceId = keyof typeof MINIMAX_VOICES;

/**
 * Map from internal preset IDs to Scenario voice names
 * This bridges our existing VOICE_PRESETS to Scenario's named voices
 */
export const PRESET_TO_SCENARIO_VOICE: Record<string, ScenarioVoiceId> = {
	narrator: "george", // Deep, authoritative -> George
	friendly: "sarah", // Warm, friendly -> Sarah
	announcer: "roger", // Energetic, announcements -> Roger
	villain: "roger", // Gruff, menacing -> Roger (closest match)
	guide: "river", // Clear, calm -> River
};
