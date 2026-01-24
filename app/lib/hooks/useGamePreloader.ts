import { useState, useCallback, useRef, useEffect } from 'react';
import type { GameDefinition } from '@slopcade/shared';
import {
  extractAssetManifest,
  AssetPreloader,
  type PreloadProgress,
  type PreloadResult,
  type ResolvedPackEntry,
} from '../assets';

export type LoadingPhase = 'idle' | 'loading' | 'ready' | 'skipped' | 'error';

export interface UseGamePreloaderOptions {
  resolvedPackEntries?: Record<string, ResolvedPackEntry>;
}

export interface UseGamePreloaderResult {
  phase: LoadingPhase;
  progress: PreloadProgress;
  result: PreloadResult | null;
  startPreload: () => Promise<void>;
  skipPreload: () => void;
  reset: () => void;
}

const initialProgress: PreloadProgress = {
  loaded: 0,
  total: 0,
  percent: 0,
  currentAsset: null,
  completedAssets: [],
  failedAssets: [],
  phase: 'images',
};

export function useGamePreloader(
  definition: GameDefinition | null,
  options?: UseGamePreloaderOptions
): UseGamePreloaderResult {
  const [phase, setPhase] = useState<LoadingPhase>('idle');
  const [progress, setProgress] = useState<PreloadProgress>(initialProgress);
  const [result, setResult] = useState<PreloadResult | null>(null);
  const preloaderRef = useRef<AssetPreloader | null>(null);

  const startPreload = useCallback(async () => {
    if (!definition) return;
    
    const manifest = extractAssetManifest(definition, {
      resolvedPackEntries: options?.resolvedPackEntries,
    });
    
    if (manifest.totalCount === 0) {
      setPhase('ready');
      setProgress({
        ...initialProgress,
        percent: 100,
        phase: 'complete',
      });
      setResult({
        success: true,
        loadedCount: 0,
        failedCount: 0,
        failedAssets: [],
        durationMs: 0,
      });
      return;
    }
    
    setPhase('loading');
    setProgress({
      ...initialProgress,
      total: manifest.totalCount,
    });
    
    const preloader = new AssetPreloader(manifest, setProgress);
    preloaderRef.current = preloader;
    
    try {
      const preloadResult = await preloader.preloadAll();
      setResult(preloadResult);
      
      if (preloadResult.failedCount > 0) {
        console.warn(
          `Asset preload completed with ${preloadResult.failedCount} failures:`,
          preloadResult.failedAssets
        );
      }
      
      setPhase('ready');
    } catch (error) {
      console.error('Asset preload error:', error);
      setPhase('error');
    }
  }, [definition, options?.resolvedPackEntries]);

  const skipPreload = useCallback(() => {
    preloaderRef.current?.abort();
    setPhase('skipped');
  }, []);

  const reset = useCallback(() => {
    preloaderRef.current?.abort();
    setPhase('idle');
    setProgress(initialProgress);
    setResult(null);
  }, []);

  useEffect(() => {
    return () => {
      preloaderRef.current?.abort();
    };
  }, []);

  return {
    phase,
    progress,
    result,
    startPreload,
    skipPreload,
    reset,
  };
}
