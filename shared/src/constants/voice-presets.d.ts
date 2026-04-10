export interface VoicePreset {
    voiceId: string;
    name: string;
    description: string;
    tags: string[];
}
export declare const VOICE_PRESETS: {
    readonly narrator: {
        readonly voiceId: "pNInz6obpgDQGcFmaJgB";
        readonly name: "Adam";
        readonly description: "Deep, authoritative male narrator voice";
        readonly tags: ["male", "deep", "narrator", "authoritative"];
    };
    readonly friendly: {
        readonly voiceId: "EXAVITQu4vr4xnSDxMaL";
        readonly name: "Bella";
        readonly description: "Warm, friendly female voice for UI and tutorials";
        readonly tags: ["female", "warm", "friendly", "tutorial"];
    };
    readonly announcer: {
        readonly voiceId: "ErXwobaYiN019PkySvjV";
        readonly name: "Antoni";
        readonly description: "Energetic male voice for game announcements";
        readonly tags: ["male", "energetic", "announcer", "hype"];
    };
    readonly villain: {
        readonly voiceId: "VR6AewLTigWG4xSOukaG";
        readonly name: "Arnold";
        readonly description: "Gruff, menacing voice for villain characters";
        readonly tags: ["male", "gruff", "villain", "dramatic"];
    };
    readonly guide: {
        readonly voiceId: "21m00Tcm4TlvDq8ikWAM";
        readonly name: "Rachel";
        readonly description: "Clear, calm female voice for instructions and guides";
        readonly tags: ["female", "calm", "clear", "guide"];
    };
};
export type VoicePresetId = keyof typeof VOICE_PRESETS;
export interface BrandVoiceConfig {
    voiceId: string;
    name: string;
    description: string;
    model: string;
    settings: {
        stability: number;
        similarityBoost: number;
        style: number;
    };
}
export interface BrandVoices {
    announcer: BrandVoiceConfig;
    rules: BrandVoiceConfig;
}
/**
 * One announcer voice per brand. This voice is the "host personality" for all
 * games under that brand.
 *
 * ITERATION WORKFLOW:
 * 1. Browse ElevenLabs voice library, find candidates
 * 2. Update the voiceId here
 * 3. Generate samples: `hush run -- npx tsx api/scripts/generate-audio.ts --brand amen --type voice --sample`
 * 4. Listen, tweak stability/similarityBoost/style, re-generate
 * 5. When happy: `--generate-all`
 */
export declare const BRAND_VOICES: Record<string, BrandVoices>;
//# sourceMappingURL=voice-presets.d.ts.map