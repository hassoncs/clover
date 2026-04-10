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
};
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
export const BRAND_VOICES = {
    amen: {
        announcer: {
            voiceId: "m7ylp1ry3hFqafo4tS3s",
            name: "Amen Host",
            description: "Warm, fun, family-friendly game host for amen.games",
            model: "eleven_multilingual_v2",
            settings: {
                stability: 0.5,
                similarityBoost: 0.75,
                style: 0.3,
            },
        },
        rules: {
            voiceId: "m7ylp1ry3hFqafo4tS3s",
            name: "Amen Host",
            description: "Same voice, calmer delivery for explaining game rules",
            model: "eleven_multilingual_v2",
            settings: {
                stability: 0.7,
                similarityBoost: 0.75,
                style: 0.1,
            },
        },
    },
    slopbox: {
        announcer: {
            voiceId: "m7ylp1ry3hFqafo4tS3s",
            name: "Slopbox Host",
            description: "Energetic game host for slopbox (using amen voice as placeholder — swap later)",
            model: "eleven_multilingual_v2",
            settings: {
                stability: 0.5,
                similarityBoost: 0.75,
                style: 0.3,
            },
        },
        rules: {
            voiceId: "m7ylp1ry3hFqafo4tS3s",
            name: "Slopbox Host",
            description: "Rules voice for slopbox (using amen voice as placeholder — swap later)",
            model: "eleven_multilingual_v2",
            settings: {
                stability: 0.7,
                similarityBoost: 0.75,
                style: 0.1,
            },
        },
    },
};
//# sourceMappingURL=voice-presets.js.map