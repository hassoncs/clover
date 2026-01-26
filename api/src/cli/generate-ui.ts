#!/usr/bin/env node
import { parseArgs } from 'node:util';
import * as path from 'path';
import { createNodeAdapters, createFileDebugSink } from '../ai/pipeline/adapters/node';
import { uiBaseStateStage, uiVariationStatesStage, uiUploadR2Stage } from '../ai/pipeline/stages/ui-component';
import type { AssetRun, UIComponentSheetSpec, SpriteStyle } from '../ai/pipeline/types';
import { UI_CONTROL_CONFIG, getControlConfig } from '../ai/pipeline/ui-control-config';
import { getPresetTheme, listPresets, THEME_PRESETS } from './theme-presets';

type UIControlType = 'button' | 'checkbox' | 'panel' | 'progress_bar' | 'scroll_bar_h' | 'scroll_bar_v' | 'tab_bar';

const ALL_CONTROLS: UIControlType[] = ['button', 'checkbox', 'panel', 'progress_bar', 'scroll_bar_h', 'scroll_bar_v', 'tab_bar'];

function printHelp(): void {
  console.log(`
Godot UI Control Generator

USAGE:
  pnpm generate:ui <controls...> --theme <theme>
  pnpm generate:ui --all --theme <theme>
  pnpm generate:ui <controls...> --preset <preset>

ARGUMENTS:
  <controls...>     Control types: ${ALL_CONTROLS.join(', ')}

OPTIONS:
  --all             Generate all ${ALL_CONTROLS.length} controls
  --theme <text>    Theme description (required if no --preset)
  --preset <name>   Use built-in theme preset (see list below)
  --output <dir>    Output directory (default: ./api/debug-output/ui-cli)
  --verbose         Show detailed pipeline logs
  --list-presets    Show all available theme presets
  --help            Show this help

THEME PRESETS:
  ${Object.keys(THEME_PRESETS).join(', ')}

EXAMPLES:
  # Single control with theme
  pnpm generate:ui button --theme "medieval fantasy"
  
  # Multiple controls with preset
  pnpm generate:ui panel progress_bar --preset scifi
  
  # All controls
  pnpm generate:ui --all --preset cartoon
  
  # Custom output directory
  pnpm generate:ui button --preset medieval --output ./my-test

ENVIRONMENT:
  Requires SCENARIO_API_KEY and SCENARIO_SECRET_API_KEY (or SCENARIO_API_SECRET)
  Typically run via: hush run -- pnpm generate:ui ...
`);
}

function validateControls(controls: string[]): UIControlType[] {
  const validated: UIControlType[] = [];
  for (const control of controls) {
    if (!ALL_CONTROLS.includes(control as UIControlType)) {
      console.error(`Error: Unknown control type: ${control}`);
      console.error(`Available: ${ALL_CONTROLS.join(', ')}`);
      process.exit(1);
    }
    validated.push(control as UIControlType);
  }
  return validated;
}

