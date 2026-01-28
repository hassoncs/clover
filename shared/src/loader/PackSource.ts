/**
 * @file PackSource.ts
 * @description Abstract pack source for loading LevelPack data from different locations.
 *
 * Supports:
 * - Bundled: Load from local JSON files bundled with the app
 * - Remote: Fetch from API/CDN endpoints
 *
 * ## Usage Pattern
 *
 * ```typescript
 * // Bundled source (assets bundled with app)
 * const bundledSource = new BundledPackSource();
 * const pack = await bundledSource.loadPack('slopeggle-basic-v1');
 *
 * // Remote source (API/CDN)
 * const remoteSource = new RemotePackSource('https://api.example.com/packs');
 * const pack = await remoteSource.loadPack('slopeggle-basic-v1');
 * ```
 */

import type { LevelPack } from '../types/LevelPack';

/**
 * Result of a pack load operation.
 */
export interface PackLoadResult {
  /** The loaded pack */
  pack: LevelPack;
  /** Whether the pack was cached */
  fromCache: boolean;
  /** Load timestamp */
  loadedAt: number;
}

/**
 * Abstract base class for pack sources.
 * Implementations provide the actual loading mechanism.
 */
export abstract class PackSource {
  /**
   * Unique identifier for this source (e.g., "bundled", "remote:api.example.com").
   */
  abstract readonly id: string;

  /**
   * Load a pack by its ID.
   * @param packId - The pack identifier
   * @returns Promise resolving to the loaded pack
   */
  abstract loadPack(packId: string): Promise<LevelPack>;

  /**
   * Check if a pack exists in this source.
   * @param packId - The pack identifier
   * @returns Promise resolving to true if pack exists
   */
  abstract exists(packId: string): Promise<boolean>;

  /**
   * List all available pack IDs in this source.
   * @returns Promise resolving to array of pack IDs
   */
  abstract listPacks(): Promise<string[]>;

  /**
   * Get metadata for a pack without loading the full pack.
   * @param packId - The pack identifier
   * @returns Promise resolving to pack metadata or undefined
   */
  abstract getMetadata(packId: string): Promise<LevelPack['metadata'] | undefined>;
}

/**
 * Pack source that loads from local JSON files bundled with the app.
 *
 * Files are expected at: `{basePath}/{packId}.json`
 */
export class BundledPackSource extends PackSource {
  readonly id = 'bundled';

  /**
   * Create a new bundled pack source.
   * @param basePath - Base path for bundled pack files (default: 'assets/packs')
   * @param fetchFn - Optional fetch function for SSR/custom loaders
   */
  constructor(
    private readonly basePath: string = 'assets/packs',
    private readonly fetchFn?: (url: string) => Promise<Response>,
  ) {
    super();
  }

  async loadPack(packId: string): Promise<LevelPack> {
    const url = `${this.basePath}/${packId}.json`;
    const response = await this.fetchOrThrow(url);
    const pack = await response.json() as LevelPack;

    return this.validatePack(pack, url);
  }

  async exists(packId: string): Promise<boolean> {
    const url = `${this.basePath}/${packId}.json`;
    try {
      const response = await this.fetch(url);
      return response?.ok ?? false;
    } catch {
      return false;
    }
  }

  async listPacks(): Promise<string[]> {
    // Bundled sources typically have a manifest file listing available packs
    const manifestUrl = `${this.basePath}/_manifest.json`;

    try {
      const response = await this.fetch(manifestUrl);
      if (!response?.ok) {
        // No manifest - return empty list
        return [];
      }

      const manifest = await response.json() as { packs: string[] };
      return manifest.packs ?? [];
    } catch {
      // If no manifest, we can't list packs
      return [];
    }
  }

  async getMetadata(packId: string): Promise<LevelPack['metadata'] | undefined> {
    try {
      const pack = await this.loadPack(packId);
      return pack.metadata;
    } catch {
      return undefined;
    }
  }

  private async fetch(url: string): Promise<Response | undefined> {
    if (typeof fetch === 'undefined' && this.fetchFn) {
      return this.fetchFn(url);
    }

    try {
      return await fetch(url);
    } catch {
      return undefined;
    }
  }

  private async fetchOrThrow(url: string): Promise<Response> {
    const response = await this.fetch(url);

    if (!response?.ok) {
      throw new Error(`Failed to load pack from ${url}: ${response?.status} ${response?.statusText}`);
    }

    return response!;
  }

  private validatePack(pack: unknown, source: string): LevelPack {
    if (!pack || typeof pack !== 'object') {
      throw new Error(`Invalid pack format from ${source}: expected object`);
    }

    const p = pack as Record<string, unknown>;

    if (typeof p.schemaVersion !== 'number') {
      throw new Error(`Invalid pack from ${source}: missing schemaVersion`);
    }

    if (typeof p.metadata !== 'object' || p.metadata === null) {
      throw new Error(`Invalid pack from ${source}: missing metadata`);
    }

    const metadata = p.metadata as Record<string, unknown>;
    if (typeof metadata.id !== 'string' || typeof metadata.name !== 'string') {
      throw new Error(`Invalid pack from ${source}: missing required metadata fields`);
    }

    if (!Array.isArray(p.levels)) {
      throw new Error(`Invalid pack from ${source}: levels must be an array`);
    }

    return pack as LevelPack;
  }
}

