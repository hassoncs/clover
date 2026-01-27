#!/usr/bin/env npx tsx
import * as path from 'path';
import * as crypto from 'node:crypto';
import { executeGameAssets } from '../src/ai/pipeline';
import { createNodeAdapters, createFileDebugSink } from '../src/ai/pipeline/adapters/node';
import { getGameConfig, listGameIds } from './game-configs';
import type { GameAssetConfig } from '../src/ai/pipeline/types';
import { buildAssetPath } from '@slopcade/shared/utils/asset-url';

interface CliOptions {
  gameId?: string;
  dryRun: boolean;
  assetFilter?: string;
  assetType?: string;
  debugDir: string;
  help: boolean;
  strength?: number;
  packId?: string;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    dryRun: false,
    debugDir: path.join(__dirname, '..', 'debug-output'),
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--game=')) {
      options.gameId = arg.split('=')[1];
    } else if (arg.startsWith('--asset=')) {
      options.assetFilter = arg.split('=')[1];
    } else if (arg.startsWith('--type=')) {
      options.assetType = arg.split('=')[1];
    } else if (arg.startsWith('--debug-dir=')) {
      options.debugDir = arg.split('=').slice(1).join('=');
    } else if (arg.startsWith('--strength=')) {
      const val = parseFloat(arg.split('=')[1]);
      if (!isNaN(val) && val >= 0 && val <= 1) {
        options.strength = val;
      } else {
        console.error('Error: --strength must be a number between 0 and 1');
        process.exit(1);
      }
    } else if (arg.startsWith('--pack-id=')) {
      options.packId = arg.split('=').slice(1).join('=');
    } else if (!arg.startsWith('--') && !options.gameId) {
      options.gameId = arg;
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
Usage: npx tsx api/scripts/generate-game-assets.ts [game-id] [options]

Arguments:
  game-id              Game to generate assets for (required)

Options:
  --dry-run            Only show what would be generated, skip API calls
  --asset=ID           Only generate specific asset by ID
  --type=TYPE          Only generate assets of specific type (entity, background, title_hero, parallax, sheet)
  --strength=N         img2img strength (0-1, default: 0.925). Lower = more faithful to silhouette
  --pack-id=UUID        Asset pack UUID to use for this run (default: auto-generate)
  --debug-dir=PATH     Directory for debug output (default: api/debug-output)
  -h, --help           Show this help message

Available games:
  ${listGameIds().join('\n  ')}

Examples:
  npx tsx api/scripts/generate-game-assets.ts slopeggle
  npx tsx api/scripts/generate-game-assets.ts slopeggle --dry-run
  npx tsx api/scripts/generate-game-assets.ts slopeggle --asset=ball
  npx tsx api/scripts/generate-game-assets.ts slopeggle --type=entity
  npx tsx api/scripts/generate-game-assets.ts physics-stacker --asset=blockWide

Environment variables:
  SCENARIO_API_KEY         Scenario.com API key (required)
  SCENARIO_SECRET_API_KEY  Scenario.com secret key (required)
`);
}

function filterAssets(config: GameAssetConfig, options: CliOptions): GameAssetConfig {
  let assets = config.assets;

  if (options.assetFilter) {
    assets = assets.filter(a => a.id === options.assetFilter);
    if (assets.length === 0) {
      const available = config.assets.map(a => a.id).join(', ');
      throw new Error(`Asset "${options.assetFilter}" not found. Available: ${available}`);
    }
  }

  if (options.assetType) {
    assets = assets.filter(a => a.type === options.assetType);
    if (assets.length === 0) {
      throw new Error(`No assets of type "${options.assetType}" found`);
    }
  }

  return { ...config, assets };
}

function printConfig(config: GameAssetConfig): void {
  console.log(`
Game: ${config.gameTitle} (${config.gameId})
Theme: ${config.theme}
Style: ${config.style}
R2 Prefix: ${config.r2Prefix}
Assets to generate: ${config.assets.length}
`);

  console.log('Assets:');
  for (const asset of config.assets) {
    const details = asset.type === 'entity' 
      ? `${asset.shape} ${asset.width.toFixed(2)}x${asset.height.toFixed(2)}`
      : asset.type;
    console.log(`  - ${asset.id} (${details})`);
  }
  console.log('');
}

async function main(): Promise<void> {
  const options = parseArgs();

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  if (!options.gameId) {
    console.error('Error: Game ID is required\n');
    printHelp();
    process.exit(1);
  }

  const apiKey = process.env.SCENARIO_API_KEY;
  const apiSecret = process.env.SCENARIO_SECRET_API_KEY;

  if (!apiKey || !apiSecret) {
    if (!options.dryRun) {
      console.error('Error: SCENARIO_API_KEY and SCENARIO_SECRET_API_KEY environment variables are required');
      console.error('Set them or use --dry-run to preview without API calls');
      process.exit(1);
    }
  }

  let config: GameAssetConfig;
  try {
    config = getGameConfig(options.gameId);
  } catch (e) {
    console.error(`Error: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }

  config = filterAssets(config, options);
  const debugDir = path.join(options.debugDir, config.gameId);
  const packId = options.packId ?? crypto.randomUUID();

  console.log('═'.repeat(60));
  console.log('  GAME ASSET GENERATION');
  console.log('═'.repeat(60));

  printConfig(config);

  console.log(`Debug output: ${debugDir}`);
  console.log(`Dry run: ${options.dryRun}`);
  console.log(`Pack ID: ${packId}`);
  console.log('');

  if (options.dryRun) {
    console.log('DRY RUN - Skipping actual generation');
    console.log('');
    console.log('Would generate the following assets:');
    for (const asset of config.assets) {
      const assetId = crypto.randomUUID();
      const baseKey = buildAssetPath(config.gameId, packId, assetId);

      if (asset.type === 'parallax') {
        console.log(`  ${asset.id} (assetId=${assetId})`);
        for (let i = 0; i < asset.layerCount; i++) {
          const key = buildAssetPath(config.gameId, packId, `${assetId}-layer-${i}`);
          console.log(`    - ${key}`);
        }
        continue;
      }

      console.log(`  ${asset.id} (assetId=${assetId}) -> ${baseKey}`);

      if (asset.type === 'sheet') {
        const metadataKey = baseKey.replace(/\.png$/, '.json');
        console.log(`    - ${metadataKey}`);
      }
    }
    process.exit(0);
  }

  const provider = (process.env.IMAGE_GENERATION_PROVIDER as 'scenario' | 'runpod' | 'comfyui') ?? 'scenario';
  
  const adapters = await createNodeAdapters({
    provider,
    scenarioApiKey: apiKey!,
    scenarioApiSecret: apiSecret!,
    runpodApiKey: process.env.RUNPOD_API_KEY,
    runpodSdxlEndpointId: process.env.RUNPOD_SDXL_ENDPOINT_ID,
    runpodFluxEndpointId: process.env.RUNPOD_FLUX_ENDPOINT_ID,
    runpodBgRemovalEndpointId: process.env.RUNPOD_BG_REMOVAL_ENDPOINT_ID,
    comfyuiEndpoint: process.env.COMFYUI_ENDPOINT,
    r2Bucket: 'slopcade-assets',
    wranglerCwd: path.join(__dirname, '..'),
    publicUrlBase: 'https://slopcade-api.hassoncs.workers.dev/assets',
  });

  const debugSink = createFileDebugSink(debugDir);

  console.log('Starting generation...\n');
  if (options.strength !== undefined) {
    console.log(`Using strength override: ${options.strength}\n`);
  }

  const result = await executeGameAssets(config, adapters, debugSink, {
    strength: options.strength,
    packId,
  });

  console.log('');
  console.log('═'.repeat(60));
  console.log('  SUMMARY');
  console.log('═'.repeat(60));
  console.log(`
Game: ${result.gameId}
Total: ${result.totalAssets}
Successful: ${result.successful}
Failed: ${result.failed}
Duration: ${(result.durationMs / 1000).toFixed(1)}s
`);

  if (result.failed > 0) {
    console.log('Failed assets:');
    for (const r of result.results.filter(r => !r.success)) {
      console.log(`  - ${r.assetId}: ${r.error}`);
    }
  }

  if (result.successful > 0) {
    console.log('Generated assets:');
    for (const r of result.results.filter(r => r.success)) {
      console.log(`  - ${r.assetId}: ${r.publicUrls.join(', ')}`);
    }
  }

  console.log(`\nDebug files saved to: ${debugDir}`);

  process.exit(result.failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
