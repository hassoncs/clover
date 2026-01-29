import { getStorageItem, setStorageItem } from '@/lib/utils/storage';
import type { LevelPack, LevelDefinition } from '@slopcade/shared';

const FAVORITES_STORAGE_KEY = 'angry-burns:favorites-pack';

/**
 * Create a new empty favorites pack.
 */
function createEmptyFavoritesPack(): LevelPack {
  return {
    schemaVersion: 1,
    metadata: {
      id: 'angry-burns-favorites',
      name: 'Angry Burns Favorites',
      description: 'Your favorite Angry Burns levels',
      version: '1.0.0',
      category: 'community',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    version: '1.0.0',
    levels: [],
    stats: {
      levelCount: 0,
    },
  };
}

/**
 * Load the favorites pack from storage.
 */
export async function loadFavoritesPack(): Promise<LevelPack> {
  const stored = await getStorageItem<LevelPack | null>(FAVORITES_STORAGE_KEY, null);
  if (!stored) {
    return createEmptyFavoritesPack();
  }
  return stored;
}

/**
 * Save the favorites pack to storage.
 */
export async function saveFavoritesPack(pack: LevelPack): Promise<void> {
  pack.metadata.updatedAt = Date.now();
  await setStorageItem(FAVORITES_STORAGE_KEY, pack);
}

/**
 * Check if a level is already a favorite.
 */
export async function isFavorite(levelId: string): Promise<boolean> {
  const pack = await loadFavoritesPack();
  return pack.levels.some((level) => level.levelId === levelId);
}

/**
 * Add a level to favorites.
 * Generates a unique levelId for the favorite.
 */
export async function addToFavorites(level: LevelDefinition): Promise<boolean> {
  const pack = await loadFavoritesPack();

  // Check if already a favorite
  if (pack.levels.some((l) => l.levelId === level.levelId)) {
    return false;
  }

  // Generate unique favorite levelId
  const existingIds = new Set(pack.levels.map((l) => l.levelId));
  let counter = 1;
  let favoriteId = `favorite-${counter}`;
  while (existingIds.has(favoriteId)) {
    counter++;
    favoriteId = `favorite-${counter}`;
  }

  // Create a copy with the new levelId
  const favoriteLevel: LevelDefinition = {
    ...level,
    levelId: favoriteId,
    title: level.title ? `${level.title} (Favorite)` : `Favorite ${favoriteId}`,
    metadata: {
      ...level.metadata,
      savedAt: Date.now(),
    },
  };

  pack.levels.push(favoriteLevel);
  pack.stats = {
    levelCount: pack.levels.length,
  };

  await saveFavoritesPack(pack);
  return true;
}

/**
 * Remove a level from favorites.
 */
export async function removeFromFavorites(levelId: string): Promise<boolean> {
  const pack = await loadFavoritesPack();
  const initialCount = pack.levels.length;
  pack.levels = pack.levels.filter((level) => level.levelId !== levelId);
  
  if (pack.levels.length !== initialCount) {
    pack.stats = {
      levelCount: pack.levels.length,
    };
    await saveFavoritesPack(pack);
    return true;
  }
  return false;
}

/**
 * Get the count of favorite levels.
 */
export async function getFavoritesCount(): Promise<number> {
  const pack = await loadFavoritesPack();
  return pack.levels.length;
}

/**
 * Get all favorite levels.
 */
export async function getAllFavorites(): Promise<LevelDefinition[]> {
  const pack = await loadFavoritesPack();
  return pack.levels;
}
