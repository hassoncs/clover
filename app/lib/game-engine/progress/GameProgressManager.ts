/**
 * GameProgressManager - Manages game progress persistence with validation and migration
 * 
 * Responsibilities:
 * - Load progress from storage with validation
 * - Save progress with metadata updates
 * - Handle corrupted data gracefully (reset to defaults)
 * - Support schema version migrations
 * - Provide synchronous access to current progress
 */

import type {
  PersistenceConfig,
  LoadProgressResult,
  ProgressManagerOptions,
} from '@slopcade/shared';
import { getStorageItem, setStorageItem } from '@/lib/utils/storage';

export class GameProgressManager<T = unknown> {
  private gameId: string;
  private config: PersistenceConfig<T>;
  private storageKey: string;
  private currentProgress: T;
  private isDirty: boolean = false;
  private autoSaveInterval?: ReturnType<typeof setInterval>;

  constructor(options: ProgressManagerOptions<T>) {
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

      const storedVersion = typeof (stored as Record<string, unknown>)?.version === 'number' 
        ? (stored as Record<string, unknown>).version as number
        : 0;
      let migratedData: unknown = stored;
      
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
   * @param progress - Optional partial progress to merge before saving
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
   * Reset progress to defaults
   */
  async resetProgress(): Promise<void> {
    this.currentProgress = { ...this.config.defaultProgress };
    await this.saveProgress();
  }

  /**
   * Get current progress (synchronous)
   */
  getProgress(): T {
    return { ...this.currentProgress };
  }

  /**
   * Update a subset of progress fields (marks as dirty for auto-save)
   */
  updateProgress(updates: Partial<T>): void {
    this.currentProgress = { ...this.currentProgress, ...updates };
    this.isDirty = true;
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
   * This is a placeholder - actual migrations would be game-specific
   */
  private migrateSchema(oldData: unknown, fromVersion: number): unknown {
    let migrated = oldData as Record<string, unknown>;
    
    // Example: version 0 → 1 migration
    if (fromVersion < 1) {
      migrated = {
        ...migrated,
        version: 1,
      };
    }

    return migrated;
  }
}
