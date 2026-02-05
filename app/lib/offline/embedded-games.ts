import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { env } from '@/lib/config/env';
import {
  EMBEDDED_MANIFEST,
  EMBEDDED_DEFINITIONS,
  EMBEDDED_PACK_MANIFESTS,
  EMBEDDED_ASSETS,
} from './embedded-games-registry';

const STORAGE_KEY = 'slopcade:downloaded-games';
const INSTALLATION_KEY = 'slopcade:embedded-installed';

interface DownloadedGame {
  gameId: string;
  packId: string;
  downloadedAt: number;
  totalBytes: number;
  assetCount: number;
}

interface EmbeddedGameEntry {
  gameId: string;
  packId: string;
  assetCount: number;
  totalBytes: number;
}

function getBaseDirectory(): string {
  return `${FileSystem.documentDirectory}slopcade/games/`;
}

function getGameDirectory(gameId: string): string {
  return `${getBaseDirectory()}${gameId}/`;
}

export async function needsInstallation(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (!env.embedGames) return false;
  if (EMBEDDED_MANIFEST.totalGames === 0) return false;
  
  const installedVersion = await AsyncStorage.getItem(INSTALLATION_KEY);
  if (installedVersion === String(EMBEDDED_MANIFEST.version)) {
    return false;
  }
  
  return true;
}

export async function installEmbeddedGames(
  onProgress?: (installed: number, total: number) => void
): Promise<void> {
  if (Platform.OS === 'web') {
    throw new Error('Embedded games installation not supported on web');
  }
  
  const games = EMBEDDED_MANIFEST.games as EmbeddedGameEntry[];
  console.log(`[EmbeddedGames] Installing ${games.length} games...`);
  
  const downloadedGames = await loadDownloadedGames();
  let installed = 0;
  
  for (const game of games) {
    try {
      await installGame(game, downloadedGames);
      installed++;
      onProgress?.(installed, games.length);
      console.log(`[EmbeddedGames] Installed ${game.gameId} (${installed}/${games.length})`);
    } catch (error) {
      console.error(`[EmbeddedGames] Failed to install ${game.gameId}:`, error);
      throw error;
    }
  }
  
  await saveDownloadedGames(downloadedGames);
  await AsyncStorage.setItem(INSTALLATION_KEY, String(EMBEDDED_MANIFEST.version));
  
  console.log(`[EmbeddedGames] Installation complete: ${installed} games`);
}

async function installGame(
  game: EmbeddedGameEntry,
  downloadedGames: Record<string, DownloadedGame>
): Promise<void> {
  const gameDir = getGameDirectory(game.gameId);

  await FileSystem.makeDirectoryAsync(gameDir, { intermediates: true });

  const definition = EMBEDDED_DEFINITIONS[game.gameId];
  if (!definition) {
    throw new Error(`Game definition not found for ${game.gameId}`);
  }

  // Write definition.json to local storage
  await FileSystem.writeAsStringAsync(
    `${gameDir}definition.json`,
    JSON.stringify(definition)
  );

  // Copy pack assets
  if (game.assetCount > 0) {
    const packManifests = EMBEDDED_PACK_MANIFESTS[game.gameId] || {};
    for (const [packName, manifest] of Object.entries(packManifests)) {
      const m = manifest as { assets?: Record<string, { file: string }> };
      if (!m.assets) continue;

      // Write pack manifest
      const packDir = `${gameDir}packs/${packName}/`;
      await FileSystem.makeDirectoryAsync(packDir, { intermediates: true });
      await FileSystem.writeAsStringAsync(
        `${packDir}manifest.json`,
        JSON.stringify(manifest)
      );

      // Copy asset files
      for (const [, assetEntry] of Object.entries(m.assets)) {
        const assetKey = `${game.gameId}/packs/${packName}/${assetEntry.file}`;
        const assetModule = EMBEDDED_ASSETS[assetKey];
        if (!assetModule) {
          console.warn(`[EmbeddedGames] Asset not found in registry: ${assetKey}`);
          continue;
        }

        const asset = Asset.fromModule(assetModule);
        await asset.downloadAsync();

        if (!asset.localUri) {
          console.warn(`[EmbeddedGames] No localUri for asset: ${assetKey}`);
          continue;
        }

        const targetPath = `${packDir}${assetEntry.file}`;
        const targetDir = targetPath.substring(0, targetPath.lastIndexOf('/'));
        await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
        await FileSystem.copyAsync({
          from: asset.localUri,
          to: targetPath,
        });
      }
    }
  }

  downloadedGames[game.gameId] = {
    gameId: game.gameId,
    packId: game.packId,
    downloadedAt: Date.now(),
    totalBytes: game.totalBytes,
    assetCount: game.assetCount,
  };
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

export function getEmbeddedGameIds(): string[] {
  return (EMBEDDED_MANIFEST.games as EmbeddedGameEntry[]).map(g => g.gameId);
}

export async function clearEmbeddedInstallation(): Promise<void> {
  await AsyncStorage.removeItem(INSTALLATION_KEY);
  
  const baseDir = getBaseDirectory();
  const dirInfo = await FileSystem.getInfoAsync(baseDir);
  if (dirInfo.exists) {
    await FileSystem.deleteAsync(baseDir, { idempotent: true });
  }
  
  await AsyncStorage.removeItem(STORAGE_KEY);
  
  console.log('[EmbeddedGames] Cleared installation');
}
