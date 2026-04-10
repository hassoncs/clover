/**
 * Sound Effects (SFX) models available through Scenario.com
 *
 * Scenario proxies ElevenLabs SFX generation through their unified API.
 * These use the same job polling pattern as music generation.
 */
export interface SfxModelDef {
    id: string;
    name: string;
    scenarioModelId: string;
    maxDurationSeconds: number;
    supportsLoop: boolean;
    supportsNegativePrompt: boolean;
    description: string;
}
export declare const SFX_MODELS: Record<string, SfxModelDef>;
export declare const DEFAULT_SFX_MODEL = "elevenlabs";
/**
 * Output formats for SFX generation
 * Format: codec_sampleRate_bitrate
 */
export declare const SFX_OUTPUT_FORMATS: readonly ["mp3_22050_32", "mp3_44100_32", "mp3_44100_64", "mp3_44100_96", "mp3_44100_128", "mp3_44100_192"];
export type SfxOutputFormat = (typeof SFX_OUTPUT_FORMATS)[number];
//# sourceMappingURL=audio-sfx-models.d.ts.map