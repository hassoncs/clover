/**
 * Sound Effects (SFX) models available through Scenario.com
 *
 * Scenario proxies ElevenLabs SFX generation through their unified API.
 * These use the same job polling pattern as music generation.
 */
export const SFX_MODELS = {
    elevenlabs: {
        id: "elevenlabs",
        name: "ElevenLabs SFX v2",
        scenarioModelId: "model_elevenlabs-sound-effects-v2",
        maxDurationSeconds: 22,
        supportsLoop: true,
        supportsNegativePrompt: false,
        description: "High-quality sound effects via ElevenLabs, 0.5-22 seconds",
    },
    beatoven: {
        id: "beatoven",
        name: "Beatoven SFX",
        scenarioModelId: "model_beatoven-sound-effect",
        maxDurationSeconds: 35,
        supportsLoop: false,
        supportsNegativePrompt: true,
        description: "Beatoven sound effects with creativity control, 1-35 seconds",
    },
};
export const DEFAULT_SFX_MODEL = "elevenlabs";
/**
 * Output formats for SFX generation
 * Format: codec_sampleRate_bitrate
 */
export const SFX_OUTPUT_FORMATS = [
    "mp3_22050_32",
    "mp3_44100_32",
    "mp3_44100_64",
    "mp3_44100_96",
    "mp3_44100_128",
    "mp3_44100_192",
];
//# sourceMappingURL=audio-sfx-models.js.map