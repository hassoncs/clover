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
export declare const VOICE_MODELS: Record<string, VoiceModelDef>;
export declare const DEFAULT_VOICE_MODEL = "elevenlabs-v3";
/**
 * Available voice presets in Scenario (ElevenLabs voices)
 * These are named voices, not voice IDs
 */
export declare const SCENARIO_VOICES: {
    readonly aria: {
        readonly name: "Aria";
        readonly gender: "female";
        readonly description: "Warm, versatile female voice";
    };
    readonly sarah: {
        readonly name: "Sarah";
        readonly gender: "female";
        readonly description: "Clear, professional female voice";
    };
    readonly laura: {
        readonly name: "Laura";
        readonly gender: "female";
        readonly description: "Soft, gentle female voice";
    };
    readonly charlotte: {
        readonly name: "Charlotte";
        readonly gender: "female";
        readonly description: "British female voice";
    };
    readonly alice: {
        readonly name: "Alice";
        readonly gender: "female";
        readonly description: "Friendly female voice";
    };
    readonly matilda: {
        readonly name: "Matilda";
        readonly gender: "female";
        readonly description: "Australian female voice";
    };
    readonly lily: {
        readonly name: "Lily";
        readonly gender: "female";
        readonly description: "Young female voice";
    };
    readonly jessica: {
        readonly name: "Jessica";
        readonly gender: "female";
        readonly description: "Energetic female voice";
    };
    readonly river: {
        readonly name: "River";
        readonly gender: "female";
        readonly description: "Calm, soothing female voice";
    };
    readonly roger: {
        readonly name: "Roger";
        readonly gender: "male";
        readonly description: "Deep, authoritative male voice";
    };
    readonly charlie: {
        readonly name: "Charlie";
        readonly gender: "male";
        readonly description: "Casual, friendly male voice";
    };
    readonly george: {
        readonly name: "George";
        readonly gender: "male";
        readonly description: "Warm, narrator-style male voice";
    };
    readonly callum: {
        readonly name: "Callum";
        readonly gender: "male";
        readonly description: "Scottish male voice";
    };
    readonly liam: {
        readonly name: "Liam";
        readonly gender: "male";
        readonly description: "Irish male voice";
    };
    readonly will: {
        readonly name: "Will";
        readonly gender: "male";
        readonly description: "Young male voice";
    };
    readonly eric: {
        readonly name: "Eric";
        readonly gender: "male";
        readonly description: "American male voice";
    };
    readonly chris: {
        readonly name: "Chris";
        readonly gender: "male";
        readonly description: "Casual American male voice";
    };
    readonly brian: {
        readonly name: "Brian";
        readonly gender: "male";
        readonly description: "Professional male voice";
    };
    readonly daniel: {
        readonly name: "Daniel";
        readonly gender: "male";
        readonly description: "British male voice";
    };
    readonly bill: {
        readonly name: "Bill";
        readonly gender: "male";
        readonly description: "Older male voice";
    };
};
export type ScenarioVoiceId = keyof typeof SCENARIO_VOICES;
/**
 * Minimax voice IDs (different from ElevenLabs named voices)
 */
export declare const MINIMAX_VOICES: {
    readonly wise_woman: "Wise_Woman";
    readonly friendly_person: "Friendly_Person";
    readonly inspirational_girl: "Inspirational_girl";
    readonly deep_voice_man: "Deep_Voice_Man";
    readonly calm_woman: "Calm_Woman";
    readonly casual_guy: "Casual_Guy";
    readonly lively_girl: "Lively_Girl";
    readonly patient_man: "Patient_Man";
    readonly young_knight: "Young_Knight";
    readonly determined_man: "Determined_Man";
    readonly lovely_girl: "Lovely_Girl";
    readonly decent_boy: "Decent_Boy";
    readonly imposing_manner: "Imposing_Manner";
    readonly elegant_man: "Elegant_Man";
    readonly abbess: "Abbess";
    readonly sweet_girl_2: "Sweet_Girl_2";
    readonly exuberant_girl: "Exuberant_Girl";
};
export type MinimaxVoiceId = keyof typeof MINIMAX_VOICES;
/**
 * Map from internal preset IDs to Scenario voice names
 * This bridges our existing VOICE_PRESETS to Scenario's named voices
 */
export declare const PRESET_TO_SCENARIO_VOICE: Record<string, ScenarioVoiceId>;
//# sourceMappingURL=audio-voice-models.d.ts.map