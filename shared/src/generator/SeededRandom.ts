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
class Mulberry32 {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /**
   * Generate next random float in [0, 1)
   */
  next(): number {
    this.state += 0x6d2b79f5;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generate random integer in [min, max] (inclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Shuffle array in-place using Fisher-Yates
   */
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * Pick random element from array
   */
  pick<T>(array: readonly T[]): T | undefined {
    if (array.length === 0) return undefined;
    return array[this.nextInt(0, array.length - 1)];
  }

  /**
   * Generate random boolean
   */
  boolean(): boolean {
    return this.next() < 0.5;
  }

  /**
   * Generate random float in [min, max)
   */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

/**
 * Hash function to derive sub-seed from seed + stream name
 * Uses Mulberry32's mixing function for good distribution
 */
function hashSeedWithStream(seed: number, streamName: string): number {
  let h = 2166136261 >>> 0;
  
  // FNV-1a style hash combined with seed
  for (let i = 0; i < streamName.length; i++) {
    h ^= streamName.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  
  // Mix in the original seed
  h ^= seed;
  h = Math.imul(h, 16777619);
  
  // Final mixing using Mulberry32's approach for better distribution
  h += 0x6d2b79f5;
  let t = h;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  
  return ((t ^ (t >>> 14)) >>> 0) & 0xffffffff;
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
export class SeededRandom {
  private readonly streams: Map<StreamName, Mulberry32>;
  private readonly customStreams: Map<string, Mulberry32>;

  constructor(seed: number) {
    this.streams = new Map<StreamName, Mulberry32>();
    this.customStreams = new Map<string, Mulberry32>();
    
    // Initialize standard streams with derived sub-seeds
    const standardStreams: StreamName[] = ['layout', 'oranges', 'motion', 'ids'];
    for (const streamName of standardStreams) {
      const subSeed = hashSeedWithStream(seed, streamName);
      this.streams.set(streamName, new Mulberry32(subSeed));
    }
  }

  /**
   * Get random generator for a standard stream
   * Each stream maintains independent state
   */
  layout(): Mulberry32 {
    return this.streams.get('layout')!;
  }

  oranges(): Mulberry32 {
    return this.streams.get('oranges')!;
  }

  motion(): Mulberry32 {
    return this.streams.get('motion')!;
  }

  ids(): Mulberry32 {
    return this.streams.get('ids')!;
  }

  /**
   * Get or create a custom named stream
   * Useful for additional substreams beyond the standard four
   */
  stream(name: string): Mulberry32 {
    let rng = this.customStreams.get(name);
    if (!rng) {
      // Get the base seed from one of the standard streams (using layout)
      // This ensures deterministic derivation while keeping streams independent
      const baseState = this.streams.get('layout')!.nextInt(0, 0x7fffffff);
      const subSeed = hashSeedWithStream(baseState, name);
      rng = new Mulberry32(subSeed);
      this.customStreams.set(name, rng);
    }
    return rng;
  }

  /**
   * Convenience methods delegating to layout stream
   * (for simple use cases where substreams aren't needed)
   */
  next(): number {
    return this.layout().next();
  }

  nextInt(min: number, max: number): number {
    return this.layout().nextInt(min, max);
  }

  shuffle<T>(array: T[]): T[] {
    return this.layout().shuffle(array);
  }

  pick<T>(array: readonly T[]): T | undefined {
    return this.layout().pick(array);
  }

  boolean(): boolean {
    return this.layout().boolean();
  }

  range(min: number, max: number): number {
    return this.layout().range(min, max);
  }
}

/**
 * Create a SeededRandom instance from a numeric seed
 * Provides named substreams for independent random sequences
 */
export function createSeededRandomWithSubstreams(seed: number): SeededRandom {
  return new SeededRandom(seed);
}

/**
 * Create a SeededRandom instance from a string seed
 * Hashes the string to produce a numeric seed
 */
export function createSeededRandomFromString(seedString: string): SeededRandom {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < seedString.length; i++) {
    hash ^= seedString.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return new SeededRandom(hash);
}

/**
 * Canonical JSON serialization for stable hashing
 * Sorts keys alphabetically to ensure consistent output
 */
export function canonicalize(obj: unknown): string {
  if (obj === null) return 'null';
  if (obj === undefined) return 'undefined';
  
  const type = typeof obj;
  
  if (type === 'number') {
    // Handle NaN and Infinity consistently
    if (Number.isNaN(obj)) return '{"type":"number","value":"NaN"}';
    if (obj === Infinity) return '{"type":"number","value":"Infinity"}';
    if (obj === -Infinity) return '{"type":"number","value":"-Infinity"}';
    return String(obj);
  }
  
  if (type === 'string') {
    return JSON.stringify(obj);
  }
  
  if (type === 'boolean') {
    return String(obj);
  }
  
  if (Array.isArray(obj)) {
    const items = obj.map(item => canonicalize(item));
    return '[' + items.join(',') + ']';
  }
  
  if (type === 'object') {
    const keys = Object.keys(obj as object).sort();
    const pairs = keys.map(key => {
      return canonicalize(key) + ':' + canonicalize((obj as Record<string, unknown>)[key]);
    });
    return '{' + pairs.join(',') + '}';
  }
  
  return String(obj);
}

/**
 * Create a seed from any serializable object
 * Useful for deriving seeds from game configuration
 */
export function seedFromObject(obj: unknown): number {
  const canonical = canonicalize(obj);
  let hash = 2166136261 >>> 0;
  
  for (let i = 0; i < canonical.length; i++) {
    hash ^= canonical.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  
  // Ensure non-zero seed (Mulberry32 handles 0, but it's good practice)
  return hash || 1;
}
