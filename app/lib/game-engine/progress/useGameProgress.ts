import { useState, useEffect, useCallback, useRef } from "react";
import type {
  GameDefinition,
  PersistenceConfig,
  LoadProgressResult,
} from "@slopcade/shared";
import { GameProgressManager, createProgressManager } from "./GameProgressManager";

export interface UseGameProgressOptions<T extends Record<string, unknown>> {
  gameId: string;
  persistence?: PersistenceConfig<T>;
  autoSave?: boolean;
  autoSaveInterval?: number;
}

export interface UseGameProgressResult<T extends Record<string, unknown>> {
  progress: T | null;
  isLoading: boolean;
  error: Error | null;
  updateProgress: (updates: Partial<T>) => void;
  saveProgress: (progress?: Partial<T>) => Promise<boolean>;
  resetProgress: () => Promise<boolean>;
  reloadProgress: () => Promise<void>;
}

export function useGameProgress<T extends Record<string, unknown>>(
  options: UseGameProgressOptions<T>
): UseGameProgressResult<T> {
  const { gameId, persistence, autoSave = true, autoSaveInterval = 30000 } = options;

  const managerRef = useRef<GameProgressManager<T> | null>(null);
  const [progress, setProgress] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const reloadProgress = useCallback(async () => {
    if (!managerRef.current) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await managerRef.current.loadProgress();
      setProgress(result.data as T);

      if (!result.success && result.errors) {
        setError(new Error(`Failed to load progress: ${result.errors.join(", ")}`));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error loading progress"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!persistence) {
      setIsLoading(false);
      return;
    }

    managerRef.current = createProgressManager<T>(gameId, persistence);

    if (!managerRef.current) {
      setIsLoading(false);
      return;
    }

    void reloadProgress();

    if (autoSave) {
      managerRef.current.startAutoSave(autoSaveInterval);
    }

    return () => {
      managerRef.current?.dispose();
    };
  }, [gameId, persistence, autoSave, autoSaveInterval, reloadProgress]);

  const updateProgress = useCallback((updates: Partial<T>) => {
    if (!managerRef.current) return;

    managerRef.current.updateProgress(updates);
    setProgress(managerRef.current.getProgress());
  }, []);

  const saveProgress = useCallback(async (newProgress?: Partial<T>) => {
    if (!managerRef.current) return false;

    const success = await managerRef.current.saveProgress(newProgress);
    if (success) {
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

export function useGameProgressFromDefinition<T extends Record<string, unknown>>(
  gameDefinition: GameDefinition,
  options?: { autoSave?: boolean; autoSaveInterval?: number }
): UseGameProgressResult<T> {
  return useGameProgress<T>({
    gameId: gameDefinition.metadata.id,
    persistence: gameDefinition.persistence as PersistenceConfig<T> | undefined,
    autoSave: options?.autoSave ?? true,
    autoSaveInterval: options?.autoSaveInterval ?? 30000,
  });
}
