import * as fs from 'node:fs';
import * as path from 'node:path';
import { compileBundle } from './compiler';
import type { BundleCompileResult } from './types';
import type { GameDefinition } from '../types/GameDefinition';

const BUNDLE_SUBDIR = '.bundle';

/**
 * Metadata extracted from a game bundle manifest.
 * This is the minimal set of metadata needed for registry generation.
 */
export interface BundleMetadata {
  title: string;
  description?: string;
  status?: 'active' | 'archived' | 'beta';
  category?: string;
  tags?: string[];
  author?: string;
  players?: 1 | 2 | '1-2' | '1-4';
  thumbnailUrl?: string;
  titleHeroImageUrl?: string;
}

/**
 * Result of loading a game bundle.
 */
export interface LoadBundleResult {
  gameDefinition: GameDefinition;
  metadata: BundleMetadata;
}

/**
 * Check if a directory path contains a .bundle subdirectory.
 * Used to identify directories that may contain game bundles.
 */
export function isBundleDirectory(dirPath: string): boolean {
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    return false;
  }

  const bundlePath = path.join(dirPath, BUNDLE_SUBDIR);
  return fs.existsSync(bundlePath) && fs.statSync(bundlePath).isDirectory();
}

/**
 * Extract metadata from the manifest data in the bundle compile result.
 */
function extractMetadata(rawData: BundleCompileResult['rawData']): BundleMetadata {
  const manifest = rawData.manifest || {};

  const metadata: BundleMetadata = {
    title: (manifest.title as string) || (manifest.name as string) || 'Untitled Game',
    description: manifest.description as string | undefined,
    status: (manifest.status as BundleMetadata['status']) || 'active',
    category: manifest.category as BundleMetadata['category'] | undefined,
    tags: manifest.tags as string[] | undefined,
    author: manifest.author as string | undefined,
    players: manifest.players as BundleMetadata['players'] | undefined,
    thumbnailUrl: manifest.thumbnailUrl as string | undefined,
    titleHeroImageUrl: manifest.titleHeroImageUrl as string | undefined,
  };

  return metadata;
}

/**
 * Synchronously load and compile a game bundle.
 * Returns the compiled game definition and extracted metadata, or null on failure.
 */
export function loadBundleSync(bundlePath: string): LoadBundleResult | null {
  const result = compileBundle(bundlePath);

  if (!result.success || !result.gameDefinition) {
    const errorMessages = result.errors.map(e => e.message).join('; ');
    console.error(`Failed to compile bundle at ${bundlePath}: ${errorMessages}`);
    return null;
  }

  const metadata = extractMetadata(result.rawData);

  return {
    gameDefinition: result.gameDefinition,
    metadata,
  };
}
