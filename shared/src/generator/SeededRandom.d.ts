/**
 * SeededRandom - Deterministic RNG with Named Substreams
 *
 * Provides reproducible random number generation for game level generation.
 * Each "stream" (layout, oranges, motion, ids) gets its own independent sequence,
 * ensuring that order-of-iteration changes in one stream don't affect others.
 *
 * Uses Mulberry32 algorithm for better statistical properties than LCG.
 */
export type StreamName = 'layout' | 'oranges' | 'motion' | 'ids';
/**
 * Mulberry32 PRNG - high quality, fast, deterministic
 *
 * Reference: https://github.com/bryc/code/blob/master/jshash/PRNGs.md#mulberry32
 */
declare class Mulberry32 {
    private state;
    constructor(seed: number);
    /**
     * Generate next random float in [0, 1)
     */
    next(): number;
    /**
     * Generate random integer in [min, max] (inclusive)
     */
    nextInt(min: number, max: number): number;
    /**
     * Shuffle array in-place using Fisher-Yates
     */
    shuffle<T>(array: T[]): T[];
    /**
     * Pick random element from array
     */
    pick<T>(array: readonly T[]): T | undefined;
    /**
     * Generate random boolean
     */
    boolean(): boolean;
    /**
     * Generate random float in [min, max)
     */
    range(min: number, max: number): number;
}
/**
 * SeededRandom with Named Substreams
 *
 * Each stream (layout, oranges, motion, ids) maintains its own independent
 * random sequence. This ensures that:
 * - Same seed always produces identical sequences
 * - Drawing from one stream doesn't affect others
 * - Order of iteration in game objects doesn't cause bugs
 */
export declare class SeededRandom {
    private readonly streams;
    private readonly customStreams;
    constructor(seed: number);
    /**
     * Get random generator for a standard stream
     * Each stream maintains independent state
     */
    layout(): Mulberry32;
    oranges(): Mulberry32;
    motion(): Mulberry32;
    ids(): Mulberry32;
    /**
     * Get or create a custom named stream
     * Useful for additional substreams beyond the standard four
     */
    stream(name: string): Mulberry32;
    /**
     * Convenience methods delegating to layout stream
     * (for simple use cases where substreams aren't needed)
     */
    next(): number;
    nextInt(min: number, max: number): number;
    shuffle<T>(array: T[]): T[];
    pick<T>(array: readonly T[]): T | undefined;
    boolean(): boolean;
    range(min: number, max: number): number;
}
/**
 * Create a SeededRandom instance from a numeric seed
 * Provides named substreams for independent random sequences
 */
export declare function createSeededRandomWithSubstreams(seed: number): SeededRandom;
/**
 * Create a SeededRandom instance from a string seed
 * Hashes the string to produce a numeric seed
 */
export declare function createSeededRandomFromString(seedString: string): SeededRandom;
/**
 * Canonical JSON serialization for stable hashing
 * Sorts keys alphabetically to ensure consistent output
 */
export declare function canonicalize(obj: unknown): string;
/**
 * Create a seed from any serializable object
 * Useful for deriving seeds from game configuration
 */
export declare function seedFromObject(obj: unknown): number;
export {};
//# sourceMappingURL=SeededRandom.d.ts.map