import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import type { AssetManifest, AssetManifestItem } from './AssetManifest';
import { sortManifestByPriority } from './AssetManifest';
import { getAudioManager } from '../audio';

export interface PreloadProgress {
  loaded: number;
  total: number;
  percent: number;
  currentAsset: string | null;
  completedAssets: string[];
  failedAssets: string[];
  phase: 'images' | 'sounds' | 'complete';
}

export interface PreloadResult {
  success: boolean;
  loadedCount: number;
  failedCount: number;
  failedAssets: string[];
  durationMs: number;
}

type ProgressCallback = (progress: PreloadProgress) => void;

const IMAGE_CONCURRENCY = 4;
const SOUND_CONCURRENCY = 2;

function hashUrl(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = ((hash << 5) - hash) + url.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

async function preloadImageWeb(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

async function preloadImageNative(url: string): Promise<void> {
  const filename = `preload_${hashUrl(url)}.cache`;
  const localPath = `${FileSystem.cacheDirectory}${filename}`;
  
  const info = await FileSystem.getInfoAsync(localPath);
  if (info.exists) return;
  
  const result = await FileSystem.downloadAsync(url, localPath);
  if (result.status !== 200) {
    throw new Error(`Download failed with status: ${result.status}`);
  }
}

async function preloadImageAsset(asset: AssetManifestItem): Promise<void> {
  if (Platform.OS === 'web') {
    return preloadImageWeb(asset.url);
  }
  return preloadImageNative(asset.url);
}

async function preloadSoundAsset(asset: AssetManifestItem): Promise<void> {
  const audioManager = getAudioManager();
  const success = await audioManager.preload(asset.id, {
    url: asset.url,
    type: 'sfx',
    loop: false,
    defaultVolume: 1.0,
  });
  
  if (!success) {
    throw new Error(`Failed to preload sound: ${asset.url}`);
  }
}

async function preloadWithConcurrency<T extends AssetManifestItem>(
  assets: T[],
  preloadFn: (asset: T) => Promise<void>,
  concurrency: number,
  completedAssets: string[],
  failedAssets: string[],
  onProgress: (current: string | null) => void
): Promise<void> {
  let currentIndex = 0;

  const preloadNext = async (): Promise<void> => {
    while (currentIndex < assets.length) {
      const asset = assets[currentIndex++];
      onProgress(asset.label);
      
      try {
        await preloadFn(asset);
        completedAssets.push(asset.id);
      } catch (error) {
        console.warn(`Failed to preload ${asset.url}:`, error);
        failedAssets.push(asset.id);
      }
    }
  };

  await Promise.all(
    Array(Math.min(concurrency, assets.length))
      .fill(null)
      .map(() => preloadNext())
  );
}

export class AssetPreloader {
  private manifest: AssetManifest;
  private onProgress: ProgressCallback;
  private aborted = false;

  constructor(manifest: AssetManifest, onProgress: ProgressCallback) {
    this.manifest = sortManifestByPriority(manifest);
    this.onProgress = onProgress;
  }

  async preloadAll(): Promise<PreloadResult> {
    const startTime = Date.now();
    this.aborted = false;
    
    const completedAssets: string[] = [];
    const failedAssets: string[] = [];
    const total = this.manifest.totalCount;

    if (total === 0) {
      this.onProgress({
        loaded: 0,
        total: 0,
        percent: 100,
        currentAsset: null,
        completedAssets: [],
        failedAssets: [],
        phase: 'complete',
      });
      return {
        success: true,
        loadedCount: 0,
        failedCount: 0,
        failedAssets: [],
        durationMs: Date.now() - startTime,
      };
    }

    const updateProgress = (currentAsset: string | null, phase: PreloadProgress['phase']) => {
      if (this.aborted) return;
      const loaded = completedAssets.length + failedAssets.length;
      this.onProgress({
        loaded,
        total,
        percent: Math.round((loaded / total) * 100),
        currentAsset,
        completedAssets: [...completedAssets],
        failedAssets: [...failedAssets],
        phase,
      });
    };

    if (this.manifest.images.length > 0 && !this.aborted) {
      await preloadWithConcurrency(
        this.manifest.images,
        preloadImageAsset,
        IMAGE_CONCURRENCY,
        completedAssets,
        failedAssets,
        (current) => updateProgress(current, 'images')
      );
    }

    if (this.manifest.sounds.length > 0 && !this.aborted) {
      await preloadWithConcurrency(
        this.manifest.sounds,
        preloadSoundAsset,
        SOUND_CONCURRENCY,
        completedAssets,
        failedAssets,
        (current) => updateProgress(current, 'sounds')
      );
    }

    updateProgress(null, 'complete');

    return {
      success: failedAssets.length === 0,
      loadedCount: completedAssets.length,
      failedCount: failedAssets.length,
      failedAssets,
      durationMs: Date.now() - startTime,
    };
  }

  abort(): void {
    this.aborted = true;
  }
}

export async function preloadSingleAsset(
  type: 'image' | 'sound',
  url: string,
  id?: string
): Promise<boolean> {
  try {
    const asset: AssetManifestItem = {
      type,
      url,
      id: id ?? url,
      label: id ?? url,
      priority: 'normal',
    };
    
    if (type === 'image') {
      await preloadImageAsset(asset);
    } else {
      await preloadSoundAsset(asset);
    }
    return true;
  } catch {
    return false;
  }
}
