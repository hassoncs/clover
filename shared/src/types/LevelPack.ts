/**
 * @file LevelPack.ts
 * @description Type definitions for level packs - containers that group related levels together.
 *
 * A LevelPack bundles multiple LevelDefinitions with shared configuration,
 * metadata, and ordering information. This enables:
 * - Game progression (unlockable levels)
 * - Difficulty tiers (easy/hard variants)
 * - Themed collections (holiday events, challenges)
 *
 * ## Pack Structure
 *
 * ```
 * LevelPack
 * ├── Metadata (id, name, version, description)
 * ├── Game Configuration (base GameDefinition shared by all levels)
 * ├── Levels (array of LevelDefinitions)
 * └── Progression Rules (unlock order, requirements)
 * ```
 *
 * ## Usage Pattern
 *
 * 1. Load the LevelPack
 * 2. Extract base GameDefinition for common templates/rules
 * 3. For each level, merge LevelDefinition with GameDefinition
 * 4. Apply game-specific overrides from LevelDefinition.overrides
 */

import type { LevelDefinition } from './LevelDefinition';

/**
 * Export level definition types for convenience
 */
export {
  type LevelDefinition,
  type LevelDifficultyParams,
  type DifficultyTier,
  type GeneratorInfo,
  type GameOverrides,
  type SlopeggleLevelOverrides,
  type PinballLevelOverrides,
  type VersionString,
  type Seed,
  isLevelDefinition,
  getLevelIdentity,
  validateLevelUniqueness,
  CURRENT_LEVEL_SCHEMA_VERSION,
  MIN_COMPATIBLE_SCHEMA_VERSION,
} from './LevelDefinition';

/**
 * Pack creation timestamp (Unix epoch milliseconds)
 */
export type Timestamp = number;

/**
 * Semantic version string for pack versioning.
 * Follows semver: MAJOR.MINOR.PATCH
 */
export type PackVersion = string;

/**
 * Category for organizing packs in the UI.
 */
export type PackCategory =
  | 'tutorial'
  | 'standard'
  | 'challenge'
  | 'event'
  | 'community'
  | 'generated';

/**
 * Target platform for the pack.
 */
export type PlatformTarget = 'ios' | 'android' | 'web' | 'all';

/**
 * Pack metadata - descriptive information about the pack.
 */
export interface PackMetadata {
  /** Globally unique pack identifier (e.g., "slopeggle-basic-v1") */
  id: string;
  /** Human-readable pack name */
  name: string;
  /** Brief description of the pack */
  description?: string;
  /** Author or creator name */
  author?: string;
  /** Pack version following semver */
  version: PackVersion;
  /** Category for UI organization */
  category?: PackCategory;
  /** Thumbnail image URL or asset reference */
  thumbnailUrl?: string;
  thumbnailAssetRef?: string;
  /** Target platforms */
  platforms?: PlatformTarget[];
  /** Tags for discovery */
  tags?: string[];
  /** Creation timestamp */
  createdAt?: Timestamp;
  /** Last update timestamp */
  updatedAt?: Timestamp;
}

/**
 * Difficulty distribution configuration for the pack.
 * Helps players understand the overall difficulty curve.
 */
export interface PackDifficultyDistribution {
  /** Number of trivial difficulty levels */
  trivialCount?: number;
  /** Number of easy difficulty levels */
  easyCount?: number;
  /** Number of medium difficulty levels */
  mediumCount?: number;
  /** Number of hard difficulty levels */
  hardCount?: number;
  /** Number of extreme difficulty levels */
  extremeCount?: number;
  /** Number of impossible difficulty levels */
  impossibleCount?: number;
}

/**
 * Progression rules for the pack.
 * Defines how players unlock and progress through levels.
 */
export interface PackProgression {
  /** Progression mode */
  mode: 'linear' | 'branching' | 'freeform';
  /** Required levels to unlock the next level (for linear mode) */
  unlockAfterCompleted?: string[];
  /** Levels that must be completed to unlock this pack (prerequisites) */
  prerequisites?: string[];
  /** Stars or points required to unlock (for branching mode) */
  unlockThreshold?: number;
  /** Whether the pack is currently available */
  isReleased?: boolean;
  /** Release date for time-gated packs */
  releaseDate?: Timestamp;
}

/**
 * Statistics about the pack.
 */
export interface PackStats {
  /** Total number of levels */
  levelCount: number;
  /** Total estimated playtime in minutes */
  estimatedPlaytimeMinutes?: number;
  /** Number of unique level seeds (for procedural content) */
  uniqueSeeds?: number;
  /** Difficulty distribution summary */
  difficultyDistribution?: PackDifficultyDistribution;
}

