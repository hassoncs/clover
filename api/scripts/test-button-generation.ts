#!/usr/bin/env node
/**
 * Quick test button generator - saves all intermediates locally
 * Usage: npx tsx api/scripts/test-button-generation.ts
 */

import { createNodeAdapters, createFileDebugSink } from '../src/ai/pipeline/adapters/node';
import { uiBaseStateStage, uiVariationStatesStage } from '../src/ai/pipeline/stages/ui-component';
import type { AssetRun, UIComponentSheetSpec } from '../src/ai/pipeline/types';
import * as path from 'path';

const OUTPUT_DIR = path.join(process.cwd(), 'debug-output/test-button-run');

async function main() {
  console.log('='.repeat(70));
  console.log('Button Generation Test - All Intermediates Saved');
  console.log('='.repeat(70));
  console.log(`Output directory: ${OUTPUT_DIR}\n`);

  const adapters = await createNodeAdapters({
    r2Bucket: 'slopcade-assets-dev',
    wranglerCwd: process.cwd(),
    publicUrlBase: 'http://localhost:8787/assets',
  });

  const debugSink = createFileDebugSink(OUTPUT_DIR);

  const spec: UIComponentSheetSpec = {
    type: 'sheet',
    id: 'test-button',
    kind: 'ui_component',
    componentType: 'button',
    states: ['normal'],
    ninePatchMargins: { left: 12, right: 12, top: 12, bottom: 12 },
    width: 512,
    height: 512,
    layout: { type: 'manual' },
  };

  const run: AssetRun<UIComponentSheetSpec> = {
    spec,
    artifacts: {},
    meta: {
      gameId: 'test',
      packId: crypto.randomUUID(),
      assetId: crypto.randomUUID(),
      gameTitle: 'Button Test',
      theme: 'flat modern design with subtle gradients',
      style: 'flat',
      r2Prefix: 'test/button',
      startedAt: Date.now(),
      runId: crypto.randomUUID(),
    },
  };

  console.log('Stage 1: Generating silhouette with "BUTTON" text...');
  console.log('  Creating: 1-silhouette.png (silhouette with text hint)');
  const afterBase = await uiBaseStateStage.run(run, adapters, debugSink);

  console.log('\n✅ Generation complete!');
  console.log('\nFiles saved in: ' + OUTPUT_DIR);
  console.log('\nGenerated files:');
  console.log('  - test-button/1-silhouette.png (silhouette with "BUTTON" text)');
  console.log('  - test-button/2-prompt-normal.txt (AI prompt)');
  console.log('  - test-button/3-generated-normal.png (raw AI output)');
  console.log('  - test-button/4-final-normal.png (background removed)');
}

main().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
