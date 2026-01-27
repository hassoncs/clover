# Game Progress Persistence System Design

## Executive Summary

This document outlines a comprehensive persistence system for the Slopcade game engine that enables games like Ball Sort to maintain long-term progress (current level, high scores, unlocked content) across game sessions. The system is designed to be **opt-in per game**, **backward compatible**, and **extensible** for future game types.

---

## Current State Analysis

### Existing Infrastructure

1. **Storage Layer** (`app/lib/utils/storage.ts`)
   - Cross-platform storage using `localStorage` (web) and `AsyncStorage` (native)
   - Type-safe JSON serialization helpers: `getStorageItem<T>()` and `setStorageItem<T>()`
   - Already used for user preferences and dev settings

2. **Game Definition Structure** (`shared/src/types/GameDefinition.ts`)
   - Games are defined as JSON-serializable `GameDefinition` objects
   - Contains: `metadata`, `world`, `templates`, `entities`, `rules`, `variables`, etc.
   - No existing persistence hooks for game-level progress

3. **Ball Sort Game** (`app/lib/test-games/games/ballSort/`)
   - Uses `puzzleGenerator.ts` with `generateVerifiedPuzzle(config: PuzzleConfig)`
   - Currently uses static `DEFAULT_DIFFICULTY = 5`
   - Puzzle is generated once at module load time (line 54)
   - No concept of level progression or saved state

4. **Game Lifecycle** (`app/lib/game-engine/GameLoader.ts`)
   - `load(definition)` → creates world, entities, rules
   - `unload(game)` → cleanup
   - `reload(game)` → full reset
   - No persistence hooks in the lifecycle

5. **Checkpoint System** (`shared/src/systems/checkpoint/`)
   - Exists for in-game checkpoint/save-state within a session
   - Saves: score, lives, time, variables, entity positions
   - Different use case: mid-level save vs. cross-session progress

---

## Design Goals

| Goal | Description |
|------|-------------|
| **Opt-in** | Games must explicitly declare they want persistence |
| **Type-safe** | Full TypeScript support with validated schemas |
| **Cross-platform** | Works on web, iOS, Android seamlessly |
| **Isolated** | Each game's progress is namespaced by game ID |
| **Extensible** | Games can define their own progress data shape |
| **Backward Compatible** | Existing games continue to work unchanged |
| **Atomic** | Updates are atomic to prevent corruption |
| **Observable** | React hooks for real-time progress updates |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Game Progress Persistence System                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────────┐  │
│  │  Game Definition │    │  Progress Schema │    │  Persistence Config  │  │
│  │  (with progress) │───▶│  (Zod/TS types)  │───▶│  (storage key, etc)  │  │
│  └──────────────────┘    └──────────────────┘    └──────────────────────┘  │
│           │                       │                       │                 │
│           ▼                       ▼                       ▼                 │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                     GameProgressManager (Core)                        │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│  │  │   Load      │  │   Save      │  │   Reset     │  │   Migrate   │  │  │
│  │  │  Progress   │  │  Progress   │  │  Progress   │  │   Schema    │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│           │                                                                │
│           ▼                                                                │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐     │
│  │  Storage Adapter │───▶│  localStorage/   │───▶│  Encrypted JSON  │     │
│  │  (pluggable)     │    │  AsyncStorage    │    │  (optional)      │     │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘     │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                        React Integration Layer                        │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐   │  │
│  │  │ useGameProgress │  │ useCurrentLevel │  │ useProgressUnlocks  │   │  │
│  │  │    (generic)    │  │  (Ball Sort)    │  │   (achievements)    │   │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Progress Schema Definition

Games define their progress structure using Zod schemas for runtime validation:

