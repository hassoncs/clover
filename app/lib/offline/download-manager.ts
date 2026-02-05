/**
 * Download Manager for Offline Mode
 * 
 * Handles downloading game assets for offline play:
 * - Fetches manifest from API
 * - Downloads all assets with progress tracking
 * - Stores locally using Expo FileSystem
 * - Tracks downloaded games in AsyncStorage
 * 
 * Storage structure:
 * {documentDirectory}/slopcade/games/{gameId}/
 *   ├── manifest.json
 *   └── {packId}/*.png
 */

import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEY = 'slopcade:downloaded-games';
const DOWNLOAD_CONCURRENCY = 4;

export interface DownloadedGame {
  gameId: string;
  packId: string;
  downloadedAt: number;
  totalBytes: number;
  assetCount: number;
}

interface OfflineManifest {
  gameId: string;
  packId: string;
  definition: unknown;
  assets: Array<{
    r2Key: string;
    url: string;
    width: number;
    height: number;
    templateId: string;
  }>;
  totalBytes: number;
}

/**
 * Get the base directory for offline games
 */
function getBaseDirectory(): string {
  if (Platform.OS === 'web') {
    throw new Error('Offline downloads not supported on web');
  }
  return `${FileSystem.documentDirectory}slopcade/games/`;
}

/**
 * Get the directory for a specific game
 */
function getGameDirectory(gameId: string): string {
  return `${getBaseDirectory()}${gameId}/`;
}

/**
 * Fetch offline manifest from API
 */
async function fetchOfflineManifest(gameId: string): Promise<OfflineManifest> {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8789';
  const response = await fetch(`${apiUrl}/trpc/assetSystem.offlineManifest?input=${encodeURIComponent(JSON.stringify({ gameId }))}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch offline manifest: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.result.data;
}

/**
 * Download a single asset file
 */
async function downloadAsset(url: string, localPath: string): Promise<void> {
  const dirPath = localPath.substring(0, localPath.lastIndexOf('/'));
  const dirInfo = await FileSystem.getInfoAsync(dirPath);
  
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
  }
  
  const downloadResult = await FileSystem.downloadAsync(url, localPath);
  
  if (downloadResult.status !== 200) {
    throw new Error(`Failed to download asset: ${url} (status: ${downloadResult.status})`);
  }
}

/**
 * Download assets with concurrency control
 */
async function downloadAssetsWithProgress(
  assets: OfflineManifest['assets'],
  gameDir: string,
  onProgress?: (downloaded: number, total: number) => void
): Promise<void> {
  let completed = 0;
  const total = assets.length;
  
  const downloadQueue = [...assets];
  const activeDownloads: Promise<void>[] = [];
  
  const processNext = async (): Promise<void> => {
    const asset = downloadQueue.shift();
    if (!asset) return;
    
    const localPath = `${gameDir}${asset.r2Key}`;
    
    try {
      await downloadAsset(asset.url, localPath);
      completed++;
      onProgress?.(completed, total);
    } catch (error) {
      console.error(`Failed to download asset ${asset.r2Key}:`, error);
      throw error;
    }
    
    if (downloadQueue.length > 0) {
      return processNext();
    }
  };
  
  for (let i = 0; i < Math.min(DOWNLOAD_CONCURRENCY, assets.length); i++) {
    activeDownloads.push(processNext());
  }
  
  await Promise.all(activeDownloads);
}

/**
 * Load downloaded games metadata from AsyncStorage
 */
async function loadDownloadedGames(): Promise<Record<string, DownloadedGame>> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    return json ? JSON.parse(json) : {};
  } catch (error) {
    console.error('Failed to load downloaded games:', error);
    return {};
  }
}

/**
 * Save downloaded games metadata to AsyncStorage
 */
async function saveDownloadedGames(games: Record<string, DownloadedGame>): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(games));
  } catch (error) {
    console.error('Failed to save downloaded games:', error);
    throw error;
  }
}

/**
 * Download a game for offline play
 * 
 * @param gameId - Game identifier
 * @param onProgress - Optional progress callback (downloaded, total)
 * @throws Error if download fails
 */
export async function downloadGameForOffline(
  gameId: string,
  onProgress?: (downloaded: number, total: number) => void
): Promise<void> {
  if (Platform.OS === 'web') {
    throw new Error('Offline downloads not supported on web');
  }
  
  const manifest = await fetchOfflineManifest(gameId);
  const gameDir = getGameDirectory(gameId);
  
  const dirInfo = await FileSystem.getInfoAsync(gameDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(gameDir, { intermediates: true });
  }
  
  await downloadAssetsWithProgress(manifest.assets, gameDir, onProgress);
  
  const manifestPath = `${gameDir}manifest.json`;
  await FileSystem.writeAsStringAsync(manifestPath, JSON.stringify(manifest));
  
  const games = await loadDownloadedGames();
  games[gameId] = {
    gameId,
    packId: manifest.packId,
    downloadedAt: Date.now(),
    totalBytes: manifest.totalBytes,
    assetCount: manifest.assets.length,
  };
  await saveDownloadedGames(games);
}

/**
 * Delete a downloaded game
 * 
 * @param gameId - Game identifier
 */
export async function deleteOfflineGame(gameId: string): Promise<void> {
  if (Platform.OS === 'web') {
    throw new Error('Offline downloads not supported on web');
  }
  
  const gameDir = getGameDirectory(gameId);
  const dirInfo = await FileSystem.getInfoAsync(gameDir);
  
  if (dirInfo.exists) {
    await FileSystem.deleteAsync(gameDir, { idempotent: true });
  }
  
  const games = await loadDownloadedGames();
  delete games[gameId];
  await saveDownloadedGames(games);
}

/**
 * Check if a game is downloaded
 * 
 * @param gameId - Game identifier
 * @returns true if game manifest exists locally
 */
export async function isGameDownloaded(gameId: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }
  
  const manifestPath = `${getGameDirectory(gameId)}manifest.json`;
  const fileInfo = await FileSystem.getInfoAsync(manifestPath);
  return fileInfo.exists;
}

/**
 * Get list of all downloaded games
 * 
 * @returns Array of downloaded game metadata
 */
export async function getDownloadedGames(): Promise<DownloadedGame[]> {
  if (Platform.OS === 'web') {
    return [];
  }
  
  const games = await loadDownloadedGames();
  return Object.values(games);
}
