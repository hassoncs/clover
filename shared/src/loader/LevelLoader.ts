/**
 * @file LevelLoader.ts
 * @description Core level loading and merging system.
 *
 * Loads LevelPack JSON files and merges LevelDefinition overlays onto
 * a base GameDefinition to produce a playable game configuration.
 *
 * ## Usage Pattern
 *
 * ```typescript
 * const loader = new LevelLoader();
 *
 * // Load a bundled pack
 * const pack = await loader.loadBundled('slopeggle-basic-v1');
 *
 * // Load from remote
 * const remotePack = await loader.loadRemote('https://api.example.com/packs/my-pack');
 *
 * // Apply a level to a base game
 * const game = loader.applyLevel(pack, 0, baseGameDefinition);
 * ```
 */

import type { GameDefinition } from '../types/GameDefinition';
import type {
  LevelPack,
  LevelDefinition,
  PackGameConfig,
  CURRENT_PACK_SCHEMA_VERSION,
  MIN_COMPATIBLE_PACK_VERSION,
} from '../types/LevelPack';
import type { SlopeggleLevelOverrides } from '../types/LevelDefinition';

import {
  BundledPackSource,
  RemotePackSource,
  CompositePackSource,
  type PackSource,
} from './PackSource';

/**
 * Warnings generated during level loading/merging.
 */
export interface LevelLoadWarnings {
  /** Schema version warnings */
  schemaWarnings: string[];
  /** Merge warnings (e.g., field conflicts) */
  mergeWarnings: string[];
  /** Validation warnings */
  validationWarnings: string[];
}

/**
 * Result of a level application operation.
 */
export interface ApplyLevelResult {
  /** The resulting game definition */
  game: GameDefinition;
  /** Any warnings generated during the operation */
  warnings: LevelLoadWarnings;
}

/**
 * Options for level application.
 */
export interface ApplyLevelOptions {
  /** Whether to validate the resulting game definition */
  validate?: boolean;
  /** Callback for warnings */
  onWarning?: (warning: string, category: keyof LevelLoadWarnings) => void;
}

/**
 * Core level loader and merger.
 *
 * Responsibilities:
 * - Load packs from bundled or remote sources
 * - Parse and validate pack/level structure
 * - Merge level overlays onto base game definitions
 * - Handle schema versioning gracefully
 */
export class LevelLoader {
  private defaultSource: PackSource;
  private customSources: Map<string, PackSource> = new Map();

  /**
   * Create a new level loader.
   * @param bundledPath - Base path for bundled packs (default: 'assets/packs')
   */
  constructor(bundledPath: string = 'assets/packs') {
    this.defaultSource = new BundledPackSource(bundledPath);
  }

  /**
   * Load a pack from bundled assets.
   * @param packId - The pack identifier
   * @returns Promise resolving to the loaded pack
   */
  async loadBundled(packId: string): Promise<LevelPack> {
    return this.defaultSource.loadPack(packId);
  }

  /**
   * Load a pack from a remote URL.
   * @param url - The URL to fetch the pack from
   * @returns Promise resolving to the loaded pack
   */
  async loadRemote(url: string): Promise<LevelPack> {
    const source = new RemotePackSource(url);
    return source.loadPack(packIdFromUrl(url));
  }

  /**
   * Load a pack from a custom source.
   * @param source - The pack source to use
   * @param packId - The pack identifier
   * @returns Promise resolving to the loaded pack
   */
  async loadFromSource(source: PackSource, packId: string): Promise<LevelPack> {
    return source.loadPack(packId);
  }

  /**
   * Register a custom pack source.
   * @param sourceId - Unique identifier for this source
   * @param source - The pack source instance
   */
  registerSource(sourceId: string, source: PackSource): void {
    this.customSources.set(sourceId, source);
  }

  /**
   * Get a registered source by ID.
   * @param sourceId - The source identifier
   * @returns The pack source or undefined
   */
  getSource(sourceId: string): PackSource | undefined {
    return this.customSources.get(sourceId);
  }

  /**
   * Create a composite source from multiple sources.
   * @param sourceIds - Array of source IDs to combine
   * @returns CompositePackSource or undefined if any source not found
   */
  createCompositeSource(sourceIds: string[]): CompositePackSource | undefined {
    const sources: PackSource[] = [];

    for (const id of sourceIds) {
      const source = this.customSources.get(id);
      if (!source) {
        return undefined;
      }
      sources.push(source);
    }

    return new CompositePackSource(sources);
  }

