/**
 * @file loader/examples/usage.ts
 * @description Comprehensive usage examples for the LevelLoader system.
 *
 * This file demonstrates how to use the LevelLoader to:
 * - Load packs from bundled and remote sources
 * - Apply levels to base game definitions
 * - Handle warnings and validation
 */

import type { GameDefinition } from '../../types/GameDefinition';
import type { LevelPack } from '../../types/LevelPack';
import type { LevelDefinition, SlopeggleLevelOverrides } from '../../types/LevelDefinition';

import {
  LevelLoader,
  BundledPackSource,
  RemotePackSource,
  type LevelLoadWarnings,
  type ApplyLevelResult,
} from '../index';

// ============================================================================
// Example 1: Basic Loading from Bundled Source
// ============================================================================

export async function exampleLoadBundledPack(): Promise<void> {
  const loader = new LevelLoader();

  // Load a pack from bundled assets (default path: 'assets/packs')
  const pack = await loader.loadBundled('slopeggle-demo-v1');

  console.log('Loaded pack:', pack.metadata.name);
  console.log('Levels:', pack.levels.length);
}

// ============================================================================
// Example 2: Loading from Remote Source
// ============================================================================

export async function exampleLoadRemotePack(): Promise<void> {
  const loader = new LevelLoader();

  // Load from a remote URL
  const pack = await loader.loadRemote('https://api.example.com/packs/slopeggle-demo');

  console.log('Remote pack:', pack.metadata.name);
}

// ============================================================================
// Example 3: Using Custom Pack Sources
// ============================================================================

export async function exampleCustomSources(): Promise<void> {
  const loader = new LevelLoader();

  // Register a custom bundled source with custom path
  const customBundledSource = new BundledPackSource('custom/packs');
  loader.registerSource('custom', customBundledSource);

  // Register a remote source
  const remoteSource = new RemotePackSource('https://cdn.example.com/packs');
  loader.registerSource('cdn', remoteSource);

  // Load using custom source
  const pack1 = await loader.loadPack('custom:my-pack');
  const pack2 = await loader.loadPack('cdn:featured-pack');
}

// ============================================================================
// Example 4: Apply Level to Base Game
// ============================================================================

export async function exampleApplyLevel(): Promise<void> {
  const loader = new LevelLoader();

  // Load the pack
  const pack = await loader.loadBundled('slopeggle-demo-v1');

  // Example base game definition (would normally import from slopeggle/game.ts)
  const baseGame: GameDefinition = createBaseSlopeggleGame();

  // Apply the first level
  const result = loader.applyLevel(pack, 0, baseGame);

  console.log('Merged game title:', result.game.metadata.title);
  console.log('Initial lives:', result.game.initialLives);
  console.log('Warnings:', result.warnings);
}

// ============================================================================
// Example 5: Apply Level by ID
// ============================================================================

export async function exampleApplyLevelById(): Promise<void> {
  const loader = new LevelLoader();
  const pack = await loader.loadBundled('slopeggle-demo-v1');
  const baseGame = createBaseSlopeggleGame();

  // Apply a specific level by its ID
  const result = loader.applyLevelById(pack, 'medium-1', baseGame);

  console.log('Selected level:', result.game.metadata.title);
}

// ============================================================================
// Example 6: Apply Level with Validation
// ============================================================================

export async function exampleApplyLevelWithValidation(): Promise<void> {
  const loader = new LevelLoader();
  const pack = await loader.loadBundled('slopeggle-demo-v1');
  const baseGame = createBaseSlopeggleGame();

  // Apply with validation enabled (default behavior)
  const result = loader.applyLevel(pack, 0, baseGame, {
    validate: true,
    onWarning: (warning, category) => {
      console.warn(`[${category}] ${warning}`);
    },
  });

  if (result.warnings.validationWarnings.length > 0) {
    console.log('Validation issues found');
  }
}

// ============================================================================
// Example 7: Handle Schema Version Warnings
// ============================================================================

export async function exampleHandleSchemaWarnings(): Promise<void> {
  const loader = new LevelLoader();
  const pack = await loader.loadBundled('slopeggle-demo-v1');
  const baseGame = createBaseSlopeggleGame();

  const result = loader.applyLevel(pack, 0, baseGame, {
    onWarning: (warning, category) => {
      if (category === 'schemaWarnings') {
        console.log('Schema version issue:', warning);
        // Could trigger migration logic here
      }
    },
  });
}

// ============================================================================
// Example 8: Slopeggle-Specific Overrides
// ============================================================================

