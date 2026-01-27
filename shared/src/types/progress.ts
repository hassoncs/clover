import { z } from 'zod';

/**
 * Game Progress Persistence System
 *
 * Provides type-safe, schema-validated persistence for game progress.
 * Games opt-in by declaring a persistence config in their GameDefinition.
 */

// =============================================================================
// Base Progress Schema
// =============================================================================

/**
 * Base progress schema that all game progress schemas should extend.
 * Provides common metadata fields for tracking play history.
 */
export const BaseGameProgressSchema = z.object({
  /** Schema version for migrations */
  version: z.number().default(1),

  /** Timestamp of last play session */
  lastPlayedAt: z.number().optional(),

  /** Total play time in seconds */
  totalPlayTime: z.number().default(0),

  /** Number of completed play sessions */
  sessionsCompleted: z.number().default(0),

  /** First time the game was played */
  firstPlayedAt: z.number().optional(),
});

export type BaseGameProgress = z.infer<typeof BaseGameProgressSchema>;

// =============================================================================
// Auto-save Configuration
// =============================================================================

/**
 * Configuration for when to automatically save progress.
 */
export const AutoSaveConfigSchema = z.object({
  /** Save when player completes a level */
  onLevelComplete: z.boolean().optional(),

  /** Save when player wins the game */
  onGameWin: z.boolean().optional(),

  /** Save when player loses */
  onGameLose: z.boolean().optional(),

  /** Auto-save interval in milliseconds (0 to disable) */
  interval: z.number().optional(),

  /** Save when app goes to background */
  onBackground: z.boolean().optional().default(true),
});

export type AutoSaveConfig = z.infer<typeof AutoSaveConfigSchema>;

// =============================================================================
// Persistence Configuration
// =============================================================================

/**
 * Persistence configuration for a game.
 * Games add this to their GameDefinition to opt-in to persistence.
 *
 * @example
 * ```typescript
 * const game: GameDefinition = {
 *   metadata: { id: "my-game", title: "My Game", version: "1.0.0" },
 *   persistence: {
 *     schema: MyGameProgressSchema,
 *     version: 1,
 *     defaultProgress: { currentLevel: 1, highScore: 0 },
 *     autoSave: { onLevelComplete: true },
 *   },
 *   // ... rest of game definition
 * };
 * ```
 */
export interface PersistenceConfig<T = unknown> {
  /** Storage key (defaults to game metadata id) */
  storageKey?: string;

  /** Zod schema for validation */
  schema: z.ZodType<T>;

  /** Default progress state for new players */
  defaultProgress: T;

  /** Schema version for migrations */
  version: number;

  /** Auto-save triggers */
  autoSave?: AutoSaveConfig;
}

// =============================================================================
// Progress Manager Types
// =============================================================================

/**
 * Result of loading progress from storage.
 */
export interface LoadProgressResult<T> {
  /** Whether the load was successful */
  success: boolean;

  /** The loaded progress data (or defaults on failure) */
  data: T;

  /** Whether data was migrated during load */
  migrated: boolean;

  /** Error messages if load failed */
  errors?: string[];
}

/**
 * Progress manager options for initialization.
 */
export interface ProgressManagerOptions<T> {
  /** Unique game identifier */
  gameId: string;

  /** Persistence configuration */
  config: PersistenceConfig<T>;
}

/**
 * Migration function type for schema version upgrades.
 */
export type ProgressMigration<T> = (
  oldData: unknown,
  fromVersion: number,
  toVersion: number
) => T;

// =============================================================================
// Common Progress Schemas for Reuse
// =============================================================================

/**
 * Simple high-score only progress schema.
 * Good for arcade-style games.
 */
export const HighScoreProgressSchema = BaseGameProgressSchema.extend({
  highScore: z.number().default(0),
  gamesPlayed: z.number().default(0),
});

export type HighScoreProgress = z.infer<typeof HighScoreProgressSchema>;

/**
 * Level-based progress schema.
 * Good for puzzle games with level progression.
 */
export const LevelProgressSchema = BaseGameProgressSchema.extend({
  currentLevel: z.number().default(1),
  highestLevelCompleted: z.number().default(0),
  levelAttempts: z.record(z.number()).default({}),
});

export type LevelProgress = z.infer<typeof LevelProgressSchema>;

/**
 * Unlock-based progress schema.
 * Good for games with unlockable content.
 */
export const UnlockProgressSchema = BaseGameProgressSchema.extend({
  unlockedItems: z.array(z.string()).default([]),
  achievements: z.record(z.boolean()).default({}),
  currency: z.number().default(0),
});

export type UnlockProgress = z.infer<typeof UnlockProgressSchema>;

// =============================================================================
// Ball Sort Specific Progress
// =============================================================================

/**
 * Progress schema for Ball Sort puzzle game.
 */
export const BallSortProgressSchema = BaseGameProgressSchema.extend({
  /** Current level the player is on */
  currentLevel: z.number().default(1),

  /** Highest level ever completed */
  highestLevelCompleted: z.number().default(0),

  /** Total moves made across all levels */
  totalMoves: z.number().default(0),

  /** Best time (in seconds) for each level */
  bestTimePerLevel: z.record(z.number()).default({}),

  /** Best move count for each level */
  bestMovesPerLevel: z.record(z.number()).default({}),

  /** Total play statistics */
  totalLevelsCompleted: z.number().default(0),

  /** Current difficulty settings (derived from level) */
  currentDifficulty: z.number().default(1),
});

export type BallSortProgress = z.infer<typeof BallSortProgressSchema>;

// =============================================================================
// Flappy Bird Specific Progress
// =============================================================================

/**
 * Progress schema for Flappy Bird style games.
 */
export const FlappyBirdProgressSchema = BaseGameProgressSchema.extend({
  /** Highest score achieved */
  highScore: z.number().default(0),

  /** Total games played */
  gamesPlayed: z.number().default(0),

  /** Total pipes passed (cumulative) */
  totalPipesPassed: z.number().default(0),

  /** Best session (consecutive pipes without dying) */
  bestStreak: z.number().default(0),

  /** Unlockables */
  unlockedBirds: z.array(z.string()).default(['default']),
});

export type FlappyBirdProgress = z.infer<typeof FlappyBirdProgressSchema>;