```typescript
// shared/src/types/progress.ts

import { z } from 'zod';

// Base progress schema that all games extend
export const BaseGameProgressSchema = z.object({
  version: z.number().default(1),
  lastPlayedAt: z.number().optional(), // timestamp
  totalPlayTime: z.number().default(0), // seconds
  sessionsCompleted: z.number().default(0),
});

export type BaseGameProgress = z.infer<typeof BaseGameProgressSchema>;

// Ball Sort specific progress
export const BallSortProgressSchema = BaseGameProgressSchema.extend({
  currentLevel: z.number().default(1),
  highestLevelCompleted: z.number().default(0),
  totalMoves: z.number().default(0),
  bestTimePerLevel: z.record(z.number()).default({}),
  difficultyProgression: z.object({
    currentDifficulty: z.number().default(1),
    difficultyRamp: z.number().default(0.5), // how much diff increases per level
  }).default({}),
});

export type BallSortProgress = z.infer<typeof BallSortProgressSchema>;

// Generic type for any game's progress
export type GameProgress = BaseGameProgress | BallSortProgress | Record<string, unknown>;
```

### 2. Persistence Configuration in GameDefinition

Games opt-in by adding a `persistence` section to their `GameDefinition`:

```typescript
// shared/src/types/GameDefinition.ts (addition)

export interface PersistenceConfig<T = unknown> {
  /** Unique storage key (defaults to game metadata id) */
  storageKey?: string;
  
  /** Zod schema for validation */
  schema: z.ZodType<T>;
  
  /** Default progress state */
  defaultProgress: T;
  
  /** Schema version for migrations */
  version: number;
  
  /** Whether to encrypt stored data */
  encrypt?: boolean;
  
  /** Auto-save triggers */
  autoSave?: {
    onLevelComplete?: boolean;
    onGameWin?: boolean;
    onGameLose?: boolean;
    interval?: number; // auto-save every N seconds
  };
}

// Add to GameDefinition interface:
export interface GameDefinition {
  // ... existing fields ...
  
  /** Optional persistence configuration */
  persistence?: PersistenceConfig;
}
```

### 3. Ball Sort Game with Persistence

```typescript
// app/lib/test-games/games/ballSort/game.ts

import { BallSortProgressSchema, type BallSortProgress } from '@slopcade/shared';
import { generateVerifiedPuzzle } from './puzzleGenerator';

// Function to generate puzzle based on progress
function generatePuzzleForLevel(level: number) {
  // Difficulty scales with level: level 1 = diff 1, level 50 = diff ~10
  const difficulty = Math.min(10, 1 + (level - 1) * 0.2);
  
  return generateVerifiedPuzzle({
    numColors: Math.min(8, 4 + Math.floor((level - 1) / 10)), // more colors at higher levels
    ballsPerColor: 4,
    extraTubes: 2,
    difficulty,
    seed: level, // deterministic per level
  });
}

const game: GameDefinition = {
  metadata: {
    id: "test-ball-sort",
    title: "Ball Sort",
    // ...
  },
  
  // ... existing world, camera, etc ...
  
  // NEW: Persistence configuration
  persistence: {
    storageKey: "ball-sort-progress", // optional, defaults to metadata.id
    schema: BallSortProgressSchema,
    version: 1,
    defaultProgress: {
      version: 1,
      currentLevel: 1,
      highestLevelCompleted: 0,
      totalMoves: 0,
      bestTimePerLevel: {},
      difficultyProgression: {
        currentDifficulty: 1,
        difficultyRamp: 0.2,
      },
    } as BallSortProgress,
    autoSave: {
      onLevelComplete: true,
      onGameWin: true,
    },
  },
  
  // Variables can reference progress via expression
  variables: {
    // Reference to persisted progress (loaded at game start)
    currentLevel: { expr: "progress.currentLevel ?? 1" },
    movesThisLevel: 0,
    startTime: 0,
  },
  
  // Templates, entities, rules...
  // Entities can be dynamically generated based on progress
};

export default game;
```

### 4. GameProgressManager (Core Engine)