  /**
   * Load a pack using a selector string.
   * Format: `"sourceId:packId"` or just `"packId"` (uses default source).
   *
   * @param selector - The pack selector (e.g., "bundled:slopeggle-basic-v1", "remote:https://api.com/packs/my-pack")
   * @returns Promise resolving to the loaded pack
   */
  async loadPack(selector: string): Promise<LevelPack> {
    // Check for source:packId format
    const colonIndex = selector.indexOf(':');

    if (colonIndex > 0) {
      const sourceId = selector.slice(0, colonIndex);
      const packIdOrUrl = selector.slice(colonIndex + 1);

      // Check if it's a custom registered source
      const customSource = this.customSources.get(sourceId);
      if (customSource) {
        return customSource.loadPack(packIdOrUrl);
      }

      // Check if it's a remote URL
      if (sourceId === 'remote') {
        return this.loadRemote(packIdOrUrl);
      }

      // Unknown source prefix
      throw new Error(`Unknown pack source: "${sourceId}"`);
    }

    // Default: use bundled source
    return this.loadBundled(selector);
  }

  /**
   * Apply a level from a pack to a base game definition.
   *
   * This merges the level's overlays onto the base game, replacing
   * or extending the base configuration as needed.
   *
   * @param pack - The level pack containing the level
   * @param levelIndex - Index of the level to apply (0-based)
   * @param baseGame - The base game definition to overlay onto
   * @param options - Optional configuration
   * @returns Result containing the merged game and any warnings
   */
  applyLevel(
    pack: LevelPack,
    levelIndex: number,
    baseGame: GameDefinition,
    options: ApplyLevelOptions = {},
  ): ApplyLevelResult {
    const warnings: LevelLoadWarnings = {
      schemaWarnings: [],
      mergeWarnings: [],
      validationWarnings: [],
    };

    const warn = (message: string, category: keyof LevelLoadWarnings) => {
      warnings[category].push(message);
      options.onWarning?.(message, category);
    };

    // Validate pack schema version
    this.validatePackSchema(pack, warnings.schemaWarnings);

    // Get the level
    const level = pack.levels[levelIndex];
    if (!level) {
      throw new Error(
        `Level index ${levelIndex} out of range (pack has ${pack.levels.length} levels)`,
      );
    }

    // Create the merged game definition
    const game = this.mergeLevelIntoGame(level, pack.gameConfig, baseGame, warn);

    // Validate if requested
    if (options.validate !== false) {
      this.validateGame(game, warnings.validationWarnings);
    }

    return { game, warnings };
  }

  /**
   * Apply a level by its ID.
   * @param pack - The level pack
   * @param levelId - The level identifier to find
   * @param baseGame - The base game definition
   * @param options - Optional configuration
   * @returns Result containing the merged game and any warnings
   */
  applyLevelById(
    pack: LevelPack,
    levelId: string,
    baseGame: GameDefinition,
    options: ApplyLevelOptions = {},
  ): ApplyLevelResult {
    const levelIndex = pack.levels.findIndex(l => l.levelId === levelId);

    if (levelIndex === -1) {
      throw new Error(`Level "${levelId}" not found in pack "${pack.metadata.id}"`);
    }

    return this.applyLevel(pack, levelIndex, baseGame, options);
  }

  /**
   * Apply a level by its full identity (`packId:levelId`).
   * @param pack - The level pack (must match the identity's packId)
   * @param identity - The full level identity
   * @param baseGame - The base game definition
   * @param options - Optional configuration
   * @returns Result containing the merged game and any warnings
   */
  applyLevelByIdentity(
    pack: LevelPack,
    identity: string,
    baseGame: GameDefinition,
    options: ApplyLevelOptions = {},
  ): ApplyLevelResult {
    const [packId, levelId] = identity.split(':');

    if (packId !== pack.metadata.id) {
      throw new Error(
        `Pack ID mismatch: pack is "${pack.metadata.id}" but identity specifies "${packId}"`,
      );
    }

    return this.applyLevelById(pack, levelId, baseGame, options);
  }

  /**
   * Get a level from a pack by index or ID.
   * @param pack - The level pack
   * @param identifier - Level index (0-based) or level ID
   * @returns The level definition or undefined
   */
  getLevel(pack: LevelPack, identifier: number | string): LevelDefinition | undefined {
    if (typeof identifier === 'number') {
      return pack.levels[identifier];
    }

    return pack.levels.find(l => l.levelId === identifier);
  }

  /**
   * List all levels in a pack.
   * @param pack - The level pack
   * @returns Array of level identities and metadata
   */
  listLevels(pack: LevelPack): Array<{ identity: string; levelId: string; title?: string }> {
    return pack.levels.map(level => ({
      identity: `${pack.metadata.id}:${level.levelId}`,
      levelId: level.levelId,
      title: level.title,
    }));
  }

  private validatePackSchema(pack: LevelPack, warnings: string[]): void {
    // Check major version
    if (pack.schemaVersion !== CURRENT_PACK_SCHEMA_VERSION) {
      if (pack.schemaVersion < MIN_COMPATIBLE_PACK_VERSION) {
        throw new Error(
          `Pack schema version ${pack.schemaVersion} is too old (minimum compatible: ${MIN_COMPATIBLE_PACK_VERSION})`,
        );
      }

      warnings.push(
        `Pack schema version ${pack.schemaVersion} differs from current ${CURRENT_PACK_SCHEMA_VERSION} - some features may not be supported`,
      );
    }
  }

