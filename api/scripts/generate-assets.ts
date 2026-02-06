#!/usr/bin/env tsx
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { parseArgs } from 'util';
import { randomUUID } from 'crypto';
import { execSync } from 'child_process';

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
    visual?: { type: string; imageWidth?: number; imageHeight?: number };
    physics?: { shape: string; width?: number; height?: number; radius?: number };
    collider?: { shape: string; width?: number; height?: number; radius?: number };
    tags?: string[];
    whatDescription?: string;
  }> | undefined;

  if (!templates) {
    console.error(`Game ${gameId} has no templates.`);
    process.exit(1);
  }

  const COLOR_NAME_TO_HEX: Record<string, string> = {
    red: '#FF4444',
    blue: '#4444FF',
    green: '#44FF44',
    yellow: '#FFFF44',
    purple: '#AA44FF',
    orange: '#FF8844',
    pink: '#FF44AA',
    cyan: '#44FFFF',
    white: '#FFFFFF',
    black: '#222222',
    gold: '#FFD700',
    silver: '#C0C0C0',
    transparent: '#AADDFF',
    glass: '#AADDFF',
  };

  function extractColorFromDescription(description: string): string | undefined {
    const lower = description.toLowerCase();
    for (const [name, hex] of Object.entries(COLOR_NAME_TO_HEX)) {
      if (lower.includes(name)) return hex;
    }
    return undefined;
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

  const packId = randomUUID();
  const packDir = join(R2_DIR, 'packs', packId);
  mkdirSync(packDir, { recursive: true });

  console.log(`  Pack ID: ${packId}`);

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
    const tags = t.tags ?? [];
    const description = t.whatDescription ?? templateId;

    let shape: 'box' | 'circle' = 'box';
    if (t.collider?.shape === 'circle' || t.physics?.shape === 'circle') {
      shape = 'circle';
    } else if (tags.includes('ball') || tags.includes('round') || tags.includes('circle')) {
      shape = 'circle';
    } else if (t.collider?.shape || t.physics?.shape) {
      shape = 'box';
    }

    const visualW = t.visual?.imageWidth;
    const visualH = t.visual?.imageHeight;
    const colliderW = t.collider?.width ?? t.physics?.width;
    const colliderH = t.collider?.height ?? t.physics?.height;
    const width = visualW ?? colliderW ?? 1;
    const height = visualH ?? colliderH ?? 1;

    const color = extractColorFromDescription(description);

    let entityType: EntityType = 'item';
    if (tags.includes('player') || tags.includes('character')) entityType = 'character';
    else if (tags.includes('enemy')) entityType = 'enemy';
    else if (tags.includes('platform') || tags.includes('wall') || tags.includes('ground')) entityType = 'platform';
    else if (tags.includes('background')) entityType = 'background';
    else if (tags.includes('ui')) entityType = 'ui';

    specs.push({
      type: 'entity',
      id: templateId,
      shape,
      width,
      height,
      entityType,
      description,
      color,
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

  const manifest: PackManifest = { version: 1, packId, name: packName, assets: {} };

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
          packId,
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

  if (successCount > 0) {
    const gameSourcePath = join(R2_DIR, 'games', gameId, 'src', 'game.ts');
    if (existsSync(gameSourcePath)) {
      let source = readFileSync(gameSourcePath, 'utf-8');

      source = source.replace(
        /activePackId:\s*"[^"]*"/,
        `activePackId: "${packId}"`,
      );

      const packIdsMatch = source.match(/packIds:\s*\[([\s\S]*?)\]/);
      if (packIdsMatch) {
        const existingIds = [...packIdsMatch[1].matchAll(/"([^"]+)"/g)].map(m => m[1]);
        if (!existingIds.includes(packId)) {
          existingIds.push(packId);
        }
        const formatted = existingIds.map(id => `\n        "${id}",`).join('');
        source = source.replace(
          /packIds:\s*\[([\s\S]*?)\]/,
          `packIds: [${formatted}\n      ]`,
        );
      }

      writeFileSync(gameSourcePath, source);
      console.log(`\nUpdated source: ${gameSourcePath}`);
      console.log(`  activePackId: ${packId}`);
    }

    console.log(`\nRebuilding games...`);
    execSync('pnpm --filter @slopcade/api build:games', {
      stdio: 'inherit',
      cwd: resolve(API_ROOT, '..'),
    });
  }
}

main().catch(err => {
  console.error('Asset generation failed:', err);
  process.exit(1);
});