```typescript
// app/lib/game-engine/progress/GameProgressManager.ts

import type { GameDefinition, PersistenceConfig } from '@slopcade/shared';
import { getStorageItem, setStorageItem } from '@/lib/utils/storage';
import { z } from 'zod';

export interface ProgressManagerOptions {
  gameId: string;
  config: PersistenceConfig;
}

export interface LoadProgressResult<T> {
  success: boolean;
  data: T;
  migrated: boolean;
  errors?: string[];
}

export class GameProgressManager<T = unknown> {
  private gameId: string;
  private config: PersistenceConfig<T>;
  private storageKey: string;
  private currentProgress: T;
  private isDirty: boolean = false;
  private autoSaveInterval?: ReturnType<typeof setInterval>;

  constructor(options: ProgressManagerOptions) {
    this.gameId = options.gameId;
    this.config = options.config;
    this.storageKey = options.config.storageKey ?? `game-progress-${options.gameId}`;
    this.currentProgress = { ...options.config.defaultProgress };
  }

  /**
   * Load progress from storage with validation and migration
   */
  async loadProgress(): Promise<LoadProgressResult<T>> {
    try {
      const stored = await getStorageItem<unknown>(this.storageKey, null);
      
      if (!stored) {
        // No saved progress, use defaults
        return {
          success: true,
          data: { ...this.config.defaultProgress },
          migrated: false,
        };
      }

      // Check version and migrate if needed
      const storedVersion = (stored as Record<string, unknown>)?.version ?? 0;
      let migratedData = stored;
      
      if (storedVersion < this.config.version) {
        migratedData = this.migrateSchema(stored, storedVersion);
      }

      // Validate against schema
      const parseResult = this.config.schema.safeParse(migratedData);
      
      if (!parseResult.success) {
        console.error(`[ProgressManager] Invalid progress data for ${this.gameId}:`, parseResult.error);
        // Fall back to defaults on validation failure
        return {
          success: false,
          data: { ...this.config.defaultProgress },
          migrated: storedVersion < this.config.version,
          errors: parseResult.error.errors.map(e => e.message),
        };
      }

      this.currentProgress = parseResult.data;
      
      return {
        success: true,
        data: parseResult.data,
        migrated: storedVersion < this.config.version,
      };
    } catch (error) {
      console.error(`[ProgressManager] Failed to load progress for ${this.gameId}:`, error);
      return {
        success: false,
        data: { ...this.config.defaultProgress },
        migrated: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Save current progress to storage
   */
  async saveProgress(progress?: Partial<T>): Promise<boolean> {
    try {
      if (progress) {
        this.currentProgress = { ...this.currentProgress, ...progress };
      }

      // Update metadata
      const progressWithMeta = {
        ...this.currentProgress,
        lastPlayedAt: Date.now(),
      };

      await setStorageItem(this.storageKey, progressWithMeta);
      this.isDirty = false;
      
      return true;
    } catch (error) {
      console.error(`[ProgressManager] Failed to save progress for ${this.gameId}:`, error);
      return false;
    }
  }

  /**
   * Update a subset of progress fields
   */
  async updateProgress(updates: Partial<T>): Promise<boolean> {
    this.currentProgress = { ...this.currentProgress, ...updates };
    this.isDirty = true;
    return true;
  }

  /**
   * Get current progress (synchronous)
   */
  getProgress(): T {
    return { ...this.currentProgress };
  }

  /**
   * Reset progress to defaults
   */
  async resetProgress(): Promise<boolean> {
    this.currentProgress = { ...this.config.defaultProgress };
    return this.saveProgress();
  }

  /**
   * Start auto-save interval
   */
  startAutoSave(intervalMs: number = 30000): void {
    this.stopAutoSave();
    this.autoSaveInterval = setInterval(() => {
      if (this.isDirty) {
        this.saveProgress();
      }
    }, intervalMs);
  }

  /**
   * Stop auto-save interval
   */
  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = undefined;
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopAutoSave();
    if (this.isDirty) {
      this.saveProgress();
    }
  }

  /**
   * Migrate data from old schema version to current
   */
  private migrateSchema(oldData: unknown, fromVersion: number): unknown {
    // Migration logic based on version
    // This is a placeholder - actual migrations would be game-specific
    let migrated = oldData as Record<string, unknown>;
    
    // Example: version 0 → 1 migration
    if (fromVersion < 1) {
      migrated = {
        ...migrated,
        version: 1,
        // Add new fields with defaults
        sessionsCompleted: 0,
      };
    }

    return migrated;
  }
}

/**
 * Factory function to create a progress manager for a game
 */
export function createProgressManager<T>(
  gameDefinition: GameDefinition
): GameProgressManager<T> | null {
  if (!gameDefinition.persistence) {
    return null;
  }

  return new GameProgressManager<T>({
    gameId: gameDefinition.metadata.id,
    config: gameDefinition.persistence as PersistenceConfig<T>,
  });
}
```

