#!/usr/bin/env npx tsx
/**
 * Restructure Local Assets Script
 * 
 * Migrates game assets from friendly-name structure to production R2 structure.
 * 
 * BEFORE:
 *   games/compiled/ballSort/assets/
 *     ball0.png
 *     tube.png
 *     manifest.json
 * 
 * AFTER:
 *   games/compiled/ballSort/generated/ballSort/{packId}/
 *     {assetId}.png
 *     {assetId}.png
 *     manifest.json
 * 
 * Usage:
 *   npx tsx api/scripts/restructure-local-assets.ts
 */

import { readFile, rename, mkdir, rm, access } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GAMES_ROOT = join(__dirname, '../../games/compiled');

interface ManifestEntry {
  file: string;
  r2Key: string;
}

type Manifest = Record<string, ManifestEntry>;

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function restructureGame(gameName: string): Promise<void> {
  const gameDir = join(GAMES_ROOT, gameName);
  const assetsDir = join(gameDir, 'assets');
  const manifestPath = join(assetsDir, 'manifest.json');

  // Check if assets directory exists
  if (!(await fileExists(assetsDir))) {
    console.log(`⏭️  Skipping ${gameName} - no assets directory`);
    return;
  }

  // Check if manifest exists
  if (!(await fileExists(manifestPath))) {
    console.log(`⏭️  Skipping ${gameName} - no manifest.json`);
    return;
  }

  console.log(`\n📦 Processing ${gameName}...`);

  // Read manifest
  const manifestContent = await readFile(manifestPath, 'utf-8');
  const manifest: Manifest = JSON.parse(manifestContent);

  const entries = Object.entries(manifest);
  if (entries.length === 0) {
    console.log(`   ⚠️  Empty manifest, skipping`);
    return;
  }

  console.log(`   Found ${entries.length} assets`);

  // Restructure each asset
  for (const [templateId, { file, r2Key }] of entries) {
    const oldPath = join(gameDir, file); // assets/ball0.png
    const newPath = join(gameDir, r2Key); // generated/ballSort/{packId}/{assetId}.png

    // Check if source file exists
    if (!(await fileExists(oldPath))) {
      console.log(`   ⚠️  ${templateId}: source not found - ${file}`);
      continue;
    }

    // Create target directory
    await mkdir(dirname(newPath), { recursive: true });

    // Move file
    await rename(oldPath, newPath);
    console.log(`   ✅ ${templateId}: ${file} → ${r2Key}`);
  }

  // Move manifest into generated directory (first entry's directory parent)
  const firstEntry = entries[0][1];
  const firstR2Key = firstEntry.r2Key;
  const generatedDir = dirname(join(gameDir, firstR2Key));
  const newManifestPath = join(generatedDir, 'manifest.json');

  await rename(manifestPath, newManifestPath);
  console.log(`   📄 Moved manifest.json → ${newManifestPath.replace(gameDir + '/', '')}`);

  // Remove empty assets directory
  try {
    await rm(assetsDir, { recursive: true });
    console.log(`   🗑️  Removed empty assets directory`);
  } catch (err: any) {
    console.log(`   ⚠️  Could not remove assets directory: ${err.message}`);
  }

  console.log(`   ✅ ${gameName} restructured successfully`);
}

async function main() {
  console.log('═'.repeat(60));
  console.log('  Restructure Local Assets');
  console.log('  Migrate from friendly names to production R2 structure');
  console.log('═'.repeat(60));

  // Find all games with assets directories
  const { readdir } = await import('fs/promises');
  const games = await readdir(GAMES_ROOT, { withFileTypes: true });

  const gameDirs = games
    .filter(d => d.isDirectory())
    .map(d => d.name);

  console.log(`\nScanning ${gameDirs.length} games...`);

  let processedCount = 0;
  let skippedCount = 0;

  for (const gameName of gameDirs) {
    try {
      const gameDir = join(GAMES_ROOT, gameName);
      const assetsDir = join(gameDir, 'assets');

      if (await fileExists(assetsDir)) {
        await restructureGame(gameName);
        processedCount++;
      } else {
        skippedCount++;
      }
    } catch (err: any) {
      console.error(`\n❌ Error processing ${gameName}:`);
      console.error(`   ${err.message}`);
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`  Complete!`);
  console.log('═'.repeat(60));
  console.log(`Processed: ${processedCount} game(s)`);
  console.log(`Skipped:   ${skippedCount} game(s)`);
  console.log('═'.repeat(60));

  if (processedCount > 0) {
    console.log('\n✅ Assets restructured to production-compatible layout');
    console.log('   Local paths now match R2 structure exactly');
  }
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err.message || err);
  process.exit(1);
});
