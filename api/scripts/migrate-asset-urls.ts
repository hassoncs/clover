/**
 * Migration Script: Asset URL Architecture Refactor
 * 
 * Migrates assets from old URL format to new ID-based paths:
 * - Old: /assets/generated/{entityType}/{uuid}.png
 * - New: generated/{gameId}/{packId}/{assetId}.png
 * 
 * Usage:
 *   pnpm tsx api/scripts/migrate-asset-urls.ts --dry-run
 *   pnpm tsx api/scripts/migrate-asset-urls.ts
 * 
 * Rollback: Old R2 files are preserved. Restore DB from backup.
 */

import { buildAssetPath } from '@slopcade/shared';

interface GameAssetRow {
  id: string;
  owner_game_id: string | null;
  image_url: string;
}

interface GameRow {
  id: string;
  definition: string;
}

interface MigrationStats {
  assetsProcessed: number;
  assetsUpdated: number;
  assetsCopied: number;
  gamesProcessed: number;
  gamesUpdatedWithId: number;
  errors: string[];
  skipped: string[];
}

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

function log(message: string, level: 'info' | 'warn' | 'error' | 'debug' = 'info') {
  if (level === 'debug' && !VERBOSE) return;
  const prefix = DRY_RUN ? '[DRY-RUN] ' : '';
  const levelTag = `[${level.toUpperCase()}]`;
  console.log(`${prefix}${levelTag} ${message}`);
}