### 5. React Hooks

```typescript
// app/lib/game-engine/progress/useGameProgress.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameDefinition } from '@slopcade/shared';
import { createProgressManager, GameProgressManager } from './GameProgressManager';

export interface UseGameProgressOptions<T> {
  gameDefinition: GameDefinition;
  autoSave?: boolean;
  autoSaveInterval?: number;
}

export interface UseGameProgressResult<T> {
  progress: T | null;
  isLoading: boolean;
  error: Error | null;
  updateProgress: (updates: Partial<T>) => Promise<void>;
  saveProgress: (progress?: Partial<T>) => Promise<boolean>;
  resetProgress: () => Promise<boolean>;
  reloadProgress: () => Promise<void>;
}

export function useGameProgress<T = unknown>(
  options: UseGameProgressOptions<T>
): UseGameProgressResult<T> {
  const { gameDefinition, autoSave = true, autoSaveInterval = 30000 } = options;
  
  const managerRef = useRef<GameProgressManager<T> | null>(null);
  const [progress, setProgress] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Initialize manager
  useEffect(() => {
    managerRef.current = createProgressManager<T>(gameDefinition);
    
    if (!managerRef.current) {
      setIsLoading(false);
      return;
    }

    // Load initial progress
    reloadProgress();

    // Start auto-save if enabled
    if (autoSave) {
      managerRef.current.startAutoSave(autoSaveInterval);
    }

    return () => {
      managerRef.current?.dispose();
    };
  }, [gameDefinition.metadata.id]);

  const reloadProgress = useCallback(async () => {
    if (!managerRef.current) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await managerRef.current.loadProgress();
      setProgress(result.data);
      
      if (!result.success && result.errors) {
        setError(new Error(`Failed to load progress: ${result.errors.join(', ')}`));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error loading progress'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateProgress = useCallback(async (updates: Partial<T>) => {
    if (!managerRef.current) return;
    
    await managerRef.current.updateProgress(updates);
    setProgress(managerRef.current.getProgress());
  }, []);

  const saveProgress = useCallback(async (newProgress?: Partial<T>) => {
    if (!managerRef.current) return false;
    
    const success = await managerRef.current.saveProgress(newProgress);
    if (success && newProgress) {
      setProgress(managerRef.current.getProgress());
    }
    return success;
  }, []);

  const resetProgress = useCallback(async () => {
    if (!managerRef.current) return false;
    
    const success = await managerRef.current.resetProgress();
    if (success) {
      setProgress(managerRef.current.getProgress());
    }
    return success;
  }, []);

  return {
    progress,
    isLoading,
    error,
    updateProgress,
    saveProgress,
    resetProgress,
    reloadProgress,
  };
}

// Specialized hook for Ball Sort
export function useBallSortProgress(gameDefinition: GameDefinition) {
  type BallSortProgress = {
    currentLevel: number;
    highestLevelCompleted: number;
    totalMoves: number;
    bestTimePerLevel: Record<number, number>;
  };

  const base = useGameProgress<BallSortProgress>({ gameDefinition });

  const advanceLevel = useCallback(async () => {
    if (!base.progress) return;
    
    const newLevel = base.progress.currentLevel + 1;
    await base.updateProgress({
      currentLevel: newLevel,
      highestLevelCompleted: Math.max(base.progress.highestLevelCompleted, base.progress.currentLevel),
    });
  }, [base.progress, base.updateProgress]);

  const recordLevelTime = useCallback(async (level: number, timeSeconds: number) => {
    if (!base.progress) return;
    
    const currentBest = base.progress.bestTimePerLevel[level];
    if (!currentBest || timeSeconds < currentBest) {
      await base.updateProgress({
        bestTimePerLevel: {
          ...base.progress.bestTimePerLevel,
          [level]: timeSeconds,
        },
      });
    }
  }, [base.progress, base.updateProgress]);

  return {
    ...base,
    advanceLevel,
    recordLevelTime,
    currentLevel: base.progress?.currentLevel ?? 1,
    highestLevel: base.progress?.highestLevelCompleted ?? 0,
  };
}
```

