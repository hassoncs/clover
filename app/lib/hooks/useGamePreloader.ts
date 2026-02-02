import { useState, useCallback, useRef, useEffect } from 'react';
import type { GameDefinition } from '@slopcade/shared';
import type { GodotBridge } from '../godot/types';
import {
  extractAssetManifest,
  AssetPreloader,
  type PreloadProgress,
  type PreloadResult,
  type ResolvedPackEntry,
} from '../assets';

export type LoadingPhase = 'idle' | 'loading' | 'loading_godot' | 'ready' | 'skipped' | 'error';

export interface UseGamePreloaderOptions {
  resolvedPackEntries?: Record<string, ResolvedPackEntry>;
}

export interface UseGamePreloaderResult {
  phase: LoadingPhase;
  progress: PreloadProgress;
  result: PreloadResult | null;
  imageUrls: string[];
  startPreload: () => Promise<void>;
  preloadGodotTextures: (bridge: GodotBridge) => Promise<void>;
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
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const preloaderRef = useRef<AssetPreloader | null>(null);

  const startPreload = useCallback(async () => {
    if (!definition) return;
    
    console.log('🎮 [preloader] Starting asset preload for:', definition.metadata.title);
    
    const manifest = extractAssetManifest(definition, {
      resolvedPackEntries: options?.resolvedPackEntries,
    });
    
    const urls = manifest.images.map(img => img.url);
    setImageUrls(urls);
    console.log('🎮 [preloader] Asset manifest:', manifest.totalCount, 'assets,', urls.length, 'images');
    
    if (manifest.totalCount === 0) {
      console.log('🎮 [preloader] No assets to preload, transitioning to ready');
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
    
    console.log('🎮 [preloader] Phase: idle -> loading');
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
          `🎮 [preloader] Completed with ${preloadResult.failedCount} failures:`,
          preloadResult.failedAssets
        );
      }
      
      console.log('🎮 [preloader] Phase: loading -> ready (', preloadResult.durationMs, 'ms)');
      setPhase('ready');
    } catch (error) {
      console.error('🎮 [preloader] Error:', error);
      console.log('🎮 [preloader] Phase: loading -> error');
      setPhase('error');
    }
  }, [definition, options?.resolvedPackEntries]);

  const preloadGodotTextures = useCallback(async (bridge: GodotBridge) => {
    console.log('🎮 [preloader] preloadGodotTextures called, imageUrls:', imageUrls.length);
    if (imageUrls.length === 0) {
      console.log('🎮 [preloader] No Godot textures to preload');
      setPhase('ready');
      return;
    }
    
    console.log('🎮 [preloader] Starting Godot texture preload');
    setProgress(prev => ({
      ...prev,
      phase: 'images',
      currentAsset: 'Preloading Godot textures...',
      loaded: 0,
      total: imageUrls.length,
      percent: 0,
    }));
    
    try {
      await bridge.preloadTextures(imageUrls, (percent, completed, failed) => {
        setProgress(prev => ({
          ...prev,
          percent,
          loaded: completed + failed,
          currentAsset: percent < 100 ? `Preloading textures (${completed}/${imageUrls.length})` : null,
        }));
      });
      
      console.log('🎮 [preloader] Godot texture preload complete');
      setPhase('ready');
    } catch (error) {
      console.error('🎮 [preloader] Godot texture preload error:', error);
      setPhase('ready');
    }
  }, [imageUrls]);

  const skipPreload = useCallback(() => {
    console.log('🎮 [preloader] Preload skipped by user');
    preloaderRef.current?.abort();
    setPhase('skipped');
  }, []);

  const reset = useCallback(() => {
    console.log('🎮 [preloader] Reset called');
    preloaderRef.current?.abort();
    setPhase('idle');
    setProgress(initialProgress);
    setResult(null);
    setImageUrls([]);
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
    imageUrls,
    startPreload,
    preloadGodotTextures,
    skipPreload,
    reset,
  };
}
