/**
 * @file LevelDefinition.ts
 * @description Type definitions for JSON level schemas used in AI-generated game levels.
 *
 * LevelDefinition is an "overlay" type that describes what changes per-level within a pack.
 * It does NOT contain full GameDefinition data (entities, templates, rules) - those are
 * typically defined once at the game/pack level and shared across levels.
 *
 * ## Schema Versioning Strategy
 *
 * - `schemaVersion`: Major version bump indicates breaking changes requiring migration
 * - Minor/Patch: Handled via forward-compatible optional fields
 * - When upgrading: Parse with oldest compatible version, transform to current
 *
 * ## Game-Specific Overrides
 *
 * Game-specific fields should be namespaced under `overrides.{gameId}` to avoid collisions.
 * This keeps the core schema game-agnostic while allowing per-game customization.
 *
 * ## Pack:Level Identity Guardrails
 *
 * Each level has a unique identity within its pack: `{packId}:{levelId}`
 * - `packId`: Globally unique identifier for the level pack
 * - `levelId`: Unique within the pack (e.g., "1", "2", "easy", "boss")
 * - Full identity: `${packId}:${levelId}` (e.g., "slopeggle-pack-v1:easy")
 */

/**
 * Semantic version string (e.g., "1.0.0", "2.1.3")
 */
export type VersionString = string;

/**
 * Seed for deterministic random generation.
 * String format allows for various seed types (numeric, UUID, hash).
 */
export type Seed = string;

/**
 * Difficulty tier for the level.
 * Used for player progression and pack organization.
 */
export type DifficultyTier = 'trivial' | 'easy' | 'medium' | 'hard' | 'extreme' | 'impossible';

/**
 * Optional difficulty parameters that generators can use.
 * These are hints/suggestions - generators may interpret them flexibly.
 */
export interface LevelDifficultyParams {
  /** Target difficulty tier (suggestion to generator) */
  targetTier?: DifficultyTier;
  /** Minimum score threshold for completion */
  minScoreThreshold?: number;
  /** Maximum score threshold for completion */
  maxScoreThreshold?: number;
  /** Estimated time to complete in seconds */
  estimatedDurationSeconds?: number;
  /** Number of lives/balls player starts with */
  initialLives?: number;
  /** Score multiplier at start */
  initialMultiplier?: number;
  /** Difficulty curve within the level (progressive, constant, spike) */
  difficultyCurve?: 'progressive' | 'constant' | 'spike';
}

/**
 * Core level identity and generation metadata.
 * Required fields present in every level definition.
 */
export interface LevelIdentity {
  /** Unique level identifier within the pack (e.g., "1", "boss", "bonus") */
  levelId: string;
  /** Human-readable title for the level */
  title?: string;
  /** Brief description of the level */
  description?: string;
  /** Ordinal position in the pack (1-indexed) */
  ordinal?: number;
}

/**
 * Generator provenance tracking.
 * Enables reproducibility and debugging of AI-generated levels.
 */
export interface GeneratorInfo {
  /** Identifier of the generator that created this level */
  generatorId: string;
  /** Semantic version of the generator */
  generatorVersion: VersionString;
  /** Seed used for deterministic generation */
  seed: Seed;
  /** Timestamp of generation (Unix epoch milliseconds) */
  generatedAt?: number;
  /** Generator-specific parameters used */
  generatorParams?: Record<string, unknown>;
}

/**
 * Core schema versioning and compatibility.
 */
export interface SchemaVersion {
  /** Major version - increment on breaking changes */
  schemaVersion: number;
  /** Minimum compatible schema major version for parsing */
  minCompatibleVersion?: number;
}

/**
 * Game-specific overrides for the level.
 * Use namespaced keys to avoid collisions between games.
 *
 * @example
 * ```typescript
 * {
 *   overrides: {
 *     slopeggle: {
 *       pegRows: 15,
 *       orangePegCount: 12,
 *       hasBucket: true,
 *       hasPortals: false
 *     },
 *     pinball: {
 *       bumpers: 5,
 *       slingshots: 2
 *     }
 *   }
 * }
 * ```
 */
export interface GameOverrides {
  /** Slopeggle-specific level parameters */
  slopeggle?: SlopeggleLevelOverrides;
  /** Pinball-specific level parameters */
  pinball?: PinballLevelOverrides;
  /** Future games: add their overrides here - key is game ID, value is game-specific config */
  [gameId: string]: SlopeggleLevelOverrides | PinballLevelOverrides | Record<string, unknown> | undefined;
}

