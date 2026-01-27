# Game Progress Persistence System - Implementation Summary

## Overview

A generic, type-safe persistence system for the Slopcade game engine has been implemented. Games can now save and load progress (high scores, level progression, unlockables) across sessions using Zod schemas for validation.

## Files Created

### Core Types (shared package)
- **`shared/src/types/progress.ts`** - Type definitions and Zod schemas
  - `BaseGameProgressSchema` - Common fields (version, timestamps, play time)
  - `BallSortProgressSchema` - Level-based progression for puzzle games
  - `FlappyBirdProgressSchema` - High-score tracking for arcade games
  - `PersistenceConfig` interface for game definitions

### Core Implementation (app package)
- **`app/lib/game-engine/progress/GameProgressManager.ts`** - Core persistence logic
  - `GameProgressManager` class - load/save/validate/migrate progress
  - `createProgressManager()` factory function
- **`app/lib/game-engine/progress/useGameProgress.ts`** - React hooks
  - `useGameProgress()` - Generic hook for any game
  - `useGameProgressFromDefinition()` - Hook using GameDefinition
- **`app/lib/game-engine/progress/index.ts`** - Public exports

### Updated Games
- **`app/lib/test-games/games/ballSort/game.ts`** - Level progression, best times, move counts
- **`app/lib/test-games/games/flappyBird/game.ts`** - High score, games played, unlockables

## How to Use

### 1. Define Progress Schema

```typescript
import { z } from 'zod';
import { BaseGameProgressSchema } from '@slopcade/shared';

export const MyGameProgressSchema = BaseGameProgressSchema.extend({
  currentLevel: z.number().default(1),
  highScore: z.number().default(0),
  unlockedItems: z.array(z.string()).default([]),
});

export type MyGameProgress = z.infer<typeof MyGameProgressSchema>;
```

### 2. Add Persistence to GameDefinition

```typescript
import type { GameDefinition, PersistenceConfig } from '@slopcade/shared';

const game: GameDefinition = {
  metadata: { id: "my-game", title: "My Game", version: "1.0.0" },
  // ... other game config ...
  
  persistence: {
    storageKey: "my-game-progress", // optional, defaults to game id
    schema: MyGameProgressSchema as unknown as PersistenceConfig<MyGameProgress>["schema"],
    version: 1,
    defaultProgress: {
      currentLevel: 1,
      highScore: 0,
      unlockedItems: [],
    },
    autoSave: {
      onGameWin: true,
      onGameLose: true,
      onBackground: true,
    },
  },
};
```

### 3. Use in React Components

```typescript
import { useGameProgressFromDefinition } from '@/lib/game-engine/progress';

function MyGameComponent() {
  const { 
    progress, 
    isLoading, 
    updateProgress, 
    saveProgress 
  } = useGameProgressFromDefinition<MyGameProgress>(gameDefinition);

  if (isLoading) return <Loading />;

  const handleWin = async () => {
    await updateProgress({ 
      highScore: Math.max(progress?.highScore ?? 0, currentScore) 
    });
    await saveProgress();
  };

  return (
    <div>
      <Text>High Score: {progress?.highScore}</Text>
      <GameRuntime gameDefinition={gameDefinition} onWin={handleWin} />
    </div>
  );
}
```

## Key Features

### Type Safety
- Full TypeScript support with Zod schema validation
- Runtime validation catches corrupted or migrated data
- Type inference from schemas

### Schema Migration
- Versioned schemas support data migration
- Automatic migration when loading old data
- Fallback to defaults on validation failure

### Cross-Platform
- Works on web (localStorage) and native (AsyncStorage)
- Same API across platforms
- Automatic serialization/deserialization

### Opt-in Design
- Games without `persistence` config work as before
- No breaking changes to existing games
- Incremental adoption possible

### Auto-Save
- Configurable triggers (on win, on lose, interval, background)
- Manual save with `saveProgress()`
- Dirty tracking prevents unnecessary writes

## API Reference

### GameProgressManager

```typescript
class GameProgressManager<T> {
  constructor(options: ProgressManagerOptions<T>)
  
  loadProgress(): Promise<LoadProgressResult<T>>
  saveProgress(progress?: Partial<T>): Promise<boolean>
  updateProgress(updates: Partial<T>): void
  getProgress(): T
  resetProgress(): Promise<boolean>
  startAutoSave(intervalMs?: number): void
  stopAutoSave(): void
  dispose(): void
}
```

### React Hooks

```typescript
function useGameProgress<T>(options: UseGameProgressOptions): UseGameProgressResult<T>

function useGameProgressFromDefinition<T>(
  gameDefinition: GameDefinition,
  options?: { autoSave?: boolean; autoSaveInterval?: number }
): UseGameProgressResult<T>
```

### Hook Return Values

```typescript
interface UseGameProgressResult<T> {
  progress: T | null;           // Current progress data
  isLoading: boolean;           // Loading state
  error: Error | null;          // Error if load failed
  updateProgress(updates: Partial<T>): void;  // Update (not saved)
  saveProgress(progress?: Partial<T>): Promise<boolean>;  // Persist
  resetProgress(): Promise<boolean>;  // Reset to defaults
  reloadProgress(): Promise<void>;    // Reload from storage
}
```

## Storage Format

Progress is stored as JSON with automatic namespacing:

```
Key: game-progress-{gameId}
Value: {
  "version": 1,
  "highScore": 100,
  "gamesPlayed": 5,
  "lastPlayedAt": 1706361600000,
  "totalPlayTime": 3600
}
```

## Examples in Codebase

### Ball Sort (Level Progression)
```typescript
export const BallSortProgressSchema = BaseGameProgressSchema.extend({
  currentLevel: z.number().default(1),
  highestLevelCompleted: z.number().default(0),
  bestTimePerLevel: z.record(z.number()).default({}),
  bestMovesPerLevel: z.record(z.number()).default({}),
});

// Generate puzzle based on current level
export function createBallSortGame(level: number = 1): GameDefinition {
  const puzzleConfig = getPuzzleConfigForLevel(level);
  // ... generate game with difficulty scaling
}
```

### Flappy Bird (High Score)
```typescript
export const FlappyBirdProgressSchema = BaseGameProgressSchema.extend({
  highScore: z.number().default(0),
  gamesPlayed: z.number().default(0),
  totalPipesPassed: z.number().default(0),
  unlockedBirds: z.array(z.string()).default(['default']),
});

// Auto-save on game over
autoSave: {
  onGameLose: true,
  onBackground: true,
}
```

## Migration Example

When upgrading schema versions:

```typescript
// In GameProgressManager subclass
protected migrateSchema(oldData: unknown, fromVersion: number): unknown {
  let migrated = oldData as Record<string, unknown>;
  
  if (fromVersion < 2) {
    // Add new field with default
    migrated = { ...migrated, newField: 'default' };
  }
  
  if (fromVersion < 3) {
    // Rename field
    migrated = { 
      ...migrated, 
      newName: migrated.oldName,
      oldName: undefined 
    };
  }
  
  return migrated;
}
```

## Testing

To test persistence:

1. Play a game with persistence enabled
2. Make progress (complete level, achieve high score)
3. Close/reload the game
4. Verify progress is restored

Check storage in browser DevTools:
- Application → Local Storage → localhost:8085
- Look for keys starting with `game-progress-`

## Future Enhancements

- Cloud sync (Firebase/Supabase integration)
- Multiple save slots per game
- Global achievements system
- Leaderboards (requires server)
- Progress encryption for sensitive data
