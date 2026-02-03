#!/usr/bin/env node
/**
 * Build test game bundles from TypeScript source files
 * Converts game.ts → .bundle/ JSON files
 * 
 * Usage:
 *   pnpm build:games              # Build all games once
 *   pnpm build:games:watch        # Watch and auto-rebuild
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAMES_DIR = path.resolve(__dirname, '../lib/test-games/games');

/**
 * Build a single game's bundle from its TypeScript source
 */
function buildGameBundle(gameDir) {
  const gameName = path.basename(gameDir);
  const gameTsPath = path.join(gameDir, 'game.ts');
  const bundleDir = path.join(gameDir, '.bundle');
  
  if (!fs.existsSync(gameTsPath)) {
    console.log(`[skip] ${gameName}: No game.ts found`);
    return false;
  }
  
  console.log(`[build] ${gameName}...`);
  
  try {
    // Use tsx to execute the TypeScript and capture the exported game definition
    const script = `import game from '${gameTsPath.replace(/\\/g, '\\\\')}'; console.log(JSON.stringify(game, null, 2));`;
    
    const output = execSync('npx tsx --eval ' + JSON.stringify(script), {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf-8',
      timeout: 30000,
    });
    
    const gameDefinition = JSON.parse(output);
    
    // Ensure bundle directory exists
    if (!fs.existsSync(bundleDir)) {
      fs.mkdirSync(bundleDir, { recursive: true });
    }
    
    // Create subdirectories
    const templatesDir = path.join(bundleDir, 'templates');
    const entitiesDir = path.join(bundleDir, 'entities');
    const rulesDir = path.join(bundleDir, 'rules');
    
    [templatesDir, entitiesDir, rulesDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    
    // Extract constants from the game definition
    const constants = extractConstants(gameDefinition);
    fs.writeFileSync(
      path.join(bundleDir, 'constants.json'),
      JSON.stringify(constants, null, 2)
    );
    
    // Write manifest.json
    const manifest = {
      name: gameDefinition.metadata?.id || gameName,
      version: gameDefinition.metadata?.version || '1.0.0',
      title: gameDefinition.metadata?.title || gameName,
      description: gameDefinition.metadata?.description || '',
      instructions: gameDefinition.metadata?.instructions || '',
      titleHeroImageUrl: gameDefinition.metadata?.titleHeroImageUrl,
      world: gameDefinition.world,
      background: gameDefinition.background,
      camera: gameDefinition.camera,
      ui: gameDefinition.ui,
      loseCondition: gameDefinition.loseCondition,
    };
    fs.writeFileSync(
      path.join(bundleDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );
    
    // Write templates
    const templates = gameDefinition.templates || {};
    const templatesList = Object.entries(templates).map(([id, template]) => ({
      id,
      ...template,
    }));
    
    // Group templates by type for better organization
    const pipeTemplates = templatesList.filter(t => 
      t.id.includes('pipe') || t.id.includes('Pipe')
    );
    const otherTemplates = templatesList.filter(t => 
      !t.id.includes('pipe') && !t.id.includes('Pipe')
    );
    
    if (pipeTemplates.length > 0) {
      fs.writeFileSync(
        path.join(templatesDir, 'pipes.json'),
        JSON.stringify(pipeTemplates, null, 2)
      );
    }
    
    if (otherTemplates.length > 0) {
      fs.writeFileSync(
        path.join(templatesDir, 'templates.json'),
        JSON.stringify(otherTemplates, null, 2)
      );
    }
    
    // Write entities
    fs.writeFileSync(
      path.join(entitiesDir, 'initial.json'),
      JSON.stringify(gameDefinition.entities || [], null, 2)
    );
    
    // Write rules
    fs.writeFileSync(
      path.join(rulesDir, 'gameplay.json'),
      JSON.stringify(gameDefinition.rules || [], null, 2)
    );
    
    // Write empty assets.json
    fs.writeFileSync(
      path.join(bundleDir, 'assets.json'),
      JSON.stringify({}, null, 2)
    );

    // Compile script.ts if it exists
    const scriptTsPath = path.join(gameDir, 'script.ts');
    if (fs.existsSync(scriptTsPath)) {
      console.log(`[script] ${gameName}: Compiling script.ts...`);
      const scriptsDir = path.join(bundleDir, 'scripts');
      if (!fs.existsSync(scriptsDir)) {
        fs.mkdirSync(scriptsDir, { recursive: true });
      }

      try {
        execSync(`npx tsc \
          --outDir ${scriptsDir} \
          --module commonjs \
          --target es2020 \
          --moduleResolution node \
          --esModuleInterop \
          --skipLibCheck \
          --declaration false \
          --sourceMap false \
          ${scriptTsPath}`, {
          cwd: path.resolve(__dirname, '..'),
          stdio: 'inherit'
        });
        
        // Rename script.js to game.js if needed (tsc might output script.js)
        const compiledJsPath = path.join(scriptsDir, 'script.js');
        const targetJsPath = path.join(scriptsDir, 'game.js');
        if (fs.existsSync(compiledJsPath)) {
          fs.renameSync(compiledJsPath, targetJsPath);
        }
        
        console.log(`[script] ${gameName}: Compiled to scripts/game.js`);
      } catch (err) {
        console.error(`[script] ${gameName}: Compilation failed: ${err.message}`);
        // Don't fail the whole build, just this game's script
      }
    }
    
    console.log(`[done] ${gameName} bundle updated`);
    return true;
  } catch (error) {
    console.error(`[error] ${gameName}: ${error.message}`);
    return false;
  }
}

/**
 * Extract constants from game definition (values that are used with { const: "NAME" })
 */
function extractConstants(gameDefinition) {
  const constants = {};
  
  // Scan through all properties to find numeric constants
  // This is a heuristic - in practice, you'd want to track which values
  // are actually referenced with { const: "..." }
  
  if (gameDefinition.world?.bounds?.width) {
    constants.WORLD_WIDTH = gameDefinition.world.bounds.width;
  }
  if (gameDefinition.world?.bounds?.height) {
    constants.WORLD_HEIGHT = gameDefinition.world.bounds.height;
  }
  if (gameDefinition.world?.gravity?.y) {
    constants.GRAVITY_Y = gameDefinition.world.gravity.y;
  }
  if (gameDefinition.world?.pixelsPerMeter) {
    constants.PIXELS_PER_METER = gameDefinition.world.pixelsPerMeter;
  }
  
  // Add asset base URL
  constants.ASSET_BASE = `https://slopcade-api.hassoncs.workers.dev/assets/generated/${gameDefinition.metadata?.id || 'game'}`;
  
  return constants;
}

/**
 * Watch for changes and rebuild
 */
function watchGames() {
  console.log('[watch] Watching for changes in test-games...\n');
  
  const gameDirs = fs.readdirSync(GAMES_DIR)
    .map(name => path.join(GAMES_DIR, name))
    .filter(dir => fs.statSync(dir).isDirectory());
  
  // Initial build
  gameDirs.forEach(buildGameBundle);
  
  // Watch for changes
  gameDirs.forEach(gameDir => {
    const gameTsPath = path.join(gameDir, 'game.ts');
    const scriptTsPath = path.join(gameDir, 'script.ts');
    
    const watchFile = (filePath, label) => {
      if (fs.existsSync(filePath)) {
        fs.watchFile(filePath, { interval: 1000 }, (curr, prev) => {
          if (curr.mtime !== prev.mtime) {
            console.log(`\n[change] ${path.basename(gameDir)}/${label}`);
            buildGameBundle(gameDir);
          }
        });
      }
    };

    watchFile(gameTsPath, 'game.ts');
    watchFile(scriptTsPath, 'script.ts');
  });
  
  console.log('\n[watch] Watching... (Ctrl+C to stop)');
}

// Main
const args = process.argv.slice(2);
const isWatch = args.includes('--watch') || args.includes('-w');

if (isWatch) {
  watchGames();
} else {
  // One-time build
  const gameDirs = fs.readdirSync(GAMES_DIR)
    .map(name => path.join(GAMES_DIR, name))
    .filter(dir => fs.statSync(dir).isDirectory());
  
  let successCount = 0;
  gameDirs.forEach(dir => {
    if (buildGameBundle(dir)) successCount++;
  });
  
  console.log(`\n[done] Built ${successCount} game bundles`);
}
