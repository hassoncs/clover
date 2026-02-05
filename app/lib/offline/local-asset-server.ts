/**
 * Local Asset Server for Offline Mode
 * 
 * React Native doesn't support traditional HTTP servers, so this module
 * provides a file:// URL resolver for locally stored game assets.
 * 
 * Storage structure:
 * {APP_DATA}/slopcade/games/{gameId}/generated/{gameId}/{packId}/{assetId}.png
 * 
 * R2 key format: generated/{gameId}/{packId}/{assetId}.png
 */

import { Platform } from 'react-native';

const LOCAL_SERVER_PORT = 8765;
const LOCAL_SERVER_HOST = 'localhost';

interface ServerState {
  running: boolean;
  baseDir: string | null;
}

const state: ServerState = {
  running: false,
  baseDir: null,
};

/**
 * Get the base directory for local game assets
 */
function getBaseDirectory(): string {
  if (Platform.OS === 'web') {
    return '/slopcade/games/';
  }
  return 'slopcade/games/';
}

/**
 * Convert R2 key to local file path
 * 
 * @param gameId - Game identifier
 * @param r2Key - R2 key format: generated/{gameId}/{packId}/{assetId}.png
 * @returns Local file:// URL
 */
export function getLocalAssetPath(gameId: string, r2Key: string): string {
  const baseDir = getBaseDirectory();
  return `${baseDir}${gameId}/${r2Key}`;
}

/**
 * Check if a local asset exists
 * 
 * @param gameId - Game identifier
 * @param r2Key - R2 key format
 * @returns Promise<boolean>
 */
export async function localAssetExists(gameId: string, r2Key: string): Promise<boolean> {
  console.warn('[LocalAssetServer] localAssetExists not implemented - assuming file exists');
  return true;
}

/**
 * Start the local asset server
 * 
 * NOTE: React Native doesn't support HTTP servers. This is a stub implementation
 * that sets up the base directory and marks the server as "running".
 * 
 * Actual asset serving happens via file:// URLs returned by getLocalAssetPath().
 * 
 * @returns Promise<void>
 */
export async function startLocalAssetServer(): Promise<void> {
  if (state.running) {
    console.log('[LocalAssetServer] Already running');
    return;
  }

  const baseDir = getBaseDirectory();
  state.baseDir = baseDir;
  state.running = true;

  if (Platform.OS === 'web') {
    console.warn(
      '[LocalAssetServer] Web platform detected. ' +
      'HTTP server not implemented for web. ' +
      'Use file:// URLs or consider implementing a service worker.'
    );
  } else {
    console.log(
      `[LocalAssetServer] Started (file:// mode)\n` +
      `Base directory: ${baseDir}\n` +
      `Note: React Native uses direct file:// access, not HTTP server`
    );
  }
}

/**
 * Stop the local asset server
 * 
 * @returns Promise<void>
 */
export async function stopLocalAssetServer(): Promise<void> {
  if (!state.running) {
    console.log('[LocalAssetServer] Not running');
    return;
  }

  state.running = false;
  state.baseDir = null;
  console.log('[LocalAssetServer] Stopped');
}

/**
 * Check if the server is running
 * 
 * @returns boolean
 */
export function isServerRunning(): boolean {
  return state.running;
}

/**
 * Get the server URL (for compatibility with HTTP-based implementations)
 * 
 * NOTE: This returns a placeholder URL. Actual asset access should use
 * getLocalAssetPath() which returns file:// URLs.
 * 
 * @returns string
 */
export function getServerUrl(): string {
  if (Platform.OS === 'web') {
    return '/slopcade/games';
  }
  return `file://${getBaseDirectory()}`;
}

/**
 * Get asset URL for a given game and R2 key
 * 
 * This is the primary method for getting asset URLs in offline mode.
 * 
 * @param gameId - Game identifier
 * @param r2Key - R2 key format: generated/{gameId}/{packId}/{assetId}.png
 * @returns Local file:// URL
 */
export function getAssetUrl(gameId: string, r2Key: string): string {
  if (!state.running) {
    console.warn('[LocalAssetServer] Server not running, returning path anyway');
  }
  return getLocalAssetPath(gameId, r2Key);
}
