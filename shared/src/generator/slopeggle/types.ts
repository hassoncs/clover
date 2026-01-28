/**
 * @file SlopeggleLevelOverlay.ts
 * @description Slopeggle-specific level overlay types extending LevelDefinition.
 *
 * Defines the per-level data structure for Slopeggle boards including:
 * - Peg positions and colors (orange/blue)
 * - Motion parameters for dynamic elements
 * - Difficulty tuning parameters
 */

import type { LevelDefinition, LevelDifficultyParams, Seed } from "../../types/LevelDefinition";

/**
 * Peg motion type for animated elements.
 */
export type PegMotionType = "static" | "oscillate" | "rotate" | "pulse";

/**
 * Motion parameters for dynamic pegs.
 */
export interface PegMotionConfig {
  /** Type of motion */
  type: PegMotionType;
  /** Motion axis for oscillation ('x', 'y', or 'both') */
  axis?: "x" | "y" | "both";
  /** Amplitude in world units */
  amplitude?: number;
  /** Frequency in Hz */
  frequency?: number;
  /** Phase offset (0-2π) */
  phase?: number;
  /** Rotation speed (degrees/second) for rotate motion */
  rotationSpeed?: number;
}

/**
 * Individual peg definition in the level overlay.
 */
export interface SlopegglePeg {
  /** X position in world coordinates */
  x: number;
  /** Y position in world coordinates */
  y: number;
  /** Whether this is an orange (target) peg */
  isOrange: boolean;
  /** Optional motion configuration for dynamic pegs */
  motion?: PegMotionConfig;
}

/**
 * Dynamic element configuration (bucket, portals, etc.)
 */
export interface SlopeggleDynamicElement {
  /** Element type */
  type: "bucket" | "portalA" | "portalB";
  /** Base X position */
  x: number;
  /** Base Y position */
  y: number;
  /** Motion configuration (if animated) */
  motion?: PegMotionConfig;
}

/**
 * Slopeggle-specific level data overlay.
 * Extends LevelDefinition with game-specific peg layout and configuration.
 */
export interface SlopeggleLevelOverlay extends LevelDefinition {
  /** Slopeggle-specific game ID */
  generatorId: "slopeggle-generator";

  /** Peg layout for the level */
  pegs: SlopegglePeg[];

  /** Number of lives/balls the player starts with */
  lives: number;

  /** Dynamic elements (bucket, portals) */
  dynamicElements?: SlopeggleDynamicElement[];

  /** Slopeggle-specific difficulty parameters */
  slopeggleDifficulty?: SlopeggleDifficultyParams;
}

/**
 * Generator-specific difficulty parameters for fine-tuning.
 */
export interface SlopeggleDifficultyParams extends LevelDifficultyParams {
  /** Target number of orange pegs */
  orangeCount: number;
  /** Minimum number of oranges accessible from launcher */
  minOrangeAccessibility: number;
  /** Whether to include the free-ball bucket */
  hasBucket: boolean;
  /** Whether to include teleport portals */
  hasPortals: boolean;
  /** Bucket oscillation amplitude (0 = no bucket) */
  bucketAmplitude: number;
  /** Bucket oscillation frequency in Hz */
  bucketFrequency: number;
  /** World width override (default: 12) */
  worldWidth?: number;
  /** World height override (default: 16) */
  worldHeight?: number;
}

/**
 * Input parameters for generating a Slopeggle level.
 */
export interface GenerateSlopeggleLevelParams {
  /** Seed for deterministic generation */
  seed: Seed | number;
  /** Pack identifier */
  packId: string;
  /** Level identifier within the pack */
  levelId: string;
  /** Target difficulty tier */
  difficultyTier?: "easy" | "medium" | "hard" | "extreme";
  /** Optional title override */
  title?: string;
  /** Optional description override */
  description?: string;
  /** Ordinal position in progression (1-indexed) */
  ordinal?: number;
  /** Override number of orange pegs */
  orangeCount?: number;
  /** Override initial lives */
  lives?: number;
  /** Include bucket (default: true) */
  hasBucket?: boolean;
  /** Include portals (default: true) */
  hasPortals?: boolean;
  /** Bucket oscillation amplitude (0 = no bucket) */
  bucketAmplitude?: number;
  /** Bucket oscillation frequency */
  bucketFrequency?: number;
  /** Minimum accessible oranges (for accessibility tuning) */
  minOrangeAccessibility?: number;
}

/**
 * Default difficulty presets for Slopeggle.
 */
export const SLOPEGGLE_DIFFICULTY_PRESETS = {
  easy: {
    orangeCount: 6,
    lives: 12,
    hasBucket: true,
    hasPortals: false,
    bucketAmplitude: 3,
    bucketFrequency: 0.2,
    minOrangeAccessibility: 3,
  },
  medium: {
    orangeCount: 8,
    lives: 10,
    hasBucket: true,
    hasPortals: true,
    bucketAmplitude: 4,
    bucketFrequency: 0.25,
    minOrangeAccessibility: 4,
  },
  hard: {
    orangeCount: 10,
    lives: 8,
    hasBucket: true,
    hasPortals: true,
    bucketAmplitude: 5,
    bucketFrequency: 0.3,
    minOrangeAccessibility: 5,
  },
  extreme: {
    orangeCount: 12,
    lives: 6,
    hasBucket: true,
    hasPortals: true,
    bucketAmplitude: 6,
    bucketFrequency: 0.35,
    minOrangeAccessibility: 4,
  },
} as const;

/**
 * Default world configuration for Slopeggle.
 */
export const SLOPEGGLE_WORLD_DEFAULTS = {
  width: 12,
  height: 16,
  pegRows: 12,
  pegRadius: 0.125,
  launcherY: 1,
  drainY: 15.5,
  bucketY: 14.5,
};

/**
 * Type guard to check if a value is a valid SlopeggleLevelOverlay.
 */
export function isSlopeggleLevelOverlay(value: unknown): value is SlopeggleLevelOverlay {
  if (!value || typeof value !== "object") {
    return false;
  }

  const overlay = value as Record<string, unknown>;

  // Check generator ID
  if (overlay.generatorId !== "slopeggle-generator") {
    return false;
  }

  // Check required fields
  if (!Array.isArray(overlay.pegs)) {
    return false;
  }

  if (typeof overlay.lives !== "number") {
    return false;
  }

  // Validate peg structure
  for (const peg of overlay.pegs) {
    if (typeof peg !== "object") {
      return false;
    }
    const p = peg as Record<string, unknown>;
    if (typeof p.x !== "number" || typeof p.y !== "number" || typeof p.isOrange !== "boolean") {
      return false;
    }
  }

  return true;
}