/**
 * Base game configuration shared by all levels in the pack.
 * This contains the stable GameDefinition that doesn't change per level.
 *
 * @example
 * ```typescript
 * {
 *   baseGameDefinition: {
 *     metadata: { id: "slopeggle", title: "Slopeggle", ... },
 *     world: { gravity: { x: 0, y: -5 }, pixelsPerMeter: 50, ... },
 *     templates: { ball: {...}, cannon: {...}, ... },
 *     rules: [...]
 *   }
 * }
 * ```
 */
export interface PackGameConfig {
  /** Base game definition shared across all levels */
  baseGameDefinition?: Record<string, unknown>;
  /** Template IDs that are fixed across all levels */
  fixedTemplateIds?: string[];
  /** Template IDs that vary per level (generated/overridden) */
  variableTemplateIds?: string[];
  /** Shared entities that exist in every level */
  fixedEntityIds?: string[];
  /** Entity IDs that are level-specific */
  variableEntityIds?: string[];
}

/**
 * A collection of levels that share common configuration.
 *
 * The pack serves as the primary unit for:
 * - Distribution (download/install)
 * - Progression tracking (unlocks, stars)
 * - Player engagement (achievements, streaks)
 */
export interface LevelPack {
  /** Schema version for pack structure */
  schemaVersion: number;
  /** Pack metadata */
  metadata: PackMetadata;
  /** Pack version (synced with metadata.version) */
  version: PackVersion;
  /** Game configuration shared across levels */
  gameConfig?: PackGameConfig;
  /** Array of level definitions */
  levels: LevelDefinition[];
  /** Progression and unlock rules */
  progression?: PackProgression;
  /** Pack statistics */
  stats?: PackStats;
  /** Custom metadata */
  metadataExtra?: Record<string, unknown>;
}

/**
 * Summary view of a pack (for listing/selection UIs).
 * Contains essential info without the full level list.
 */
export interface PackSummary {
  /** Pack identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Brief description */
  description?: string;
  /** Pack version */
  version: PackVersion;
  /** Category for organization */
  category?: PackCategory;
  /** Number of levels */
  levelCount: number;
  /** Difficulty distribution summary */
  difficultySummary?: string;
  /** Thumbnail image */
  thumbnailUrl?: string;
  thumbnailAssetRef?: string;
  /** Is the pack complete (all levels unlocked) */
  isComplete?: boolean;
  /** Player's progress percentage (0-100) */
  progressPercent?: number;
}

/**
 * Level progression status within a pack.
 */
export interface PackLevelProgress {
  /** Level identity: `${packId}:${levelId}` */
  levelIdentity: string;
  /** Whether the level has been completed */
  isCompleted: boolean;
  /** Best score achieved */
  highScore?: number;
  /** Stars earned (0-3) */
  stars?: number;
  /** Number of attempts */
  attemptCount?: number;
  /** Last played timestamp */
  lastPlayedAt?: Timestamp;
}

/**
 * Player's overall progress within a pack.
 */
export interface PackProgress {
  /** Pack identifier */
  packId: string;
  /** Levels completed */
  completedLevelIds: string[];
  /** Current level being played */
  currentLevelId?: string;
  /** Total stars earned */
  totalStars: number;
  /** Maximum possible stars */
  maxStars: number;
  /** Overall progress percentage */
  progressPercent: number;
  /** Detailed level progress */
  levelProgress: Record<string, PackLevelProgress>;
  /** Last update timestamp */
  updatedAt: Timestamp;
}

/**
 * Type guard to check if a value is a valid LevelPack.
 */
export function isLevelPack(value: unknown): value is LevelPack {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const pack = value as Record<string, unknown>;

  // Required fields
  if (typeof pack.schemaVersion !== 'number') return false;
  if (typeof pack.metadata !== 'object' || pack.metadata === null) return false;
  if (!Array.isArray(pack.levels)) return false;

  const metadata = pack.metadata as Record<string, unknown>;
  if (typeof metadata.id !== 'string') return false;
  if (typeof metadata.name !== 'string') return false;

  return true;
}

/**
 * Type guard to check if a value is a valid PackSummary.
 */
export function isPackSummary(value: unknown): value is PackSummary {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const summary = value as Record<string, unknown>;

  if (typeof summary.id !== 'string') return false;
  if (typeof summary.name !== 'string') return false;
  if (typeof summary.levelCount !== 'number') return false;

  return true;
}

/**
 * Get a level from the pack by its levelId.
 */
export function getLevelById(pack: LevelPack, levelId: string): LevelDefinition | undefined {
  return pack.levels.find((level) => level.levelId === levelId);
}

