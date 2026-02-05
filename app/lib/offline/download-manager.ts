/**
 * Download Manager for Offline Mode
 *
 * Downloads the R2-mirror directory structure for offline play:
 * {documentDirectory}/slopcade/games/{gameId}/
 *   ├── definition.json
 *   ├── metadata.json
 *   └── packs/{packName}/
 *       ├── manifest.json
 *       └── {filename}.png
 */

import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEY = 'slopcade:downloaded-games';
const DOWNLOAD_CONCURRENCY = 4;

export interface DownloadedGame {
  gameId: string;
  downloadedAt: number;
  totalBytes: number;
  assetCount: number;
}

interface GameMetadata {
  id: string;
  title: string;
  description: string | null;
  packs: Array<{ name: string; packId: string; assetCount: number }>;
}

interface PackManifest {
  packId: string;
  name: string;
  assets: Record<string, { file: string }>;
}

function getBaseDirectory(): string {
  if (Platform.OS === 'web') {
    throw new Error('Offline downloads not supported on web');
  }
  return `${FileSystem.documentDirectory}slopcade/games/`;
}

function getGameDirectory(gameId: string): string {
  return `${getBaseDirectory()}${gameId}/`;
}

async function downloadFile(url: string, localPath: string): Promise<void> {
  const dirPath = localPath.substring(0, localPath.lastIndexOf('/'));
  const dirInfo = await FileSystem.getInfoAsync(dirPath);

  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
  }

  const result = await FileSystem.downloadAsync(url, localPath);

  if (result.status !== 200) {
    throw new Error(`Failed to download: ${url} (status: ${result.status})`);
  }
}

async function downloadWithConcurrency(
  files: Array<{ url: string; localPath: string }>,
  onProgress?: (downloaded: number, total: number) => void
): Promise<void> {
  let completed = 0;
  const total = files.length;
  const queue = [...files];
  const activeDownloads: Promise<void>[] = [];

  const processNext = async (): Promise<void> => {
    const file = queue.shift();
    if (!file) return;

    await downloadFile(file.url, file.localPath);
    completed++;
    onProgress?.(completed, total);

    if (queue.length > 0) {
      return processNext();
    }
  };

  for (let i = 0; i < Math.min(DOWNLOAD_CONCURRENCY, files.length); i++) {
    activeDownloads.push(processNext());
  }

  await Promise.all(activeDownloads);
}

async function loadDownloadedGames(): Promise<Record<string, DownloadedGame>> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    return json ? JSON.parse(json) : {};
  } catch {
    return {};
  }
}

async function saveDownloadedGames(games: Record<string, DownloadedGame>): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(games));
}

export async function downloadGameForOffline(
  gameId: string,
  cdnBaseUrl: string,
  onProgress?: (downloaded: number, total: number) => void
): Promise<void> {
  if (Platform.OS === 'web') {
    throw new Error('Offline downloads not supported on web');
  }

  const gameDir = getGameDirectory(gameId);
  const gameBaseUrl = `${cdnBaseUrl.replace(/\/$/, '')}/games/${gameId}`;

  await FileSystem.makeDirectoryAsync(gameDir, { intermediates: true });

  // 1. Download metadata.json
  await downloadFile(`${gameBaseUrl}/metadata.json`, `${gameDir}metadata.json`);

  // 2. Download definition.json
  await downloadFile(`${gameBaseUrl}/definition.json`, `${gameDir}definition.json`);

  // 3. Parse metadata to discover packs
  const metadataStr = await FileSystem.readAsStringAsync(`${gameDir}metadata.json`);
  const metadata: GameMetadata = JSON.parse(metadataStr);

  // 4. For each pack: download manifest, then asset files
  const assetFiles: Array<{ url: string; localPath: string }> = [];

  for (const pack of metadata.packs) {
    const packDir = `${gameDir}packs/${pack.name}/`;
    await FileSystem.makeDirectoryAsync(packDir, { intermediates: true });

    // Download pack manifest
    const manifestUrl = `${gameBaseUrl}/packs/${pack.name}/manifest.json`;
    const manifestPath = `${packDir}manifest.json`;
    await downloadFile(manifestUrl, manifestPath);

    // Parse manifest to get asset files
    const manifestStr = await FileSystem.readAsStringAsync(manifestPath);
    const packManifest: PackManifest = JSON.parse(manifestStr);

    for (const [, assetEntry] of Object.entries(packManifest.assets)) {
      assetFiles.push({
        url: `${gameBaseUrl}/packs/${pack.name}/${assetEntry.file}`,
        localPath: `${packDir}${assetEntry.file}`,
      });
    }
  }

  // 5. Download all assets with progress
  if (assetFiles.length > 0) {
    await downloadWithConcurrency(assetFiles, onProgress);
  }

  // 6. Track in AsyncStorage
  const games = await loadDownloadedGames();
  games[gameId] = {
    gameId,
    downloadedAt: Date.now(),
    totalBytes: 0,
    assetCount: assetFiles.length,
  };
  await saveDownloadedGames(games);
}

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

export async function isGameDownloaded(gameId: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  const defPath = `${getGameDirectory(gameId)}definition.json`;
  const fileInfo = await FileSystem.getInfoAsync(defPath);
  return fileInfo.exists;
}

export async function getDownloadedGames(): Promise<DownloadedGame[]> {
  if (Platform.OS === 'web') {
    return [];
  }

  const games = await loadDownloadedGames();
  return Object.values(games);
}