export async function exampleSlopeggleOverrides(): Promise<void> {
  const loader = new LevelLoader();
  const pack = await loader.loadBundled('slopeggle-demo-v1');
  const baseGame = createBaseSlopeggleGame();

  // Get the level to see its overrides
  const level = pack.levels[1]; // medium level
  const slopeggleOverrides = level.overrides?.slopeggle as SlopeggleLevelOverrides | undefined;

  if (slopeggleOverrides) {
    console.log('Orange peg count:', slopeggleOverrides.orangePegCount);
    console.log('Has bucket:', slopeggleOverrides.hasBucket);
    console.log('Has portals:', slopeggleOverrides.hasPortals);
  }

  // Apply the level
  const result = loader.applyLevel(pack, 1, baseGame);
  console.log('Merged lives:', result.game.initialLives);
}

// ============================================================================
// Example 9: List All Levels in a Pack
// ============================================================================

export async function exampleListLevels(): Promise<void> {
  const loader = new LevelLoader();
  const pack = await loader.loadBundled('slopeggle-demo-v1');

  const levels = loader.listLevels(pack);

  for (const level of levels) {
    console.log(`- ${level.identity}: ${level.title}`);
  }
}

// ============================================================================
// Example 10: Full Workflow - Select and Play Level
// ============================================================================

export async function exampleFullWorkflow(): Promise<void> {
  const loader = new LevelLoader();
  const baseGame = createBaseSlopeggleGame();

  // Step 1: Load pack
  const pack = await loader.loadBundled('slopeggle-demo-v1');

  // Step 2: List available levels
  const levels = loader.listLevels(pack);
  console.log('Available levels:', levels.map(l => l.title).join(', '));

  // Step 3: User selects a level (e.g., second level)
  const selectedLevelIndex = 1;

  // Step 4: Apply the level
  const result = loader.applyLevel(pack, selectedLevelIndex, baseGame, {
    validate: true,
    onWarning: (warning, category) => {
      console.warn(`Warning [${category}]: ${warning}`);
    },
  });

  // Step 5: Handle any issues
  if (result.warnings.validationWarnings.length > 0) {
    console.error('Game validation failed:', result.warnings.validationWarnings);
    return;
  }

  // Step 6: Use the resulting game definition
  const finalGame = result.game;
  console.log('Ready to play:', finalGame.metadata.title);
  console.log('Starting lives:', finalGame.initialLives);
}

// ============================================================================
// Helper: Create a base Slopeggle game for examples
// ============================================================================

function createBaseSlopeggleGame(): GameDefinition {
  return {
    metadata: {
      id: 'test-slopeggle',
      title: 'Slopeggle',
      description: 'Clear all orange pegs by bouncing a ball through the board',
      version: '1.0.0',
    },
    world: {
      gravity: { x: 0, y: -5 },
      pixelsPerMeter: 50,
      bounds: { width: 12, height: 16 },
    },
    ui: {
      showScore: true,
      showLives: true,
      livesLabel: 'Balls',
    },
    initialLives: 10,
    templates: {
      ball: {
        id: 'ball',
        tags: ['ball'],
        sprite: { type: 'circle', radius: 0.15, color: '#FF6B6B' },
        physics: { bodyType: 'dynamic', shape: 'circle', radius: 0.15, density: 1, friction: 0.05, restitution: 0.75 },
      },
      bluePeg: {
        id: 'bluePeg',
        tags: ['peg', 'blue-peg'],
        sprite: { type: 'circle', radius: 0.125, color: '#4ECDC4' },
        physics: { bodyType: 'static', shape: 'circle', radius: 0.125, density: 0, friction: 0.05, restitution: 0.85 },
      },
      orangePeg: {
        id: 'orangePeg',
        tags: ['peg', 'orange-peg'],
        sprite: { type: 'circle', radius: 0.125, color: '#F97316' },
        physics: { bodyType: 'static', shape: 'circle', radius: 0.125, density: 0, friction: 0.05, restitution: 0.85 },
      },
    },
    entities: [
      { id: 'wall-left', name: 'Left Wall', template: 'wallVertical', transform: { x: -5.9, y: 0, angle: 0, scaleX: 1, scaleY: 1 } },
      { id: 'wall-right', name: 'Right Wall', template: 'wallVertical', transform: { x: 5.9, y: 0, angle: 0, scaleX: 1, scaleY: 1 } },
      { id: 'wall-top', name: 'Top Wall', template: 'wallTop', transform: { x: 0, y: 7.9, angle: 0, scaleX: 1, scaleY: 1 } },
    ],
  };
}

// ============================================================================
// Type Exports for Consumers
// ============================================================================

export type { LevelLoadWarnings, ApplyLevelResult };
