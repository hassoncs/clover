export interface VoicePreset {
	voiceId: string;
	name: string;
	description: string;
	tags: string[];
}

export const VOICE_PRESETS = {
	narrator: {
		voiceId: "pNInz6obpgDQGcFmaJgB",
		name: "Adam",
		description: "Deep, authoritative male narrator voice",
		tags: ["male", "deep", "narrator", "authoritative"],
	},
	friendly: {
		voiceId: "EXAVITQu4vr4xnSDxMaL",
		name: "Bella",
		description: "Warm, friendly female voice for UI and tutorials",
		tags: ["female", "warm", "friendly", "tutorial"],
	},
	announcer: {
		voiceId: "ErXwobaYiN019PkySvjV",
		name: "Antoni",
		description: "Energetic male voice for game announcements",
		tags: ["male", "energetic", "announcer", "hype"],
	},
	villain: {
		voiceId: "VR6AewLTigWG4xSOukaG",
		name: "Arnold",
		description: "Gruff, menacing voice for villain characters",
		tags: ["male", "gruff", "villain", "dramatic"],
	},
	guide: {
		voiceId: "21m00Tcm4TlvDq8ikWAM",
		name: "Rachel",
		description: "Clear, calm female voice for instructions and guides",
		tags: ["female", "calm", "clear", "guide"],
	},
} as const satisfies Record<string, VoicePreset>;

export type VoicePresetId = keyof typeof VOICE_PRESETS;
