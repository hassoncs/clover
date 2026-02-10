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
import type { GameDefinition } from '@slopcade/shared';
import type { ResolvedPackEntry } from '@/lib/assets';

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

interface OfflineManifest {
  gameId: string;
  definition: GameDefinition;
  packs: Array<{
    packId: string;
    name: string;
    assets: Record<string, { file: string; localPath: string }>;
  }>;
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

  const packsBaseUrl = `${cdnBaseUrl.replace(/\/$/, '')}/packs`;

  for (const pack of metadata.packs) {
    const packDir = `${gameDir}packs/${pack.packId}/`;
    await FileSystem.makeDirectoryAsync(packDir, { intermediates: true });

    // Download pack manifest
    const manifestUrl = `${packsBaseUrl}/${pack.packId}/manifest.json`;
    const manifestPath = `${packDir}manifest.json`;
    await downloadFile(manifestUrl, manifestPath);

    // Parse manifest to get asset files
    const manifestStr = await FileSystem.readAsStringAsync(manifestPath);
    const packManifest: PackManifest = JSON.parse(manifestStr);

    for (const [, assetEntry] of Object.entries(packManifest.assets)) {
      assetFiles.push({
        url: `${packsBaseUrl}/${pack.packId}/${assetEntry.file}`,
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

export async function isGamePlayableOffline(gameId: string): Promise<boolean> {
  return isGameDownloaded(gameId);
}

/**
 * Get detailed info about a game's offline status.
 * Returns null if the game is not available offline.
 */
export async function getOfflineGameInfo(gameId: string): Promise<{
  gameId: string;
  isPlayable: boolean;
  assetCount: number;
  totalBytes: number;
  availablePackIds: string[];
} | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  const gameDir = getGameDirectory(gameId);
  const metadataPath = `${gameDir}metadata.json`;

  const metadataInfo = await FileSystem.getInfoAsync(metadataPath);
  if (!metadataInfo.exists) {
    return null;
  }

  try {
    const metadataStr = await FileSystem.readAsStringAsync(metadataPath);
    const metadata = JSON.parse(metadataStr);

    // Check which packs are actually available
    const availablePackIds: string[] = [];
    for (const pack of metadata.packs || []) {
      const packManifestPath = `${gameDir}packs/${pack.packId}/manifest.json`;
      const packInfo = await FileSystem.getInfoAsync(packManifestPath);
      if (packInfo.exists) {
        availablePackIds.push(pack.packId);
      }
    }

    return {
      gameId,
      isPlayable: availablePackIds.length > 0,
      assetCount: metadata.packs?.reduce((sum: number, p: any) => sum + (p.assetCount || 0), 0) || 0,
      totalBytes: metadata.totalBytes || 0,
      availablePackIds,
    };
  } catch (error) {
    console.error(`[DownloadManager] Error reading metadata for ${gameId}:`, error);
    return null;
  }
}

// ============================================================================
// LOCAL READ FUNCTIONS (for offline playback)
// ============================================================================

/**
 * Load the game definition from local storage.
 * Returns null if the game is not downloaded.
 */
export async function loadLocalGameDefinition(gameId: string): Promise<GameDefinition | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  const gameDir = getGameDirectory(gameId);
  const definitionPath = `${gameDir}definition.json`;

  const fileInfo = await FileSystem.getInfoAsync(definitionPath);
  if (!fileInfo.exists) {
    return null;
  }

  try {
    const json = await FileSystem.readAsStringAsync(definitionPath);
    return JSON.parse(json) as GameDefinition;
  } catch (error) {
    console.error(`[DownloadManager] Error loading definition for ${gameId}:`, error);
    return null;
  }
}

/**
 * Load the offline manifest for a game.
 * The offline manifest contains all pack/asset info for local playback.
 */
export async function loadOfflineManifest(gameId: string): Promise<OfflineManifest | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  const gameDir = getGameDirectory(gameId);
  const manifestPath = `${gameDir}offline-manifest.json`;

  const fileInfo = await FileSystem.getInfoAsync(manifestPath);
  if (!fileInfo.exists) {
    // Try to build it from legacy structure
    return buildOfflineManifestFromLegacy(gameId);
  }

  try {
    const json = await FileSystem.readAsStringAsync(manifestPath);
    return JSON.parse(json) as OfflineManifest;
  } catch (error) {
    console.error(`[DownloadManager] Error loading offline manifest for ${gameId}:`, error);
    return null;
  }
}

/**
 * Build an offline manifest from the legacy directory structure.
 * This is a migration helper for games downloaded before offline-manifest.json existed.
 */
async function buildOfflineManifestFromLegacy(gameId: string): Promise<OfflineManifest | null> {
  const gameDir = getGameDirectory(gameId);
  
  // Load definition
  const definition = await loadLocalGameDefinition(gameId);
  if (!definition) {
    return null;
  }

  // Load metadata to get pack list
  const metadataPath = `${gameDir}metadata.json`;
  const metadataInfo = await FileSystem.getInfoAsync(metadataPath);
  if (!metadataInfo.exists) {
    return null;
  }

  try {
    const metadataStr = await FileSystem.readAsStringAsync(metadataPath);
    const metadata: GameMetadata = JSON.parse(metadataStr);

    const packs: OfflineManifest['packs'] = [];

    for (const packMeta of metadata.packs) {
      const packManifestPath = `${gameDir}packs/${packMeta.packId}/manifest.json`;
      const packManifestInfo = await FileSystem.getInfoAsync(packManifestPath);
      
      if (!packManifestInfo.exists) {
        continue;
      }

      const manifestStr = await FileSystem.readAsStringAsync(packManifestPath);
      const packManifest: PackManifest = JSON.parse(manifestStr);

      const assets: Record<string, { file: string; localPath: string }> = {};
      for (const [assetId, assetEntry] of Object.entries(packManifest.assets)) {
        assets[assetId] = {
          file: assetEntry.file,
          localPath: `${gameDir}packs/${packMeta.packId}/${assetEntry.file}`,
        };
      }

      packs.push({
        packId: packMeta.packId,
        name: packMeta.name,
        assets,
      });
    }

    return {
      gameId,
      definition,
      packs,
    };
  } catch (error) {
    console.error(`[DownloadManager] Error building legacy manifest for ${gameId}:`, error);
    return null;
  }
}

/**
 * Get resolved pack entries for a specific pack from local storage.
 * Returns a map of templateId -> ResolvedPackEntry for use with the game runtime.
 */
export async function getLocalResolvedPackEntries(
  gameId: string,
  packId: string
): Promise<Record<string, ResolvedPackEntry> | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  const manifest = await loadOfflineManifest(gameId);
  if (!manifest) {
    return null;
  }

  const pack = manifest.packs.find(p => p.packId === packId);
  if (!pack) {
    return null;
  }

  const entries: Record<string, ResolvedPackEntry> = {};
  
  for (const [templateId, asset] of Object.entries(pack.assets)) {
    // Verify file exists
    const fileInfo = await FileSystem.getInfoAsync(asset.localPath);
    if (fileInfo.exists) {
      entries[templateId] = {
        imageUrl: asset.localPath,
      };
    }
  }

  return entries;
}

/**
 * Get all locally available pack IDs for a game.
 */
export async function getLocalPackIds(gameId: string): Promise<string[]> {
  if (Platform.OS === 'web') {
    return [];
  }

  const manifest = await loadOfflineManifest(gameId);
  if (!manifest) {
    return [];
  }

  return manifest.packs.map(p => p.packId);
}

/**
 * Check if a specific pack is available locally.
 */
export async function isPackAvailableLocally(gameId: string, packId: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  const manifest = await loadOfflineManifest(gameId);
  if (!manifest) {
    return false;
  }

  const pack = manifest.packs.find(p => p.packId === packId);
  if (!pack) {
    return false;
  }

  // Verify at least one asset exists
  for (const asset of Object.values(pack.assets)) {
    const fileInfo = await FileSystem.getInfoAsync(asset.localPath);
    if (fileInfo.exists) {
      return true;
    }
  }

  return false;
}