async function generateControl(
  controlType: UIControlType,
  theme: string,
  outputDir: string,
  adapters: Awaited<ReturnType<typeof createNodeAdapters>>,
  verbose: boolean
): Promise<void> {
  const config = UI_CONTROL_CONFIG[controlType];
  const debugSink = createFileDebugSink(outputDir);

  const spec: UIComponentSheetSpec = {
    type: 'sheet',
    id: `cli-${controlType}-${Date.now()}`,
    kind: 'ui_component',
    componentType: controlType as UIComponentSheetSpec['componentType'],
    states: config.states as UIComponentSheetSpec['states'],
    ninePatchMargins: config.margins,
    width: config.dimensions.width,
    height: config.dimensions.height,
    layout: { type: 'manual' },
  };

  const run: AssetRun<UIComponentSheetSpec> = {
    spec,
    artifacts: {},
    meta: {
      gameId: 'ui-cli',
      gameTitle: 'UI CLI Generation',
      theme,
      style: 'flat' as SpriteStyle,
      r2Prefix: `generated/ui-cli/${controlType}`,
      startedAt: Date.now(),
      runId: crypto.randomUUID(),
    },
  };

  if (verbose) {
    console.log(`  Config: ${JSON.stringify(config, null, 2)}`);
  }

  console.log(`  Stage 1/3: Generating base state (${config.baseState})...`);
  const afterBase = await uiBaseStateStage.run(run, adapters, debugSink);

  const variationStates = config.states.filter(s => s !== 'normal');
  if (variationStates.length > 0) {
    console.log(`  Stage 2/3: Generating variations (${variationStates.join(', ')})...`);
    const afterVariations = await uiVariationStatesStage.run(afterBase, adapters, debugSink);

    console.log(`  Stage 3/3: Uploading to R2...`);
    const final = await uiUploadR2Stage.run(afterVariations, adapters, debugSink);

    console.log(`  R2 Keys:`);
    for (const key of final.artifacts.r2Keys ?? []) {
      console.log(`    - ${key}`);
    }
  } else {
    console.log(`  Stage 2/3: Skipped (no variations)`);
    console.log(`  Stage 3/3: Uploading to R2...`);
    const final = await uiUploadR2Stage.run(afterBase, adapters, debugSink);

    console.log(`  R2 Keys:`);
    for (const key of final.artifacts.r2Keys ?? []) {
      console.log(`    - ${key}`);
    }
  }
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      all: { type: 'boolean', default: false },
      theme: { type: 'string' },
      preset: { type: 'string' },
      output: { type: 'string', default: './api/debug-output/ui-cli' },
      verbose: { type: 'boolean', default: false },
      'list-presets': { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
    allowPositionals: true,
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  if (values['list-presets']) {
    listPresets();
    process.exit(0);
  }

  if (!values.all && positionals.length === 0) {
    console.error('Error: Specify controls or use --all');
    console.error('Run with --help for usage information');
    process.exit(1);
  }

  if (values.all && positionals.length > 0) {
    console.error('Error: Cannot use --all with specific controls');
    process.exit(1);
  }

  if (!values.theme && !values.preset) {
    console.error('Error: --theme or --preset required');
    console.error('Run with --list-presets to see available presets');
    process.exit(1);
  }

  const apiKey = process.env.SCENARIO_API_KEY;
  const apiSecret = process.env.SCENARIO_SECRET_API_KEY || process.env.SCENARIO_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.error('Error: SCENARIO_API_KEY and SCENARIO_SECRET_API_KEY required');
    console.error('Set them in your environment or use hush:');
    console.error('  hush run -- pnpm generate:ui ...');
    process.exit(1);
  }

  const controls = values.all ? ALL_CONTROLS : validateControls(positionals);
  const theme = values.theme || getPresetTheme(values.preset)!;
  const outputDir = path.resolve(values.output!);

  console.log('\n' + '='.repeat(60));
  console.log('Godot UI Control Generator');
  console.log('='.repeat(60));
  console.log(`Theme: ${theme}`);
  console.log(`Controls: ${controls.join(', ')}`);
  console.log(`Output: ${outputDir}`);
  console.log('='.repeat(60) + '\n');

  const adapters = await createNodeAdapters({
    scenarioApiKey: apiKey,
    scenarioApiSecret: apiSecret,
    r2Bucket: 'slopcade-assets-dev',
    wranglerCwd: process.cwd(),
    publicUrlBase: 'http://localhost:8787/assets',
  });

  let successCount = 0;
  let failCount = 0;

  for (const control of controls) {
    console.log(`\n[${controls.indexOf(control) + 1}/${controls.length}] Generating ${control}...`);

    try {
      await generateControl(control, theme, outputDir, adapters, values.verbose!);
      console.log(`[OK] ${control} complete`);
      successCount++;
    } catch (error) {
      console.error(`[FAIL] ${control}: ${error instanceof Error ? error.message : error}`);
      failCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Complete: ${successCount} succeeded, ${failCount} failed`);
  console.log(`Output: ${outputDir}`);
  console.log('='.repeat(60) + '\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