  private mergeLevelIntoGame(
    level: LevelDefinition,
    gameConfig: PackGameConfig | undefined,
    baseGame: GameDefinition,
    warn: (message: string, category: keyof LevelLoadWarnings) => void,
  ): GameDefinition {
    // Start with a deep copy of the base game
    const game = structuredClone(baseGame) as GameDefinition;

    // Apply pack-level game config if present
    if (gameConfig?.baseGameDefinition) {
      this.mergeConfig(game, gameConfig.baseGameDefinition as Partial<GameDefinition>, warn);
    }

    // Merge level difficulty into game config
    if (level.difficulty?.initialLives !== undefined) {
      game.initialLives = level.difficulty.initialLives;
    }

    // Apply Slopeggle-specific overrides
    const slopeggleOverrides = level.overrides?.slopeggle as SlopeggleLevelOverrides | undefined;
    if (slopeggleOverrides) {
      this.applySlopeggleOverrides(game, slopeggleOverrides, warn);
    }

    if (level.title) {
      game.metadata.title = level.title;
    }
    if (level.description) {
      game.metadata.description = level.description;
    }

    (game.metadata as Record<string, unknown>).generatorId = level.generatorId;
    (game.metadata as Record<string, unknown>).generatorVersion = level.generatorVersion;
    (game.metadata as Record<string, unknown>).levelSeed = level.seed;

    return game;
  }

  private applySlopeggleOverrides(
    game: GameDefinition,
    overrides: SlopeggleLevelOverrides,
    warn: (message: string, category: keyof LevelLoadWarnings) => void,
  ): void {
    // Lives
    if (overrides.initialLives !== undefined) {
      game.initialLives = overrides.initialLives;
    }

    // World dimensions
    if (overrides.worldWidth !== undefined || overrides.worldHeight !== undefined) {
      const width = overrides.worldWidth ?? game.world.bounds?.width ?? 12;
      const height = overrides.worldHeight ?? game.world.bounds?.height ?? 16;

      if (!game.world.bounds) {
        game.world.bounds = { width, height };
      } else {
        game.world.bounds.width = width;
        game.world.bounds.height = height;
      }

      warn('World bounds overridden - entities may need repositioning', 'mergeWarnings');
    }

    // Dynamic elements
    if (overrides.hasBucket !== undefined) {
      const bucketEntity = game.entities.find(e => e.id === 'bucket' || e.template === 'bucket');
      if (bucketEntity) {
        // Enable/disable bucket by changing visibility/collision
        (bucketEntity as Record<string, unknown>).disabled = !overrides.hasBucket;
      }
    }

    if (overrides.hasPortals !== undefined) {
      const portalA = game.entities.find(e => e.id === 'portal-a');
      const portalB = game.entities.find(e => e.id === 'portal-b');

      if (portalA) {
        (portalA as Record<string, unknown>).disabled = !overrides.hasPortals;
      }
      if (portalB) {
        (portalB as Record<string, unknown>).disabled = !overrides.hasPortals;
      }
    }
  }

  private mergeConfig(
    target: GameDefinition,
    source: Partial<GameDefinition>,
    warn: (message: string, category: keyof LevelLoadWarnings) => void,
  ): void {
    // Merge templates (add/replace, don't remove)
    if (source.templates) {
      for (const [key, template] of Object.entries(source.templates)) {
        target.templates[key] = template;
      }
    }

    // Merge rules (append new rules)
    if (source.rules) {
      target.rules = [...(target.rules ?? []), ...source.rules];
    }

    // Merge variables
    if (source.variables) {
      target.variables = { ...target.variables, ...source.variables };
    }

    if (source.entities) {
      const replaceIds = new Set(source.entities.map(e => e.id));
      target.entities = target.entities.filter(e => !replaceIds.has(e.id));
      target.entities.push(...source.entities);
    }
  }

  private validateGame(
    game: GameDefinition,
    warnings: string[],
  ): void {
    // Basic validation checks
    if (!game.metadata?.id) {
      warnings.push('Game is missing metadata.id');
    }

    if (!game.world?.gravity) {
      warnings.push('Game is missing world.gravity');
    }

    if (!game.templates || Object.keys(game.templates).length === 0) {
      warnings.push('Game has no entity templates');
    }

    if (!game.entities || game.entities.length === 0) {
      warnings.push('Game has no entities');
    }
  }
}

/**
 * Parse a pack ID from a URL.
 */
function packIdFromUrl(url: string): string {
  const lastSegment = url.split('/').pop() ?? url;
  return lastSegment.replace(/\.json$/, '');
}