/**
 * Slopeggle-specific level configuration overrides.
 * These parameters influence how the peg layout and game elements are generated.
 */
export interface SlopeggleLevelOverrides {
  /** Number of peg rows to generate */
  pegRows?: number;
  /** Total number of orange (target) pegs */
  orangePegCount?: number;
  /** Include the free-ball bucket hazard */
  hasBucket?: boolean;
  /** Include teleport portals */
  hasPortals?: boolean;
  /** World width in meters */
  worldWidth?: number;
  /** World height in meters */
  worldHeight?: number;
  /** Ball launch force multiplier */
  launchForceMultiplier?: number;
  /** Enable slow-motion on final peg */
  dramaticFinalPeg?: boolean;
}

/**
 * Pinball-specific level configuration overrides.
 */
export interface PinballLevelOverrides {
  /** Number of bumpers */
  bumperCount?: number;
  /** Number of slingshots */
  slingshotCount?: number;
  /** Include multi-ball mode */
  hasMultiball?: boolean;
  /** Number of flippers */
  flipperCount?: number;
}

/**
 * Level definition overlay for AI-generated levels.
 *
 * This type describes what varies between levels in a pack.
 * Shared game configuration (templates, rules, base entities) is
 * defined at the pack level and merged with level-specific overrides.
 *
 * @example Basic level definition
 * ```json
 * {
 *   "schemaVersion": 1,
 *   "packId": "slopeggle-basic",
 *   "levelId": "1",
 *   "generatorId": "slopeggle-generator",
 *   "generatorVersion": "1.0.0",
 *   "seed": "abc123",
 *   "difficulty": {
 *     "targetTier": "easy",
 *     "initialLives": 10
 *   }
 * }
 * ```
 */
export interface LevelDefinition {
  /** Schema version for compatibility checking */
  schemaVersion: number;
  /** Globally unique pack identifier */
  packId: string;
  /** Level identity within the pack */
  levelId: string;
  /** Generator provenance */
  generatorId: string;
  generatorVersion: VersionString;
  seed: Seed;
  /** Human-readable title */
  title?: string;
  /** Brief description */
  description?: string;
  /** Difficulty configuration (optional hints for generator) */
  difficulty?: LevelDifficultyParams;
  /** Ordinal position in progression (1-indexed) */
  ordinal?: number;
  /** Generation timestamp */
  generatedAt?: number;
  /** Generator-specific parameters */
  generatorParams?: Record<string, unknown>;
  /** Game-specific overrides (namespaced by game ID) */
  overrides?: GameOverrides;
  /** Custom metadata not covered by standard fields */
  metadata?: Record<string, unknown>;
}

/**
 * Type guard to check if a value is a valid LevelDefinition.
 */
export function isLevelDefinition(value: unknown): value is LevelDefinition {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const def = value as Record<string, unknown>;

  // Required fields
  if (typeof def.schemaVersion !== 'number') return false;
  if (typeof def.packId !== 'string') return false;
  if (typeof def.levelId !== 'string') return false;
  if (typeof def.generatorId !== 'string') return false;
  if (typeof def.generatorVersion !== 'string') return false;
  if (typeof def.seed !== 'string') return false;

  return true;
}

/**
 * Generate the full level identity string: `${packId}:${levelId}`.
 */
export function getLevelIdentity(level: LevelDefinition): string {
  return `${level.packId}:${level.levelId}`;
}

/**
 * Validate that a level identity is unique within a set of levels.
 */
export function validateLevelUniqueness(
  levels: LevelDefinition[],
): { valid: boolean; duplicateIds: string[] } {
  const seen = new Set<string>();
  const duplicates: string[] = [];

  for (const level of levels) {
    const identity = getLevelIdentity(level);
    if (seen.has(identity)) {
      duplicates.push(identity);
    }
    seen.add(identity);
  }

  return {
    valid: duplicates.length === 0,
    duplicateIds: duplicates,
  };
}

/**
 * Current schema major version.
 * Increment this when making breaking changes.
 */
export const CURRENT_LEVEL_SCHEMA_VERSION = 1;

/**
 * Minimum compatible schema version for parsing.
 * Levels with schemaVersion < this require migration.
 */
export const MIN_COMPATIBLE_SCHEMA_VERSION = 1;
