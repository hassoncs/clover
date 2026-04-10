import { z } from 'zod';
/**
 * Game Progress Persistence System
 *
 * Provides type-safe, schema-validated persistence for game progress.
 * Games opt-in by declaring a persistence config in their GameDefinition.
 */
/**
 * Base progress schema that all game progress schemas should extend.
 * Provides common metadata fields for tracking play history.
 */
export declare const BaseGameProgressSchema: z.ZodObject<{
    /** Schema version for migrations */
    version: z.ZodDefault<z.ZodNumber>;
    /** Timestamp of last play session */
    lastPlayedAt: z.ZodOptional<z.ZodNumber>;
    /** Total play time in seconds */
    totalPlayTime: z.ZodDefault<z.ZodNumber>;
    /** Number of completed play sessions */
    sessionsCompleted: z.ZodDefault<z.ZodNumber>;
    /** First time the game was played */
    firstPlayedAt: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    version?: number;
    lastPlayedAt?: number;
    totalPlayTime?: number;
    sessionsCompleted?: number;
    firstPlayedAt?: number;
}, {
    version?: number;
    lastPlayedAt?: number;
    totalPlayTime?: number;
    sessionsCompleted?: number;
    firstPlayedAt?: number;
}>;
export type BaseGameProgress = z.infer<typeof BaseGameProgressSchema>;
/**
 * Configuration for when to automatically save progress.
 */
export declare const AutoSaveConfigSchema: z.ZodObject<{
    /** Save when player completes a level */
    onLevelComplete: z.ZodOptional<z.ZodBoolean>;
    /** Save when player wins the game */
    onGameWin: z.ZodOptional<z.ZodBoolean>;
    /** Save when player loses */
    onGameLose: z.ZodOptional<z.ZodBoolean>;
    /** Auto-save interval in milliseconds (0 to disable) */
    interval: z.ZodOptional<z.ZodNumber>;
    /** Save when app goes to background */
    onBackground: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    onLevelComplete?: boolean;
    onGameWin?: boolean;
    onGameLose?: boolean;
    interval?: number;
    onBackground?: boolean;
}, {
    onLevelComplete?: boolean;
    onGameWin?: boolean;
    onGameLose?: boolean;
    interval?: number;
    onBackground?: boolean;
}>;
export type AutoSaveConfig = z.infer<typeof AutoSaveConfigSchema>;
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
export type ProgressMigration<T> = (oldData: unknown, fromVersion: number, toVersion: number) => T;
/**
 * Simple high-score only progress schema.
 * Good for arcade-style games.
 */
export declare const HighScoreProgressSchema: z.ZodObject<{
    /** Schema version for migrations */
    version: z.ZodDefault<z.ZodNumber>;
    /** Timestamp of last play session */
    lastPlayedAt: z.ZodOptional<z.ZodNumber>;
    /** Total play time in seconds */
    totalPlayTime: z.ZodDefault<z.ZodNumber>;
    /** Number of completed play sessions */
    sessionsCompleted: z.ZodDefault<z.ZodNumber>;
    /** First time the game was played */
    firstPlayedAt: z.ZodOptional<z.ZodNumber>;
} & {
    highScore: z.ZodDefault<z.ZodNumber>;
    gamesPlayed: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    version?: number;
    lastPlayedAt?: number;
    totalPlayTime?: number;
    sessionsCompleted?: number;
    firstPlayedAt?: number;
    highScore?: number;
    gamesPlayed?: number;
}, {
    version?: number;
    lastPlayedAt?: number;
    totalPlayTime?: number;
    sessionsCompleted?: number;
    firstPlayedAt?: number;
    highScore?: number;
    gamesPlayed?: number;
}>;
export type HighScoreProgress = z.infer<typeof HighScoreProgressSchema>;
/**
 * Level-based progress schema.
 * Good for puzzle games with level progression.
 */
export declare const LevelProgressSchema: z.ZodObject<{
    /** Schema version for migrations */
    version: z.ZodDefault<z.ZodNumber>;
    /** Timestamp of last play session */
    lastPlayedAt: z.ZodOptional<z.ZodNumber>;
    /** Total play time in seconds */
    totalPlayTime: z.ZodDefault<z.ZodNumber>;
    /** Number of completed play sessions */
    sessionsCompleted: z.ZodDefault<z.ZodNumber>;
    /** First time the game was played */
    firstPlayedAt: z.ZodOptional<z.ZodNumber>;
} & {
    currentLevel: z.ZodDefault<z.ZodNumber>;
    highestLevelCompleted: z.ZodDefault<z.ZodNumber>;
    levelAttempts: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    version?: number;
    lastPlayedAt?: number;
    totalPlayTime?: number;
    sessionsCompleted?: number;
    firstPlayedAt?: number;
    currentLevel?: number;
    highestLevelCompleted?: number;
    levelAttempts?: Record<string, number>;
}, {
    version?: number;
    lastPlayedAt?: number;
    totalPlayTime?: number;
    sessionsCompleted?: number;
    firstPlayedAt?: number;
    currentLevel?: number;
    highestLevelCompleted?: number;
    levelAttempts?: Record<string, number>;
}>;
export type LevelProgress = z.infer<typeof LevelProgressSchema>;
/**
 * Unlock-based progress schema.
 * Good for games with unlockable content.
 */