function extractAssetIdFromOldUrl(imageUrl: string): string | null {
  const patterns = [
    /\/assets\/generated\/[^/]+\/([a-f0-9-]{36})\.(?:png|webp)$/i,
    /generated\/[^/]+\/([a-f0-9-]{36})\.(?:png|webp)$/i,
  ];
  
  for (const pattern of patterns) {
    const match = imageUrl.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

function extractOldR2Key(imageUrl: string): string | null {
  if (imageUrl.startsWith('/assets/')) {
    return imageUrl.slice(8);
  }
  
  if (imageUrl.startsWith('generated/')) {
    return imageUrl;
  }
  
  const match = imageUrl.match(/\/assets\/(generated\/[^?#]+)/);
  return match ? match[1] : null;
}

function isNewFormat(imageUrl: string): boolean {
  const pattern = /^generated\/[a-f0-9-]{36}\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.png$/i;
  return pattern.test(imageUrl);
}

async function migrateAssetUrls(
  db: D1Database,
  r2: R2Bucket
): Promise<MigrationStats> {
  const stats: MigrationStats = {
    assetsProcessed: 0,
    assetsUpdated: 0,
    assetsCopied: 0,
    gamesProcessed: 0,
    gamesUpdatedWithId: 0,
    errors: [],
    skipped: [],
  };

  log('Starting asset URL migration...');
  log('Fetching assets with pack associations...');
  
  const assetsResult = await db.prepare(`
    SELECT 
      ga.id,
      ga.owner_game_id,
      ga.image_url,
      ape.pack_id
    FROM game_assets ga
    LEFT JOIN asset_pack_entries ape ON ga.id = ape.asset_id
    WHERE ga.deleted_at IS NULL
  `).all<GameAssetRow & { pack_id: string | null }>();

  log(`Found ${assetsResult.results.length} assets to process`);

  for (const asset of assetsResult.results) {
    stats.assetsProcessed++;
    
    const imageUrl = asset.image_url;
    
    if (isNewFormat(imageUrl)) {
      stats.skipped.push(`${asset.id}: Already in new format`);
      log(`Skipping ${asset.id}: already migrated`, 'debug');
      continue;
    }
    
    if (imageUrl.startsWith('data:') || imageUrl.startsWith('res://')) {
      stats.skipped.push(`${asset.id}: Non-R2 URL (${imageUrl.substring(0, 20)}...)`);
      log(`Skipping ${asset.id}: non-R2 URL`, 'debug');
      continue;
    }
    
    const gameId = asset.owner_game_id;
    const packId = asset.pack_id;
    
    if (!gameId || !packId) {
      stats.skipped.push(`${asset.id}: Missing gameId (${gameId}) or packId (${packId})`);
      log(`Skipping ${asset.id}: missing context`, 'debug');
      continue;
    }
    
    const assetUuid = extractAssetIdFromOldUrl(imageUrl);
    if (!assetUuid) {
      stats.errors.push(`${asset.id}: Could not extract asset ID from URL: ${imageUrl}`);
      log(`Error: Could not parse URL for asset ${asset.id}: ${imageUrl}`, 'error');
      continue;
    }
    
    const newR2Key = buildAssetPath(gameId, packId, assetUuid);
    const oldR2Key = extractOldR2Key(imageUrl);
    
    log(`Asset ${asset.id}:`, 'debug');
    log(`  Old URL: ${imageUrl}`, 'debug');
    log(`  Old R2 Key: ${oldR2Key}`, 'debug');
    log(`  New R2 Key: ${newR2Key}`, 'debug');
    
    if (!DRY_RUN) {
      if (oldR2Key) {
        try {
          const existingObject = await r2.get(oldR2Key);
          if (existingObject) {
            const body = await existingObject.arrayBuffer();
            await r2.put(newR2Key, body, {
              httpMetadata: existingObject.httpMetadata,
            });
            stats.assetsCopied++;
            log(`Copied R2 object: ${oldR2Key} -> ${newR2Key}`, 'debug');
          } else {
            log(`Warning: R2 object not found: ${oldR2Key}`, 'warn');
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          stats.errors.push(`${asset.id}: Failed to copy R2 object: ${errorMsg}`);
          log(`Error copying R2 object for ${asset.id}: ${errorMsg}`, 'error');
          continue;
        }
      }
      
      await db.prepare(
        `UPDATE game_assets SET image_url = ? WHERE id = ?`
      ).bind(newR2Key, asset.id).run();
    }
    
    stats.assetsUpdated++;
    log(`Updated asset ${asset.id}: ${imageUrl} -> ${newR2Key}`);
  }

  log('Checking game definitions for id field...');
  
  const gamesResult = await db.prepare(
    `SELECT id, definition FROM games WHERE deleted_at IS NULL`
  ).all<GameRow>();

  for (const game of gamesResult.results) {
    stats.gamesProcessed++;
    
    try {
      const definition = JSON.parse(game.definition);
      
      if (definition.metadata?.id) {
        log(`Game ${game.id}: Already has metadata.id`, 'debug');
        continue;
      }
      
      definition.metadata = definition.metadata || {};
      definition.metadata.id = game.id;
      
      if (!DRY_RUN) {
        await db.prepare(
          `UPDATE games SET definition = ? WHERE id = ?`
        ).bind(JSON.stringify(definition), game.id).run();
      }
      
      stats.gamesUpdatedWithId++;
      log(`Game ${game.id}: Added metadata.id`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      stats.errors.push(`Game ${game.id}: ${errorMsg}`);
      log(`Error processing game ${game.id}: ${errorMsg}`, 'error');
    }
  }

  return stats;
}

function printSummary(stats: MigrationStats) {
  console.log('\n========== Migration Summary ==========');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes made)' : 'LIVE'}`);
  console.log('');
  console.log('Assets:');
  console.log(`  Processed: ${stats.assetsProcessed}`);
  console.log(`  Updated:   ${stats.assetsUpdated}`);
  console.log(`  Copied:    ${stats.assetsCopied}`);
  console.log(`  Skipped:   ${stats.skipped.length}`);
  console.log('');
  console.log('Games:');
  console.log(`  Processed:      ${stats.gamesProcessed}`);
  console.log(`  Added ID:       ${stats.gamesUpdatedWithId}`);
  console.log('');
  
  if (stats.errors.length > 0) {
    console.log('Errors:');
    for (const error of stats.errors) {
      console.log(`  - ${error}`);
    }
    console.log('');
  }
  
  if (VERBOSE && stats.skipped.length > 0) {
    console.log('Skipped (verbose):');
    for (const skip of stats.skipped.slice(0, 20)) {
      console.log(`  - ${skip}`);
    }
    if (stats.skipped.length > 20) {
      console.log(`  ... and ${stats.skipped.length - 20} more`);
    }
  }
  
  console.log('========================================\n');
  
  if (DRY_RUN) {
    console.log('This was a dry run. Run without --dry-run to apply changes.');
  }
}

export { migrateAssetUrls, printSummary, type MigrationStats };

type D1Database = import('@cloudflare/workers-types').D1Database;
type R2Bucket = import('@cloudflare/workers-types').R2Bucket;

if (typeof process !== 'undefined' && process.argv[1]?.includes('migrate-asset-urls')) {
  console.log('');
  console.log('Asset URL Migration Script');
  console.log('--------------------------');
  console.log('');
  console.log('This script requires D1 and R2 bindings from Cloudflare Workers.');
  console.log('');
  console.log('To run this migration:');
  console.log('');
  console.log('1. Use wrangler to run against your database:');
  console.log('   wrangler d1 execute slopcade-db --command "SELECT 1"');
  console.log('');
  console.log('2. Or create a worker endpoint that calls migrateAssetUrls(db, r2)');
  console.log('');
  console.log('Options:');
  console.log('  --dry-run    Preview changes without applying them');
  console.log('  --verbose    Show detailed logging including skipped items');
  console.log('');
  
  if (DRY_RUN) {
    console.log('Mode: DRY RUN enabled');
  }
  if (VERBOSE) {
    console.log('Mode: VERBOSE enabled');
  }
}
