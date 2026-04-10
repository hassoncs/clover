/**
 * Unique identifier for a voice generation request.
 * Used to track voice preparation and playback across frames.
 */
export type VoiceHandleId = string;
/**
 * Status of a voice preparation request.
 * - `pending`: Voice generation in progress
 * - `ready`: Voice audio is available for playback
 * - `failed`: Voice generation failed (network error, API error, etc.)
 * - `cancelled`: Voice generation was cancelled before completion
 */
export type VoicePrepareStatus = "pending" | "ready" | "failed" | "cancelled";
/**
 * Options for voice generation.
 * These control the voice synthesis parameters.
 */
export interface VoicePrepareOptions {
    /**
     * Voice stability (0-1). Higher = more consistent, lower = more expressive.
     * Default: 0.5
     */
    stability?: number;
    /**
     * Similarity boost (0-1). Higher = closer to original voice, lower = more variation.
     * Default: 0.75
     */
    similarityBoost?: number;
    /**
     * Style exaggeration (0-1). Higher = more dramatic delivery.
     * Default: 0
     */
    style?: number;
    /**
     * Use speaker boost for clarity.
     * Default: true
     */
    useSpeakerBoost?: boolean;
}
/**
 * Voice handle returned from prepareVoice.
 * Tracks the status and result of a voice generation request.
 */
export interface VoiceHandle {
    /** Unique identifier for this voice request */
    id: VoiceHandleId;
    /** The text phrase being synthesized */
    phrase: string;
    /** Current status of the voice generation */
    status: VoicePrepareStatus;
    /** Error message if status is 'failed' */
    error?: string;
    /** URL to the generated audio asset if status is 'ready' */
    assetUrl?: string;
}
/**
 * Result from waitForVoices async operation.
 * Categorizes handles by their final status after waiting.
 */
export interface VoiceWaitResult {
    /** Handles that successfully completed and are ready to play */
    ready: VoiceHandleId[];
    /** Handles that failed during generation */
    failed: VoiceHandleId[];
    /** Handles still pending (if timeout was reached) */
    pending: VoiceHandleId[];
}
/**
 * Options for waitForVoices async operation.
 */
export interface VoiceWaitOptions {
    /**
     * Maximum time to wait in milliseconds.
     * If not specified, waits indefinitely until all voices complete.
     */
    timeout?: number;
    /**
     * Use real time instead of game time (unaffected by pause/timeScale).
     * Default: true (voice generation happens in real-time)
     */
    realtime?: boolean;
}
//# sourceMappingURL=voice-handle.d.ts.map