### 6. Integration with GameRuntime

```typescript
// app/lib/game-engine/GameRuntime.tsx (modifications)

import { useGameProgress } from './progress/useGameProgress';

interface GameRuntimeProps {
  gameDefinition: GameDefinition;
  // ... other props
}

export function GameRuntime({ gameDefinition, ...props }: GameRuntimeProps) {
  // ... existing setup ...
  
  // Initialize progress if game supports it
  const progressManager = useGameProgress({
    gameDefinition,
    autoSave: true,
  });

  // Load game with progress-aware initialization
  useEffect(() => {
    if (!progressManager.isLoading && godotBridge) {
      // Modify game definition based on progress before loading
      const progressAwareDefinition = injectProgressIntoGame(
        gameDefinition,
        progressManager.progress
      );
      
      godotBridge.loadGame(progressAwareDefinition);
    }
  }, [progressManager.isLoading, progressManager.progress, godotBridge]);

  // Handle win condition with progress update
  const handleWin = useCallback(() => {
    // Save progress on win
    if (gameDefinition.persistence?.autoSave?.onGameWin) {
      progressManager.updateProgress({
        // Game-specific win updates
      }).then(() => {
        progressManager.saveProgress();
      });
    }
    
    // ... existing win handling ...
  }, [progressManager, gameDefinition.persistence]);

  // ... rest of component
}

/**
 * Inject progress data into game definition
 */
function injectProgressIntoGame(
  definition: GameDefinition,
  progress: unknown
): GameDefinition {
  if (!progress || !definition.persistence) {
    return definition;
  }

  // Deep clone to avoid mutations
  const modified = JSON.parse(JSON.stringify(definition));

  // Inject progress into variables
  if (!modified.variables) {
    modified.variables = {};
  }
  
  // Add progress reference that rules/expressions can access
  modified.variables._progress = progress;

  // Game-specific injections
  switch (modified.metadata.id) {
    case 'test-ball-sort':
      const ballSortProgress = progress as { currentLevel: number };
      modified.variables.currentLevel = ballSortProgress.currentLevel;
      
      // Regenerate puzzle based on current level
      const puzzle = generateVerifiedPuzzle({
        numColors: Math.min(8, 4 + Math.floor((ballSortProgress.currentLevel - 1) / 10)),
        ballsPerColor: 4,
        extraTubes: 2,
        difficulty: Math.min(10, 1 + (ballSortProgress.currentLevel - 1) * 0.2),
        seed: ballSortProgress.currentLevel,
      });
      
      // Update entities based on new puzzle
      modified.entities = regenerateBallSortEntities(puzzle);
      break;
  }

  return modified;
}
```

### 7. Progress-Aware Puzzle Generator

```typescript
// app/lib/test-games/games/ballSort/puzzleGenerator.ts (enhancement)

export interface LevelProgressionConfig {
  startingLevel: number;
  level: number;
}

export function generatePuzzleForProgress(
  baseConfig: PuzzleConfig,
  progress: LevelProgressionConfig
): GeneratedPuzzle {
  const { level } = progress;
  
  // Scale difficulty with level
  const difficulty = Math.min(10, baseConfig.difficulty + (level - 1) * 0.2);
  
  // Add more colors as player progresses (max 8)
  const numColors = Math.min(8, baseConfig.numColors + Math.floor((level - 1) / 5));
  
  // Use level as seed for deterministic generation
  const seed = level * 1000 + baseConfig.seed ?? Date.now();
  
  return generateVerifiedPuzzle({
    ...baseConfig,
    numColors,
    difficulty,
    seed,
  });
}
```

