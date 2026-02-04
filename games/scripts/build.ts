#!/usr/bin/env tsx
/**
 * Build script - compiles TypeScript games to JSON.
 * Usage: pnpm --filter @slopcade/games build
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { GAME_IDS, loadGame } from '../src/registry';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(__dirname, '..', 'dist');

interface BuildResult {
  id: string;
  success: boolean;
  outputPath?: string;
  error?: string;
}

async function build(): Promise<void> {
  console.log('Building games package...\n');
  
  if (!existsSync(DIST_DIR)) {
    mkdirSync(DIST_DIR, { recursive: true });
  }
  
  const results: BuildResult[] = [];
  
  for (const id of GAME_IDS) {
    try {
      const entry = await loadGame(id);
      
      if (!entry) {
        results.push({ id, success: false, error: 'Failed to load game' });
        continue;
      }
      
      const outputPath = join(DIST_DIR, `${id}.json`);
      
      const json = JSON.stringify({
        id: entry.id,
        title: entry.title,
        description: entry.description,
        definition: entry.definition,
      }, null, 2);
      
      writeFileSync(outputPath, json);
      
      results.push({ id, success: true, outputPath });
      console.log(`✓ ${id} -> dist/${id}.json`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      results.push({ id, success: false, error: errorMsg });
      console.error(`✗ ${id}: ${errorMsg}`);
    }
  }
  
  const manifest = {
    version: 1,
    buildTime: new Date().toISOString(),
    games: results
      .filter(r => r.success)
      .map(r => ({
        id: r.id,
        file: `${r.id}.json`,
      })),
  };
  
  writeFileSync(join(DIST_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  
  const succeeded = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`\nBuild complete:`);
  console.log(`  Succeeded: ${succeeded}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Output: ${DIST_DIR}`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