/**
 * Get a level by its full identity: `${packId}:${levelId}`.
 */
export function getLevelByIdentity(
  pack: LevelPack,
  identity: string,
): LevelDefinition | undefined {
  const [packId, levelId] = identity.split(':');
  if (packId !== pack.metadata.id) {
    return undefined;
  }
  return getLevelById(pack, levelId);
}

/**
 * Get levels ordered by their ordinal property.
 * Falls back to array order if ordinal is missing.
 */
export function getLevelsOrdered(pack: LevelPack): LevelDefinition[] {
  return [...pack.levels].sort((a, b) => {
    if (a.ordinal !== undefined && b.ordinal !== undefined) {
      return a.ordinal - b.ordinal;
    }
    // Fallback to array order if ordinals are missing
    return 0;
  });
}

/**
 * Calculate pack statistics from level definitions.
 */
export function calculatePackStats(levels: LevelDefinition[]): PackStats {
  const distribution: PackDifficultyDistribution = {};

  for (const level of levels) {
    const tier = level.difficulty?.targetTier;
    if (tier) {
      switch (tier) {
        case 'trivial':
          distribution.trivialCount = (distribution.trivialCount || 0) + 1;
          break;
        case 'easy':
          distribution.easyCount = (distribution.easyCount || 0) + 1;
          break;
        case 'medium':
          distribution.mediumCount = (distribution.mediumCount || 0) + 1;
          break;
        case 'hard':
          distribution.hardCount = (distribution.hardCount || 0) + 1;
          break;
        case 'extreme':
          distribution.extremeCount = (distribution.extremeCount || 0) + 1;
          break;
        case 'impossible':
          distribution.impossibleCount = (distribution.impossibleCount || 0) + 1;
          break;
      }
    }
  }

  const totalDuration = levels.reduce((sum, level) => {
    return sum + (level.difficulty?.estimatedDurationSeconds || 300); // Default 5 min
  }, 0);

  return {
    levelCount: levels.length,
    estimatedPlaytimeMinutes: Math.round(totalDuration / 60),
    uniqueSeeds: new Set(levels.map((l) => l.seed)).size,
    difficultyDistribution: distribution,
  };
}

/**
 * Generate pack summary from a full pack.
 */
export function generatePackSummary(pack: LevelPack, progress?: PackProgress): PackSummary {
  const stats = pack.stats || calculatePackStats(pack.levels);

  // Build difficulty summary string
  const difficultyParts: string[] = [];
  const dist = stats.difficultyDistribution;
  if (dist?.easyCount) difficultyParts.push(`${dist.easyCount}E`);
  if (dist?.mediumCount) difficultyParts.push(`${dist.mediumCount}M`);
  if (dist?.hardCount) difficultyParts.push(`${dist.hardCount}H`);
  const difficultySummary = difficultyParts.join('/') || 'Mixed';

  return {
    id: pack.metadata.id,
    name: pack.metadata.name,
    description: pack.metadata.description,
    version: pack.version,
    category: pack.metadata.category,
    levelCount: stats.levelCount,
    difficultySummary,
    thumbnailUrl: pack.metadata.thumbnailUrl,
    thumbnailAssetRef: pack.metadata.thumbnailAssetRef,
    isComplete: progress?.progressPercent === 100,
    progressPercent: progress?.progressPercent,
  };
}

/**
 * Validate pack-level identity uniqueness.
 */
export function validatePackLevelIdentities(pack: LevelPack): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const level of pack.levels) {
    const identity = `${pack.metadata.id}:${level.levelId}`;
    if (seen.has(identity)) {
      errors.push(`Duplicate level identity: ${identity}`);
    }
    seen.add(identity);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if a level is unlocked based on progression rules.
 */
export function isLevelUnlocked(
  pack: LevelPack,
  levelId: string,
  completedLevelIds: string[],
): boolean {
  if (!pack.progression) {
    return true; // No restrictions
  }

  const level = getLevelById(pack, levelId);
  if (!level) {
    return false;
  }

  const prerequisites = pack.progression.prerequisites || [];
  if (prerequisites.length > 0) {
    const allPrereqsMet = prerequisites.every((prereqId) => completedLevelIds.includes(prereqId));
    if (!allPrereqsMet) {
      return false;
    }
  }

  return true;
}

/**
 * Current schema major version for LevelPack.
 */
export const CURRENT_PACK_SCHEMA_VERSION = 1;

/**
 * Minimum compatible schema version for parsing packs.
 */
export const MIN_COMPATIBLE_PACK_VERSION = 1;
