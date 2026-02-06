#!/usr/bin/env tsx
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { parseArgs } from 'util';

const __dirname = dirname(fileURLToPath(import.meta.url));
const R2_DIR = resolve(__dirname, '..', '..', 'r2');
const API_ROOT = resolve(__dirname, '..');
const DEBUG_DIR = resolve(__dirname, '..', 'debug-output');

interface PackManifest {
  version: number;
  packId: string;
  name: string;
  assets: Record<string, { file: string }>;
}

async function main() {
  const { values } = parseArgs({
    options: {
      game: { type: 'string' },
      pack: { type: 'string', default: 'default' },
      theme: { type: 'string', default: '' },
      style: { type: 'string', default: '' },
      templates: { type: 'string' },
      debug: { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
    },
    strict: true,
  });

  if (!values.game) {
    console.error('Usage: hush run -- pnpm generate:assets --game=<gameId> [--pack=<packName>] [--theme="..."] [--style="3d|pixel|cartoon|..."] [--templates=a,b] [--debug] [--dry-run]');
    process.exit(1);
  }

  const gameId = values.game;
  const packName = values.pack ?? 'default';
  const theme = values.theme ?? '';
  const style = values.style ?? '';
  const dryRun = values['dry-run'] ?? false;
  const debug = values.debug ?? false;

  const defPath = join(R2_DIR, 'games', gameId, 'definition.json');
  if (!existsSync(defPath)) {
    console.error(`No definition.json found at ${defPath}. Run build first.`);
    process.exit(1);
  }

  const definition = JSON.parse(readFileSync(defPath, 'utf-8'));
  const templates = definition.templates as Record<string, {
    visual?: { type: string };
    physics?: { shape: string; width?: number; height?: number; radius?: number };
    collider?: { shape: string; width?: number; height?: number; radius?: number };
    tags?: string[];
    whatDescription?: string;
  }> | undefined;

  if (!templates) {
    console.error(`Game ${gameId} has no templates.`);
    process.exit(1);
  }

  const requestedIds = values.templates?.split(',').map(s => s.trim()) ?? Object.keys(templates);
  const imageTemplates = requestedIds.filter(id => {
    const t = templates[id];
    return t && t.visual?.type === 'image';
  });

  if (imageTemplates.length === 0) {
    console.log('No image templates found to generate.');
    process.exit(0);
  }

  console.log(`\nAsset Generation Plan:`);
  console.log(`  Game: ${gameId}`);
  console.log(`  Pack: ${packName}`);
  console.log(`  Theme: ${theme || '(none)'}`);
  console.log(`  Style: ${style || '(none)'}`);
  console.log(`  Templates: ${imageTemplates.join(', ')} (${imageTemplates.length} total)`);

  if (dryRun) {
    console.log('\n(dry run — no assets generated)');
    return;
  }

  // Find existing pack manifest to get packId, or create new one
  let packId = packName;
  const existingManifestPath = join(R2_DIR, 'packs', packName, 'manifest.json');
  if (existsSync(existingManifestPath)) {
    const existing = JSON.parse(readFileSync(existingManifestPath, 'utf-8'));
    packId = existing.packId ?? packName;
  }

  const packDir = join(R2_DIR, 'packs', packId);
  mkdirSync(packDir, { recursive: true });

  type EntityType = 'character' | 'enemy' | 'item' | 'platform' | 'background' | 'ui';
  type EntitySpec = {
    type: 'entity';
    id: string;
    shape: 'box' | 'circle';
    width: number;
    height: number;
    entityType: EntityType;
    description: string;
    color?: string;
  };

  const specs: EntitySpec[] = [];

  for (const templateId of imageTemplates) {
    const t = templates[templateId];
    const shapeSource = t.collider ?? t.physics ?? { shape: 'box', width: 1, height: 1 };
    const tags = t.tags ?? [];

    let entityType: EntityType = 'item';
    if (tags.includes('player') || tags.includes('character')) entityType = 'character';
    else if (tags.includes('enemy')) entityType = 'enemy';
    else if (tags.includes('platform') || tags.includes('wall') || tags.includes('ground')) entityType = 'platform';
    else if (tags.includes('background')) entityType = 'background';
    else if (tags.includes('ui')) entityType = 'ui';

    specs.push({
      type: 'entity',
      id: templateId,
      shape: (shapeSource.shape === 'circle' ? 'circle' : 'box') as 'box' | 'circle',
      width: shapeSource.width ?? 1,
      height: shapeSource.height ?? 1,
      entityType,
      description: t.whatDescription ?? templateId,
    });
  }

  console.log(`\nInitializing pipeline adapters...`);

  const { createNodeAdapters, createFileDebugSink } = await import(
    '../src/ai/pipeline/adapters/node'
  );
  const { executeAsset } = await import(
    '../src/ai/pipeline/executor'
  );

  const r2Prefix = `packs/${packId}`;
  const r2PackId = r2Prefix;

  const adapters = await createNodeAdapters({
    r2Bucket: 'slopcade-assets',
    wranglerCwd: API_ROOT,
    publicUrlBase: '',
  });

  const localR2Adapter = {
    ...adapters.r2,
    async put(key: string, body: Uint8Array): Promise<void> {
      const filePath = join(R2_DIR, key);
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, body);
      console.log(`  Wrote: ${filePath}`);
    },
    getPublicUrl(key: string): string {
      return join(R2_DIR, key);
    },
  };

  const localAdapters = {
    ...adapters,
    r2: localR2Adapter,
  };

  const debugSink = debug
    ? createFileDebugSink(join(DEBUG_DIR, gameId))
    : () => {};

  console.log(`\nGenerating ${specs.length} assets...\n`);

  const manifest: PackManifest = existsSync(join(packDir, 'manifest.json'))
    ? JSON.parse(readFileSync(join(packDir, 'manifest.json'), 'utf-8'))
    : { version: 1, packId: packName, name: packName, assets: {} };

  let successCount = 0;
  let failCount = 0;

  for (const spec of specs) {
    try {
      console.log(`[${spec.id}] Generating...`);

      const result = await executeAsset(
        spec,
        localAdapters,
        {
          gameId,
          packId: r2PackId,
          assetId: spec.id,
          gameTitle: definition.metadata?.title ?? gameId,
          theme,
          style: style || undefined,
          r2Prefix,
        },
        debugSink,
      );

      if (result.success && result.r2Keys.length > 0) {
        const filename = `${spec.id}.png`;
        manifest.assets[spec.id] = { file: filename };
        successCount++;
        console.log(`[${spec.id}] Done`);
      } else {
        failCount++;
        const errMsg = result.error ? `: ${result.error}` : '';
        console.error(`[${spec.id}] Pipeline returned no output${errMsg}`);
      }
    } catch (error) {
      failCount++;
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[${spec.id}] Failed: ${msg}`);
    }
  }

  writeFileSync(join(packDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\nResults: ${successCount} succeeded, ${failCount} failed`);
  console.log(`Manifest: ${join(packDir, 'manifest.json')}`);
}

main().catch(err => {
  console.error('Asset generation failed:', err);
  process.exit(1);
});
