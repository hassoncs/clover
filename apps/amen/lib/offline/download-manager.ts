/**
 * Download Manager for Offline Mode
 *
 * Downloads game definitions and asset blobs for offline play:
 * {documentDirectory}/slopcade/games/{gameId}/
 *   ├── definition.json
 *   └── blobs/{hash[0:2]}/{hash}
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { GameDefinition } from "@slopcade/shared";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

const STORAGE_KEY = "slopcade:downloaded-games";
const DOWNLOAD_CONCURRENCY = 4;

export interface DownloadedGame {
	gameId: string;
	downloadedAt: number;
	totalBytes: number;
	assetCount: number;
}

function getBaseDirectory(): string {
	if (Platform.OS === "web") {
		throw new Error("Offline downloads not supported on web");
	}
	return `${FileSystem.documentDirectory}slopcade/games/`;
}

function getGameDirectory(gameId: string): string {
	return `${getBaseDirectory()}${gameId}/`;
}

function collectAssetHashes(definition: GameDefinition): string[] {
	const hashes = new Set<string>();

	if (definition.prefabs) {
		for (const prefab of Object.values(definition.prefabs)) {
			if (prefab.visual?.type === "image" && prefab.visual.assetId) {
				hashes.add(prefab.visual.assetId);
			}
		}
	}

	if (
		definition.background?.type === "static" &&
		definition.background.assetId
	) {
		hashes.add(definition.background.assetId);
	}

	if (definition.sounds) {
		for (const sound of Object.values(definition.sounds)) {
			if (sound.assetId) {
				hashes.add(sound.assetId);
			}
		}
	}

	return Array.from(hashes);
}

function blobUrlPath(hash: string): string {
	return `blobs/${hash.slice(0, 2)}/${hash}`;
}

async function downloadFile(url: string, localPath: string): Promise<void> {
	const dirPath = localPath.substring(0, localPath.lastIndexOf("/"));
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
	onProgress?: (downloaded: number, total: number) => void,
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

async function saveDownloadedGames(
	games: Record<string, DownloadedGame>,
): Promise<void> {
	await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(games));
}

export async function downloadGameForOffline(
	gameId: string,
	cdnBaseUrl: string,
	onProgress?: (downloaded: number, total: number) => void,
): Promise<void> {
	if (Platform.OS === "web") {
		throw new Error("Offline downloads not supported on web");
	}

	const gameDir = getGameDirectory(gameId);
	const baseUrl = cdnBaseUrl.replace(/\/$/, "");
	const gameBaseUrl = `${baseUrl}/games/${gameId}`;

	await FileSystem.makeDirectoryAsync(gameDir, { intermediates: true });

	// 1. Download definition.json
	await downloadFile(
		`${gameBaseUrl}/definition.json`,
		`${gameDir}definition.json`,
	);

	// 2. Parse definition and collect asset hashes
	const definitionStr = await FileSystem.readAsStringAsync(
		`${gameDir}definition.json`,
	);
	const definition: GameDefinition = JSON.parse(definitionStr);
	const hashes = collectAssetHashes(definition);

	// 3. Build download list for each unique blob
	const blobFiles = hashes.map((hash) => ({
		url: `${baseUrl}/assets/${blobUrlPath(hash)}`,
		localPath: `${gameDir}${blobUrlPath(hash)}`,
	}));

	// 4. Download all blobs with progress
	if (blobFiles.length > 0) {
		await downloadWithConcurrency(blobFiles, onProgress);
	}

	// 5. Track in AsyncStorage
	const games = await loadDownloadedGames();
	games[gameId] = {
		gameId,
		downloadedAt: Date.now(),
		totalBytes: 0,
		assetCount: blobFiles.length,
	};
	await saveDownloadedGames(games);
}

export async function deleteOfflineGame(gameId: string): Promise<void> {
	if (Platform.OS === "web") {
		throw new Error("Offline downloads not supported on web");
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
	if (Platform.OS === "web") {
		return false;
	}

	const defPath = `${getGameDirectory(gameId)}definition.json`;
	const fileInfo = await FileSystem.getInfoAsync(defPath);
	return fileInfo.exists;
}

export async function getDownloadedGames(): Promise<DownloadedGame[]> {
	if (Platform.OS === "web") {
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
} | null> {
	if (Platform.OS === "web") {
		return null;
	}

	const definition = await loadLocalGameDefinition(gameId);
	if (!definition) {
		return null;
	}

	const hashes = collectAssetHashes(definition);
	const games = await loadDownloadedGames();
	const record = games[gameId];

	return {
		gameId,
		isPlayable: true,
		assetCount: hashes.length,
		totalBytes: record?.totalBytes ?? 0,
	};
}

// ============================================================================
// LOCAL READ FUNCTIONS (for offline playback)
// ============================================================================

/**
 * Load the game definition from local storage.
 * Returns null if the game is not downloaded.
 */
export async function loadLocalGameDefinition(
	gameId: string,
): Promise<GameDefinition | null> {
	if (Platform.OS === "web") {
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
		console.error(
			`[DownloadManager] Error loading definition for ${gameId}:`,
			error,
		);
		return null;
	}
}

/**
 * Get the local file path for a blob by its content hash.
 * Returns null if the blob is not downloaded.
 */
export async function getLocalBlobPath(
	gameId: string,
	hash: string,
): Promise<string | null> {
	if (Platform.OS === "web") {
		return null;
	}

	const localPath = `${getGameDirectory(gameId)}${blobUrlPath(hash)}`;
	const fileInfo = await FileSystem.getInfoAsync(localPath);
	return fileInfo.exists ? localPath : null;
}