export declare const UnlockProgressSchema: z.ZodObject<{
    /** Schema version for migrations */
    version: z.ZodDefault<z.ZodNumber>;
    /** Timestamp of last play session */
    lastPlayedAt: z.ZodOptional<z.ZodNumber>;
    /** Total play time in seconds */
    totalPlayTime: z.ZodDefault<z.ZodNumber>;
    /** Number of completed play sessions */
    sessionsCompleted: z.ZodDefault<z.ZodNumber>;
    /** First time the game was played */
    firstPlayedAt: z.ZodOptional<z.ZodNumber>;
} & {
    unlockedItems: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    achievements: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodBoolean>>;
    currency: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    version?: number;
    lastPlayedAt?: number;
    totalPlayTime?: number;
    sessionsCompleted?: number;
    firstPlayedAt?: number;
    unlockedItems?: string[];
    achievements?: Record<string, boolean>;
    currency?: number;
}, {
    version?: number;
    lastPlayedAt?: number;
    totalPlayTime?: number;
    sessionsCompleted?: number;
    firstPlayedAt?: number;
    unlockedItems?: string[];
    achievements?: Record<string, boolean>;
    currency?: number;
}>;
export type UnlockProgress = z.infer<typeof UnlockProgressSchema>;
/**
 * Progress schema for Ball Sort puzzle game.
 */
export declare const BallSortProgressSchema: z.ZodObject<{
    /** Schema version for migrations */
    version: z.ZodDefault<z.ZodNumber>;
    /** Timestamp of last play session */
    lastPlayedAt: z.ZodOptional<z.ZodNumber>;
    /** Total play time in seconds */
    totalPlayTime: z.ZodDefault<z.ZodNumber>;
    /** Number of completed play sessions */
    sessionsCompleted: z.ZodDefault<z.ZodNumber>;
    /** First time the game was played */
    firstPlayedAt: z.ZodOptional<z.ZodNumber>;
} & {
    /** Current level the player is on */
    currentLevel: z.ZodDefault<z.ZodNumber>;
    /** Highest level ever completed */
    highestLevelCompleted: z.ZodDefault<z.ZodNumber>;
    /** Total moves made across all levels */
    totalMoves: z.ZodDefault<z.ZodNumber>;
    /** Best time (in seconds) for each level */
    bestTimePerLevel: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    /** Best move count for each level */
    bestMovesPerLevel: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    /** Total play statistics */
    totalLevelsCompleted: z.ZodDefault<z.ZodNumber>;
    /** Current difficulty settings (derived from level) */
    currentDifficulty: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    version?: number;
    lastPlayedAt?: number;
    totalPlayTime?: number;
    sessionsCompleted?: number;
    firstPlayedAt?: number;
    currentLevel?: number;
    highestLevelCompleted?: number;
    totalMoves?: number;
    bestTimePerLevel?: Record<string, number>;
    bestMovesPerLevel?: Record<string, number>;
    totalLevelsCompleted?: number;
    currentDifficulty?: number;
}, {
    version?: number;
    lastPlayedAt?: number;
    totalPlayTime?: number;
    sessionsCompleted?: number;
    firstPlayedAt?: number;
    currentLevel?: number;
    highestLevelCompleted?: number;
    totalMoves?: number;
    bestTimePerLevel?: Record<string, number>;
    bestMovesPerLevel?: Record<string, number>;
    totalLevelsCompleted?: number;
    currentDifficulty?: number;
}>;
export type BallSortProgress = z.infer<typeof BallSortProgressSchema>;
/**
 * Progress schema for Flappy Bird style games.
 */
export declare const FlappyBirdProgressSchema: z.ZodObject<{
    /** Schema version for migrations */
    version: z.ZodDefault<z.ZodNumber>;
    /** Timestamp of last play session */
    lastPlayedAt: z.ZodOptional<z.ZodNumber>;
    /** Total play time in seconds */
    totalPlayTime: z.ZodDefault<z.ZodNumber>;
    /** Number of completed play sessions */
    sessionsCompleted: z.ZodDefault<z.ZodNumber>;
    /** First time the game was played */
    firstPlayedAt: z.ZodOptional<z.ZodNumber>;
} & {
    /** Highest score achieved */
    highScore: z.ZodDefault<z.ZodNumber>;
    /** Total games played */
    gamesPlayed: z.ZodDefault<z.ZodNumber>;
    /** Total pipes passed (cumulative) */
    totalPipesPassed: z.ZodDefault<z.ZodNumber>;
    /** Best session (consecutive pipes without dying) */
    bestStreak: z.ZodDefault<z.ZodNumber>;
    /** Unlockables */
    unlockedBirds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    version?: number;
    lastPlayedAt?: number;
    totalPlayTime?: number;
    sessionsCompleted?: number;
    firstPlayedAt?: number;
    highScore?: number;
    gamesPlayed?: number;
    totalPipesPassed?: number;
    bestStreak?: number;
    unlockedBirds?: string[];
}, {
    version?: number;
    lastPlayedAt?: number;
    totalPlayTime?: number;
    sessionsCompleted?: number;
    firstPlayedAt?: number;
    highScore?: number;
    gamesPlayed?: number;
    totalPipesPassed?: number;
    bestStreak?: number;
    unlockedBirds?: string[];
}>;
export type FlappyBirdProgress = z.infer<typeof FlappyBirdProgressSchema>;
//# sourceMappingURL=progress.d.ts.map