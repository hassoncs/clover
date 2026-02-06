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
      'pack-id': { type: 'string' },
      pack: { type: 'string', default: 'default' },
      theme: { type: 'string', default: '' },
      style: { type: 'string', default: '' },
      templates: { type: 'string' },
      debug: { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
      'plan-only': { type: 'boolean', default: false },
      'reuse-plan': { type: 'string' },
      'planner-disable': { type: 'boolean', default: false },
    },
    strict: true,
  });

  if (!values.game) {
    console.error('Usage: hush run -- pnpm generate:assets --game=<gameId> [--pack-id=<existingPackUUID>] [--pack=<packName>] [--theme="..."] [--style="3d|pixel|cartoon|..."] [--templates=a,b] [--debug] [--dry-run] [--plan-only] [--reuse-plan=<path>] [--planner-disable]');
    process.exit(1);
  }

  const gameId = values.game;
  const existingPackId = values['pack-id'];
  const packName = values.pack ?? 'default';
  const theme = values.theme ?? '';
  const style = values.style ?? '';
  const dryRun = values['dry-run'] ?? false;
  const debug = values.debug ?? false;
  const planOnly = values['plan-only'] ?? false;
  const reusePlanPath = values['reuse-plan'];
  const plannerDisable = values['planner-disable'] ?? false;

  if (existingPackId) {
    const existingPackDir = join(R2_DIR, 'packs', existingPackId);
    const existingManifestPath = join(existingPackDir, 'manifest.json');
    if (!existsSync(existingManifestPath)) {
      console.error(`No manifest.json found at ${existingManifestPath}. Check the pack-id.`);
      process.exit(1);
    }
  }

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

  const isExistingPack = !!existingPackId;
  if (isExistingPack) {
    console.log(`  Target: existing pack ${existingPackId}`);
  }

  if (dryRun) {
    console.log('\n(dry run — no assets generated)');
    return;
  }

  const packId = existingPackId ?? randomUUID();
  const packDir = join(R2_DIR, 'packs', packId);
  mkdirSync(packDir, { recursive: true });

  console.log(`  Pack ID: ${packId}${isExistingPack ? ' (existing)' : ''}`);

  let existingManifest: PackManifest | undefined;
  if (isExistingPack) {
    existingManifest = JSON.parse(readFileSync(join(packDir, 'manifest.json'), 'utf-8'));
  }

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

    const INDEXED_COLORS = [
      '#FF4444', '#4444FF', '#44FF44', '#FFFF44',
      '#AA44FF', '#FF8844', '#FF44AA', '#44FFFF',
    ];

    let color = extractColorFromDescription(description);
    if (!color) {
      const colorTag = tags.find((tag: string) => tag.startsWith('color-'));
      if (colorTag) {
        const idx = parseInt(colorTag.split('-')[1], 10);
        if (!isNaN(idx) && idx < INDEXED_COLORS.length) {
          color = INDEXED_COLORS[idx];
        }
      }
    }

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

  // ── Theme Planner (runs BEFORE heavy pipeline init) ──────────────────────────

  const { generateThemePlan } = await import(
    '../src/ai/pipeline/theme-planner'
  );
  const { parseThemePlan } = await import(
    '../src/ai/pipeline/theme-plan'
  );

  type ThemePlan = {
    templatePlans: Record<string, {
      prompt: string;
      silhouetteColor?: string;
    }>;
  };

  let themePlan: ThemePlan | null = null;

  if (!plannerDisable) {
    if (reusePlanPath) {
      console.log(`\nTheme Planner: Loading plan from ${reusePlanPath}`);
      try {
        const planJson = JSON.parse(readFileSync(reusePlanPath, 'utf-8'));
        themePlan = parseThemePlan(planJson);
        console.log(`Theme Planner: Plan loaded successfully (${Object.keys(themePlan.templatePlans).length} templates)`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`Theme Planner: Failed to load plan: ${msg}`);
        if (planOnly) {
          console.error('\n(plan-only mode — cannot continue without a valid plan)');
          process.exit(1);
        }
        console.log('Theme Planner: Falling back to legacy prompt building');
      }
    } else if (theme && process.env.OPENROUTER_API_KEY) {
      console.log(`\nTheme Planner: Generating plan for theme "${theme}"...`);

      const plannerInput = {
        templates: specs.map(spec => ({
          templateId: spec.id,
          whatDescription: spec.description,
          entityType: spec.entityType as EntityType,
          physicsShape: spec.shape,
          tags: templates[spec.id]?.tags ?? [],
        })),
        theme,
        style: style || undefined,
        gameTitle: definition.metadata?.title ?? gameId,
      };

      try {
        themePlan = await generateThemePlan(plannerInput, process.env.OPENROUTER_API_KEY);

        if (themePlan) {
          console.log(`Theme Planner: Plan generated successfully (${Object.keys(themePlan.templatePlans).length} templates)`);

          const planPath = join(packDir, 'theme-plan.json');
          writeFileSync(planPath, JSON.stringify(themePlan, null, 2));
          console.log(`Theme Planner: Plan saved to ${planPath}`);
        } else {
          console.log('Theme Planner: Plan generation failed, falling back to legacy prompt building');
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`Theme Planner: Error during generation: ${msg}`);
        console.log('Theme Planner: Falling back to legacy prompt building');
      }
    } else if (theme) {
      console.log('\nTheme Planner: Disabled (OPENROUTER_API_KEY not set)');
    }
  } else {
    console.log('\nTheme Planner: Disabled (--planner-disable flag set)');
  }

  // ── Plan-only: print and exit BEFORE initializing heavy adapters ────────────

  if (planOnly) {
    if (themePlan) {
      console.log('\n=== Theme Plan ===');
      console.log(JSON.stringify(themePlan, null, 2));
      console.log('\n(plan-only mode — exiting without generating images)');
    } else {
      console.error('\n(plan-only mode — no plan was generated or loaded)');
      process.exit(1);
    }
    return;
  }

  // ── Initialize pipeline adapters (heavy — only when actually generating) ────

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

  if (themePlan) {
    for (const spec of specs) {
      if (themePlan.templatePlans[spec.id]) {
        spec.description = themePlan.templatePlans[spec.id].prompt;
        if (themePlan.templatePlans[spec.id].silhouetteColor) {
          spec.color = themePlan.templatePlans[spec.id].silhouetteColor;
        }
      }
    }
  }

  const CONCURRENCY = 10;
  console.log(`\nGenerating ${specs.length} assets (concurrency: ${CONCURRENCY})...\n`);

  const manifest: PackManifest = existingManifest
    ? { ...existingManifest }
    : { version: 1, packId, name: packName, assets: {} };

  let successCount = 0;
  let failCount = 0;

  async function generateOne(spec: EntitySpec): Promise<void> {
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
        console.log(`[${spec.id}] Done (${(result.durationMs / 1000).toFixed(1)}s)`);
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

  const pool: Promise<void>[] = [];
  const queue = [...specs];

  async function runPool(): Promise<void> {
    while (queue.length > 0) {
      const spec = queue.shift()!;
      await generateOne(spec);
    }
  }

  const workers = Math.min(CONCURRENCY, specs.length);
  for (let i = 0; i < workers; i++) {
    pool.push(runPool());
  }
  await Promise.all(pool);

  writeFileSync(join(packDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\nResults: ${successCount} succeeded, ${failCount} failed`);
  console.log(`Manifest: ${join(packDir, 'manifest.json')}`);

  if (successCount > 0) {
    if (!isExistingPack) {
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
    } else {
      console.log(`\nExisting pack updated — no source changes needed.`);
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
