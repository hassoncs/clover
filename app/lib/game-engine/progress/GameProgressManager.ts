import type {
  PersistenceConfig,
  LoadProgressResult,
  ProgressManagerOptions,
} from "@slopcade/shared";
import { getStorageItem, setStorageItem } from "@/lib/utils/storage";
import { z } from "zod";

/**
 * Manages persistent game progress with schema validation and migration.
 *
 * This class handles loading, saving, and validating game progress
 * using the storage layer (localStorage on web, AsyncStorage on native).
 *
 * @example
 * ```typescript
 * const manager = new GameProgressManager({
 *   gameId: "my-game",
 *   config: {
 *     schema: MyGameProgressSchema,
 *     version: 1,
 *     defaultProgress: { highScore: 0 },
 *   },
 * });
 *
 * const result = await manager.loadProgress();
 * console.log("Current progress:", result.data);
 *
 * await manager.updateProgress({ highScore: 100 });
 * await manager.saveProgress();
 * ```
 */
export class GameProgressManager<T extends Record<string, unknown>> {
  private gameId: string;
  private config: PersistenceConfig<T>;
  private storageKey: string;
  private currentProgress: T;
  private isDirty = false;
  private autoSaveInterval?: ReturnType<typeof setInterval>;

  constructor(options: ProgressManagerOptions<T>) {
    this.gameId = options.gameId;
    this.config = options.config;
    this.storageKey = options.config.storageKey ?? `game-progress-${options.gameId}`;
    this.currentProgress = structuredClone(options.config.defaultProgress);
  }

  /**
   * Load progress from storage with validation and migration.
   */
  async loadProgress(): Promise<LoadProgressResult<T>> {
    try {
      const stored = await getStorageItem<unknown>(this.storageKey, null);

      if (!stored) {
        return {
          success: true,
          data: structuredClone(this.config.defaultProgress),
          migrated: false,
        };
      }

      const storedVersion = this.extractVersion(stored);
      let migratedData: unknown = stored;

      if (storedVersion < this.config.version) {
        migratedData = this.migrateSchema(stored, storedVersion);
      }

      const parseResult = this.config.schema.safeParse(migratedData);

      if (!parseResult.success) {
        console.error(
          `[GameProgressManager] Invalid progress data for ${this.gameId}:`,
          parseResult.error.flatten()
        );
        return {
          success: false,
          data: structuredClone(this.config.defaultProgress),
          migrated: storedVersion < this.config.version,
          errors: parseResult.error.errors.map((e) => e.message),
        };
      }

      this.currentProgress = parseResult.data;

      return {
        success: true,
        data: parseResult.data,
        migrated: storedVersion < this.config.version,
      };
    } catch (error) {
      console.error(
        `[GameProgressManager] Failed to load progress for ${this.gameId}:`,
        error
      );
      return {
        success: false,
        data: structuredClone(this.config.defaultProgress),
        migrated: false,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      };
    }
  }

  /**
   * Save current progress to storage.
   */
  async saveProgress(progress?: Partial<T>): Promise<boolean> {
    try {
      if (progress) {
        this.currentProgress = { ...this.currentProgress, ...progress };
      }

      const progressWithMeta = {
        ...this.currentProgress,
        lastPlayedAt: Date.now(),
      };

      await setStorageItem(this.storageKey, progressWithMeta);
      this.isDirty = false;

      return true;
    } catch (error) {
      console.error(
        `[GameProgressManager] Failed to save progress for ${this.gameId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Update progress fields without saving to storage.
   * Use saveProgress() to persist changes.
   */
  updateProgress(updates: Partial<T>): void {
    this.currentProgress = { ...this.currentProgress, ...updates };
    this.isDirty = true;
  }

  /**
   * Get current progress (synchronous, returns copy).
   */
  getProgress(): T {
    return structuredClone(this.currentProgress);
  }

  /**
   * Reset progress to defaults.
   */
  async resetProgress(): Promise<boolean> {
    this.currentProgress = structuredClone(this.config.defaultProgress);
    this.isDirty = false;
    return this.saveProgress();
  }

  /**
   * Start auto-save interval.
   */
  startAutoSave(intervalMs = 30000): void {
    this.stopAutoSave();
    this.autoSaveInterval = setInterval(() => {
      if (this.isDirty) {
        void this.saveProgress();
      }
    }, intervalMs);
  }

  /**
   * Stop auto-save interval.
   */
  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = undefined;
    }
  }

  /**
   * Clean up resources. Saves pending changes.
   */
  dispose(): void {
    this.stopAutoSave();
    if (this.isDirty) {
      void this.saveProgress();
    }
  }

  /**
   * Extract version number from stored data.
   */
  private extractVersion(data: unknown): number {
    if (typeof data === "object" && data !== null && "version" in data) {
      const version = (data as Record<string, unknown>).version;
      return typeof version === "number" ? version : 0;
    }
    return 0;
  }

  /**
   * Migrate data from old schema version to current.
   * Override this method in subclasses for custom migrations.
   */
  protected migrateSchema(oldData: unknown, fromVersion: number): unknown {
    let migrated = oldData as Record<string, unknown>;

    if (fromVersion < 1) {
      migrated = {
        ...migrated,
        version: 1,
        sessionsCompleted: 0,
      };
    }

    return migrated;
  }
}

/**
 * Factory function to create a progress manager for a game definition.
 * Returns null if the game doesn't have persistence configured.
 */
export function createProgressManager<T extends Record<string, unknown>>(
  gameId: string,
  config: PersistenceConfig<T> | undefined
): GameProgressManager<T> | null {
  if (!config) {
    return null;
  }

  return new GameProgressManager<T>({
    gameId,
    config,
  });
}