/**
 * Pack source that loads from remote API/CDN endpoints.
 */
export class RemotePackSource extends PackSource {
  readonly id: string;

  /**
   * Create a new remote pack source.
   * @param baseUrl - Base URL for the remote pack endpoint
   * @param fetchFn - Optional fetch function (defaults to global fetch)
   */
 constructor(
    private readonly baseUrl: string,
    private readonly fetchFn?: (url: string) => Promise<Response>,
  ) {
    super();
    this.id = `remote:${baseUrl}`;
  }

  async loadPack(packId: string): Promise<LevelPack> {
    const url = `${this.baseUrl}/${packId}.json`;
    const response = await this.fetchOrThrow(url);

    // Check content type for versioning info
    const contentType = response.headers.get('content-type') ?? '';
    const etag = response.headers.get('etag') ?? undefined;
    const lastModified = response.headers.get('last-modified') ?? undefined;

    const pack = await response.json() as LevelPack;

    // Attach cache metadata if available
    if (etag) {
      (pack as Record<string, unknown>)._etag = etag;
    }
    if (lastModified) {
      (pack as Record<string, unknown>)._lastModified = lastModified;
    }

    return this.validatePack(pack, url);
  }

  async exists(packId: string): Promise<boolean> {
    const url = `${this.baseUrl}/${packId}.json`;
    try {
      const response = await this.fetch(url);
      return response?.ok ?? false;
    } catch {
      return false;
    }
  }

  async listPacks(): Promise<string[]> {
    const manifestUrl = `${this.baseUrl}/_manifest.json`;

    try {
      const response = await this.fetch(manifestUrl);
      if (!response?.ok) {
        return [];
      }

      const manifest = await response.json() as { packs: string[]; lastUpdated?: string };
      return manifest.packs ?? [];
    } catch {
      return [];
    }
  }

  async getMetadata(packId: string): Promise<LevelPack['metadata'] | undefined> {
    // Try to fetch just the pack header for metadata
    const url = `${this.baseUrl}/${packId}/meta.json`;

    try {
      const response = await this.fetch(url);
      if (!response?.ok) {
        // Fall back to full pack load
        const pack = await this.loadPack(packId);
        return pack.metadata;
      }

      return await response.json() as LevelPack['metadata'];
    } catch {
      return undefined;
    }
  }

  private async fetch(url: string): Promise<Response | undefined> {
    if (typeof fetch === 'undefined' && this.fetchFn) {
      return this.fetchFn(url);
    }

    try {
      return await fetch(url, {
        headers: {
          // Request JSON
          'Accept': 'application/json',
        },
      });
    } catch {
      return undefined;
    }
  }

  private async fetchOrThrow(url: string): Promise<Response> {
    const response = await this.fetch(url);

    if (!response?.ok) {
      throw new Error(`Failed to load pack from ${url}: ${response?.status} ${response?.statusText}`);
    }

    return response!;
  }

  private validatePack(pack: unknown, source: string): LevelPack {
    if (!pack || typeof pack !== 'object') {
      throw new Error(`Invalid pack format from ${source}: expected object`);
    }

    const p = pack as Record<string, unknown>;

    if (typeof p.schemaVersion !== 'number') {
      throw new Error(`Invalid pack from ${source}: missing schemaVersion`);
    }

    if (typeof p.metadata !== 'object' || p.metadata === null) {
      throw new Error(`Invalid pack from ${source}: missing metadata`);
    }

    const metadata = p.metadata as Record<string, unknown>;
    if (typeof metadata.id !== 'string' || typeof metadata.name !== 'string') {
      throw new Error(`Invalid pack from ${source}: missing required metadata fields`);
    }

    if (!Array.isArray(p.levels)) {
      throw new Error(`Invalid pack from ${source}: levels must be an array`);
    }

    return pack as LevelPack;
  }
}

/**
 * Combined pack source that checks multiple sources in order.
 * First source that has the pack wins.
 */
export class CompositePackSource extends PackSource {
  readonly id: string;

  constructor(private readonly sources: PackSource[]) {
    super();
    this.id = `composite:[${sources.map(s => s.id).join(',')}]`;
  }

  async loadPack(packId: string): Promise<LevelPack> {
    const errors: Error[] = [];

    for (const source of this.sources) {
      try {
        if (await source.exists(packId)) {
          return await source.loadPack(packId);
        }
      } catch (error) {
        errors.push(new Error(`${source.id}: ${(error as Error).message}`));
      }
    }

    if (errors.length > 0) {
      const messages = errors.map(e => e.message).join('; ');
      throw new Error(`Pack "${packId}" not found in any source. Errors: ${messages}`);
    }

    throw new Error(`Pack "${packId}" not found in any source`);
  }

  async exists(packId: string): Promise<boolean> {
    for (const source of this.sources) {
      if (await source.exists(packId)) {
        return true;
      }
    }
    return false;
  }

  async listPacks(): Promise<string[]> {
    const allPacks = new Set<string>();

    for (const source of this.sources) {
      const packs = await source.listPacks();
      for (const pack of packs) {
        allPacks.add(pack);
      }
    }

    return Array.from(allPacks).sort();
  }

  async getMetadata(packId: string): Promise<LevelPack['metadata'] | undefined> {
    for (const source of this.sources) {
      if (await source.exists(packId)) {
        return await source.getMetadata(packId);
      }
    }
    return undefined;
  }
}
