import type { D1Database } from '@cloudflare/workers-types';

interface OldAssetConfig {
  imageUrl?: string;
  source?: 'generated' | 'uploaded' | 'none';
  scale?: number;
  offsetX?: number;
  offsetY?: number;
}

interface OldAssetPack {
  id: string;
  name: string;
  description?: string;
  style?: 'pixel' | 'cartoon' | '3d' | 'flat';
  assets: Record<string, OldAssetConfig>;
}

interface OldGameDefinition {
  assetPacks?: Record<string, OldAssetPack>;
  activeAssetPackId?: string;
  assetSystem?: {
    activeAssetPackId?: string;
  };
  [key: string]: unknown;
}

interface GameRow {
  id: string;
  definition: string;
}

interface MigrationResult {
  gamesProcessed: number;
  packsCreated: number;
  assetsCreated: number;
  entriesCreated: number;
  errors: string[];
}

export async function migrateAssetPacks(db: D1Database): Promise<MigrationResult> {
  const result: MigrationResult = {
    gamesProcessed: 0,
    packsCreated: 0,
    assetsCreated: 0,
    entriesCreated: 0,
    errors: [],
  };

  const gamesResult = await db.prepare(
    `SELECT id, definition FROM games WHERE deleted_at IS NULL`
  ).all<GameRow>();

  for (const game of gamesResult.results) {
    try {
      let definition: OldGameDefinition;
      try {
        definition = JSON.parse(game.definition);
      } catch {
        result.errors.push(`Game ${game.id}: Invalid JSON definition`);
        continue;
      }

      if (!definition.assetPacks || Object.keys(definition.assetPacks).length === 0) {
        continue;
      }

      const now = Date.now();

      for (const [packId, oldPack] of Object.entries(definition.assetPacks)) {
        const promptDefaults = oldPack.style ? { styleOverride: `${oldPack.style} art style` } : null;

        await db.prepare(
          `INSERT INTO asset_packs (id, game_id, name, description, prompt_defaults_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO NOTHING`
        ).bind(
          packId,
          game.id,
          oldPack.name,
          oldPack.description ?? null,
          promptDefaults ? JSON.stringify(promptDefaults) : null,
          now
        ).run();

        result.packsCreated++;

        for (const [templateId, assetConfig] of Object.entries(oldPack.assets)) {
          if (!assetConfig.imageUrl || assetConfig.source === 'none') {
            continue;
          }

          const assetId = crypto.randomUUID();

          await db.prepare(
            `INSERT INTO game_assets (id, owner_game_id, source, image_url, created_at)
             VALUES (?, ?, ?, ?, ?)`
          ).bind(
            assetId,
            game.id,
            assetConfig.source ?? 'generated',
            assetConfig.imageUrl,
            now
          ).run();

          result.assetsCreated++;

          const placement = {
            scale: assetConfig.scale ?? 1,
            offsetX: assetConfig.offsetX ?? 0,
            offsetY: assetConfig.offsetY ?? 0,
          };

          const entryId = crypto.randomUUID();

          await db.prepare(
            `INSERT INTO asset_pack_entries (id, pack_id, template_id, asset_id, placement_json)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(pack_id, template_id) DO UPDATE SET
               asset_id = excluded.asset_id,
               placement_json = excluded.placement_json`
          ).bind(
            entryId,
            packId,
            templateId,
            assetId,
            JSON.stringify(placement)
          ).run();

          result.entriesCreated++;
        }
      }

      const newDefinition = { ...definition };
      
      if (!newDefinition.assetSystem) {
        newDefinition.assetSystem = {};
      }
      
      if (definition.activeAssetPackId) {
        newDefinition.assetSystem.activeAssetPackId = definition.activeAssetPackId;
      }

      delete newDefinition.assetPacks;
      delete newDefinition.activeAssetPackId;

      await db.prepare(
        `UPDATE games SET definition = ?, updated_at = ? WHERE id = ?`
      ).bind(JSON.stringify(newDefinition), now, game.id).run();

      result.gamesProcessed++;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      result.errors.push(`Game ${game.id}: ${message}`);
    }
  }

  return result;
}

export async function rollbackMigration(db: D1Database): Promise<{ success: boolean; message: string }> {
  try {
    await db.prepare('DELETE FROM asset_pack_entries').run();
    await db.prepare('DELETE FROM game_assets WHERE source = ?').bind('generated').run();
    await db.prepare('DELETE FROM asset_packs').run();
    await db.prepare('DELETE FROM generation_tasks').run();
    await db.prepare('DELETE FROM generation_jobs').run();

    return { success: true, message: 'Rollback complete. Note: Game definitions were not reverted.' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, message };
  }
}
