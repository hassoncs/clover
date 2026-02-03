import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameDefinition, PersistenceConfig } from '@slopcade/shared';
import { GameProgressManager } from './GameProgressManager';

export interface UseGameProgressResult<T> {
  progress: T;
  isLoading: boolean;
  error: Error | null;
  saveProgress: (updates?: Partial<T>) => Promise<boolean>;
  resetProgress: () => Promise<void>;
  reloadProgress: () => Promise<void>;
}

export function useGameProgress<T>(config: PersistenceConfig<T>): UseGameProgressResult<T> {
  const managerRef = useRef<GameProgressManager<T> | null>(null);
  const [progress, setProgress] = useState<T>(config.defaultProgress);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const storageKey = config.storageKey ?? 'game-progress';
  const defaultProgress = config.defaultProgress;

  useEffect(() => {
    managerRef.current = new GameProgressManager<T>({
      gameId: storageKey,
      config,
    });

    const loadInitial = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await managerRef.current!.loadProgress();
        setProgress(result.data);

        if (!result.success && result.errors) {
          setError(new Error(`Failed to load progress: ${result.errors.join(', ')}`));
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error loading progress'));
        setProgress(defaultProgress);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitial();

    return () => {
      managerRef.current?.dispose();
    };
  }, [storageKey, config, defaultProgress]);

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
      setProgress(defaultProgress);
    } finally {
      setIsLoading(false);
    }
  }, [defaultProgress]);

  const saveProgress = useCallback(async (updates?: Partial<T>) => {
    if (!managerRef.current) return false;

    const success = await managerRef.current.saveProgress(updates);
    if (success) {
      setProgress(managerRef.current.getProgress());
    }
    return success;
  }, []);

  const resetProgress = useCallback(async () => {
    if (!managerRef.current) return;

    await managerRef.current.resetProgress();
    setProgress(managerRef.current.getProgress());
  }, []);

  return {
    progress,
    isLoading,
    error,
    saveProgress,
    resetProgress,
    reloadProgress,
  };
}

export function useGameProgressFromDefinition<T>(
  definition: GameDefinition | null | undefined
): UseGameProgressResult<T> | null {
  const config = definition?.persistence as PersistenceConfig<T> | undefined;
  const gameId = definition?.metadata?.id;

  const managerRef = useRef<GameProgressManager<T> | null>(null);
  const [progress, setProgress] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const hasConfig = !!config;
  const storageKey = config?.storageKey ?? `game-progress-${gameId}`;
  const defaultProgress = config?.defaultProgress;

  useEffect(() => {
    if (!hasConfig || !config) {
      setIsLoading(false);
      return;
    }

    managerRef.current = new GameProgressManager<T>({
      gameId: storageKey,
      config,
    });

    const loadInitial = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await managerRef.current!.loadProgress();
        setProgress(result.data);

        if (!result.success && result.errors) {
          setError(new Error(`Failed to load progress: ${result.errors.join(', ')}`));
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error loading progress'));
        setProgress(defaultProgress ?? null);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitial();

    return () => {
      managerRef.current?.dispose();
    };
  }, [hasConfig, storageKey, config, defaultProgress]);

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
      setProgress(defaultProgress ?? null);
    } finally {
      setIsLoading(false);
    }
  }, [defaultProgress]);

  const saveProgress = useCallback(async (updates?: Partial<T>) => {
    if (!managerRef.current) return false;

    const success = await managerRef.current.saveProgress(updates);
    if (success) {
      setProgress(managerRef.current.getProgress());
    }
    return success;
  }, []);

  const resetProgress = useCallback(async () => {
    if (!managerRef.current) return;

    await managerRef.current.resetProgress();
    setProgress(managerRef.current.getProgress());
  }, []);

  if (!hasConfig || !config || progress === null) {
    return null;
  }

  return {
    progress,
    isLoading,
    error,
    saveProgress,
    resetProgress,
    reloadProgress,
  };
}
