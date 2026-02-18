#!/usr/bin/env node
/**
 * Bundle Builder - Compiles TypeScript game.ts files into .bundle/ JSON directories
 * 
 * Usage:
 *   pnpm bundle:build                    # Build all games
 *   pnpm bundle:build flappyBird         # Build specific game
 *   pnpm bundle:watch                    # Watch mode for all games
 * 
 * This ensures TypeScript is the single source of truth.
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, watch } from 'fs';
import { resolve, dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GAMES_DIR = resolve(__dirname, '../lib/test-games/games');

/**
 * Executes TypeScript file and extracts GameDefinition
 */
async function compileGameTypeScript(gamePath) {
  const tsFile = join(gamePath, 'game.ts');
  
  if (!existsSync(tsFile)) {
    console.error(`❌ No game.ts found at ${tsFile}`);
    return null;
  }

  try {
    // Use tsx to execute the TypeScript and extract the default export
    const script = `
      import game from '${tsFile}';
      console.log(JSON.stringify(game, null, 2));
    `;
    
    const result = execSync(`cd ${gamePath} && npx tsx -e "${script.replace(/"/g, '\\"')}"`, {
      encoding: 'utf-8',
      timeout: 30000,
    });
    
    return JSON.parse(result);
  } catch (err) {
    console.error(`❌ Failed to compile ${tsFile}:`, err.message);
    return null;
  }
}

/**
 * Splits GameDefinition into bundle structure
 */
function splitIntoBundleFiles(gameDef) {
  const files = {
    'manifest.json': {
      name: gameDef.metadata?.id || 'unnamed-game',
      version: gameDef.metadata?.version || '1.0.0',
      title: gameDef.metadata?.title,
      description: gameDef.metadata?.description,
      instructions: gameDef.metadata?.instructions,
      titleHeroImageUrl: gameDef.metadata?.titleHeroImageUrl,
      world: gameDef.world,
      background: gameDef.background,
      camera: gameDef.camera,
      ui: gameDef.ui,
      loseCondition: gameDef.loseCondition,
    },
    'constants.json': extractConstants(gameDef),
    'templates/pipes.json': [], // Will be populated
    'templates/bird.json': [],
    'templates/environment.json': [],
    'entities/initial.json': gameDef.entities || [],
    'rules/gameplay.json': gameDef.rules || [],
    'assets.json': {}, // TODO: Extract from visual components
  };

  // Split templates by category
  const templates = gameDef.templates || {};
  const pipeTemplates = [];
  const birdTemplates = [];
  const envTemplates = [];

  for (const [id, template] of Object.entries(templates)) {
    const t = { id, ...template };
    if (id.includes('pipe') || id.includes('Pipe')) {
      pipeTemplates.push(t);
    } else if (id.includes('bird') || id.includes('Bird')) {
      birdTemplates.push(t);
    } else {
      envTemplates.push(t);
    }
  }

  files['templates/pipes.json'] = pipeTemplates;
  files['templates/bird.json'] = birdTemplates;
  files['templates/environment.json'] = envTemplates;

  return files;
}

/**
 * Extract constants from game definition (values that should be configurable)
 */
function extractConstants(gameDef) {
  const constants = {
    ASSET_BASE: '',
    WORLD_WIDTH: gameDef.world?.bounds?.width || 12,
    WORLD_HEIGHT: gameDef.world?.bounds?.height || 16,
    HALF_W: (gameDef.world?.bounds?.width || 12) / 2,
    HALF_H: (gameDef.world?.bounds?.height || 16) / 2,
    PIPE_SPEED: 15,
    PIPE_GAP: 3.0,
    PIPE_WIDTH: 1.2,
    PIPE_HEIGHT: 6,
    SPAWN_X: 8,
    FLAP_VELOCITY: 7,
    GRAVITY_Y: gameDef.world?.gravity?.y || -15,
    PIXELS_PER_METER: gameDef.world?.pixelsPerMeter || 50,
    PIPE_SPAWN_INTERVAL: 2.5,
  };

  // Extract from game code analysis
  // TODO: Parse game.ts AST to extract const declarations

  return constants;
}

/**
 * Writes bundle files to disk
 */
function writeBundle(bundlePath, files) {
  // Ensure directories exist
  const dirs = ['templates', 'entities', 'rules'];
  for (const dir of dirs) {
    const dirPath = join(bundlePath, dir);
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }
  }

  // Write files
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = join(bundlePath, filePath);
    const dir = dirname(fullPath);
    
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(fullPath, JSON.stringify(content, null, 2));
    console.log(`  ✓ ${filePath}`);
  }
}

/**
 * Builds a single game
 */
async function buildGame(gameName) {
  const gamePath = join(GAMES_DIR, gameName);
  const bundlePath = join(gamePath, '.bundle');
  
  console.log(`\n🏗️  Building ${gameName}...`);

  if (!existsSync(gamePath)) {
    console.error(`❌ Game not found: ${gameName}`);
    return false;
  }

  const gameDef = await compileGameTypeScript(gamePath);
  if (!gameDef) {
    return false;
  }

  const bundleFiles = splitIntoBundleFiles(gameDef);
  
  if (!existsSync(bundlePath)) {
    mkdirSync(bundlePath, { recursive: true });
  }

  writeBundle(bundlePath, bundleFiles);
  console.log(`✅ ${gameName} built successfully`);
  return true;
}

/**
 * Builds all games
 */
async function buildAll() {
  console.log('🔨 Building all test games...\n');
  
  const games = ['flappyBird', 'ballSort', 'breakoutBouncer', 'gemCrush', 'slopeggle'];
  let success = 0;
  let failed = 0;

  for (const game of games) {
    const result = await buildGame(game);
    if (result) success++;
    else failed++;
  }

  console.log(`\n📊 Results: ${success} succeeded, ${failed} failed`);
  return failed === 0;
}

/**
 * Watch mode - rebuilds when game.ts changes
 */
function watchGames() {
  console.log('👀 Watching for changes... (Press Ctrl+C to stop)\n');
  
  const games = ['flappyBird', 'ballSort', 'breakoutBouncer', 'gemCrush', 'slopeggle'];
  
  for (const game of games) {
    const gameTsPath = join(GAMES_DIR, game, 'game.ts');
    
    if (existsSync(gameTsPath)) {
      watch(gameTsPath, async (eventType) => {
        if (eventType === 'change') {
          console.log(`\n📝 ${game}/game.ts changed`);
          await buildGame(game);
        }
      });
      
      console.log(`  👁️  Watching ${game}`);
    }
  }
}

// Main
const args = process.argv.slice(2);
const command = args[0];

if (command === 'watch') {
  watchGames();
} else if (command && !command.startsWith('-')) {
  // Build specific game
  buildGame(command).then(success => {
    process.exit(success ? 0 : 1);
  });
} else {
  // Build all
  buildAll().then(success => {
    process.exit(success ? 0 : 1);
  });
}