---

## File Structure

```
app/lib/game-engine/progress/
├── index.ts                    # Public exports
├── GameProgressManager.ts      # Core persistence logic
├── useGameProgress.ts          # Generic React hook
├── useBallSortProgress.ts      # Ball Sort specific hook
├── migrations.ts               # Schema migration utilities
└── types.ts                    # Shared type definitions

shared/src/types/progress.ts    # Progress schema definitions
shared/src/types/GameDefinition.ts # (add PersistenceConfig)
```

---

## Usage Examples

### Basic Game with Persistence

```typescript
const myGame: GameDefinition = {
  metadata: { id: "my-game", title: "My Game", version: "1.0.0" },
  persistence: {
    schema: MyGameProgressSchema,
    version: 1,
    defaultProgress: { currentLevel: 1, score: 0 },
  },
  // ... rest of game
};
```

### React Component

```typescript
function BallSortGame() {
  const { currentLevel, advanceLevel, isLoading } = useBallSortProgress(ballSortGame);

  if (isLoading) return <Loading />;

  return (
    <View>
      <Text>Level {currentLevel}</Text>
      <GameRuntime 
        gameDefinition={ballSortGame}
        onWin={advanceLevel}
      />
    </View>
  );
}
```

---

## Migration Strategy

1. **Phase 1**: Add core persistence infrastructure (schemas, manager, hooks)
2. **Phase 2**: Add persistence config to Ball Sort game
3. **Phase 3**: Update GameRuntime to support progress injection
4. **Phase 4**: Add UI components for progress display (level selector, stats)
5. **Phase 5**: Documentation and examples for other game developers

---

## Backward Compatibility

- Games without `persistence` config work exactly as before
- No changes to existing `GameDefinition` structure (optional field)
- `GameLoader` unchanged - progress injection happens before load
- Storage keys are namespaced, won't conflict with existing data

---

## Security Considerations

1. **Data Integrity**: Zod schema validation prevents corruption
2. **Encryption**: Optional encryption for sensitive progress data
3. **Storage Limits**: LocalStorage has ~5MB limit - progress data should be minimal
4. **Cheating**: Client-side storage can be manipulated - server validation needed for competitive features

---

## Testing Strategy

```typescript
// Test file structure
app/lib/game-engine/progress/__tests__/
├── GameProgressManager.test.ts
├── useGameProgress.test.ts
├── migrations.test.ts
└── integration.test.ts
```

Key test scenarios:
1. First-time load (no saved data)
2. Schema migration (old version → new version)
3. Corrupted data recovery
4. Concurrent updates (race conditions)
5. Cross-platform persistence (web ↔ native)

---

## Future Enhancements

1. **Cloud Sync**: Optional Firebase/Supabase integration for cross-device sync
2. **Achievements**: Global achievement system with progress tracking
3. **Analytics**: Track player progression for balance tuning
4. **Leaderboards**: Compare progress with friends (requires server)
5. **Time Travel**: Save multiple progress slots for experimenting

---

## Summary

This persistence system provides:

| Feature | Implementation |
|---------|---------------|
| **Type Safety** | Zod schemas with full TypeScript inference |
| **Cross-Platform** | Works on web, iOS, Android via existing storage layer |
| **Opt-in** | Games declare `persistence` config to enable |
| **Extensible** | Each game defines its own progress schema |
| **Backward Compatible** | Existing games work unchanged |
| **React Integration** | `useGameProgress` hook for real-time updates |
| **Schema Migration** | Versioned schemas with automatic migration |
| **Auto-Save** | Configurable triggers (on win, interval, etc.) |

The system enables Ball Sort and future games to have true progression with infinite levels, persistent high scores, and player statistics while maintaining the simplicity of the existing game engine architecture.
