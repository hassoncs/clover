#!/usr/bin/env node
/**
 * Generate a complete button with all states - saves all intermediates locally
 * Usage: npx tsx api/scripts/generate-button-all-states.ts
 */

import { createNodeAdapters, createFileDebugSink } from '../src/ai/pipeline/adapters/node';
import { uiBaseStateStage, uiVariationStatesStage } from '../src/ai/pipeline/stages/ui-component';
import type { AssetRun, UIComponentSheetSpec } from '../src/ai/pipeline/types';
import * as path from 'path';
import * as fs from 'fs';

const OUTPUT_DIR = path.join(process.cwd(), 'debug-output/button-all-states-v2');

async function main() {
  console.log('='.repeat(70));
  console.log('Complete Button Generation - All States');
  console.log('='.repeat(70));
  console.log(`Output directory: ${OUTPUT_DIR}\n`);

  const adapters = await createNodeAdapters({
    r2Bucket: 'slopcade-assets-dev',
    wranglerCwd: process.cwd(),
    publicUrlBase: 'http://localhost:8787/assets',
  });

  const debugSink = createFileDebugSink(OUTPUT_DIR);

  // Define all button states to generate
  const spec: UIComponentSheetSpec = {
    type: 'sheet',
    id: 'complete-button',
    kind: 'ui_component',
    componentType: 'button',
    states: ['normal', 'hover', 'pressed', 'disabled'],
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
      theme: 'modern glass morphism button with subtle blue gradient, soft shadows, rounded corners',
      style: 'flat',
      r2Prefix: 'test/button',
      startedAt: Date.now(),
      runId: crypto.randomUUID(),
    },
  };

  console.log('Button Configuration:');
  console.log(`  States: ${spec.states.join(', ')}`);
  console.log(`  Theme: ${run.meta.theme}\n`);

  // Stage 1: Generate base state (normal)
  console.log('─'.repeat(70));
  console.log('Stage 1: Generating BASE STATE (normal)');
  console.log('─'.repeat(70));
  const afterBase = await uiBaseStateStage.run(run, adapters, debugSink);
  
  // Stage 2: Generate variation states
  console.log('\n' + '─'.repeat(70));
  console.log('Stage 2: Generating VARIATION STATES (hover, pressed, disabled)');
  console.log('─'.repeat(70));
  const afterVariations = await uiVariationStatesStage.run(afterBase, adapters, debugSink);

  console.log('\n' + '='.repeat(70));
  console.log('Generation complete!');
  console.log('='.repeat(70));
  console.log(`\n📁 All files saved in: ${OUTPUT_DIR}`);
  
  // List what was created
  console.log('\nGenerated files:');
  
  // Base state files
  const baseDir = path.join(OUTPUT_DIR, 'complete-button', 'ui-base-state');
  console.log('\n  Base State (normal):');
  console.log('    complete-button/ui-base-state/');
  console.log('      ├── 1-silhouette.png       - Silhouette with "BUTTON" text');
  console.log('      ├── 2-prompt-normal.txt    - AI prompt used');
  console.log('      ├── 3-generated-normal.png - Raw AI output');
  console.log('      └── 4-final-normal.png     - Final (background removed)');
  
  // Variation state files
  console.log('\n  Variation States:');
  const varDir = path.join(OUTPUT_DIR, 'complete-button', 'ui-variation-states');
  console.log('    complete-button/ui-variation-states/');
  for (const state of ['hover', 'pressed', 'disabled']) {
    console.log(`      ├── 2-prompt-${state}.txt    - AI prompt for ${state}`);
    console.log(`      ├── 3-generated-${state}.png - Raw AI output for ${state}`);
    console.log(`      └── 4-final-${state}.png     - Final ${state} state`);
  }
  
  // Summary of final outputs
  console.log('\n' + '─'.repeat(70));
  console.log('Final Button States:');
  console.log('─'.repeat(70));
  for (const state of spec.states) {
    const stage = state === 'normal' ? 'ui-base-state' : 'ui-variation-states';
    console.log(`  [${state.toUpperCase()}] ${OUTPUT_DIR}/complete-button/${stage}/4-final-${state}.png`);
  }
  
  // Create a summary comparison file
  await createSummaryFile(afterVariations);
}

async function createSummaryFile(run: AssetRun<UIComponentSheetSpec>) {
  const summaryPath = path.join(OUTPUT_DIR, 'complete-button', 'SUMMARY.md');
  const summary = `# Button Generation Summary

## Configuration
- **Component Type:** ${run.spec.componentType}
- **States Generated:** ${run.spec.states.join(', ')}
- **Theme:** ${run.meta.theme}
- **Canvas Size:** ${run.spec.width}x${run.spec.height}
- **Nine-Patch Margins:** L:${run.spec.ninePatchMargins.left} R:${run.spec.ninePatchMargins.right} T:${run.spec.ninePatchMargins.top} B:${run.spec.ninePatchMargins.bottom}

## Files Generated

### Base State (normal)
Location: \`complete-button/ui-base-state/\`

1. **1-silhouette.png** - The silhouette with "BUTTON" text hint
2. **2-prompt-normal.txt** - The AI prompt used for generation
3. **3-generated-normal.png** - Raw AI output from img2img
4. **4-final-normal.png** - Final image with background removed

### Variation States
Location: \`complete-button/ui-variation-states/\`

${run.spec.states.filter(s => s !== 'normal').map(state => `
#### ${state.toUpperCase()}
- 2-prompt-${state}.txt - AI prompt for ${state} state
- 3-generated-${state}.png - Raw AI output
- 4-final-${state}.png - Final image with background removed
`).join('\n')}

## Directory Structure
\`\`\`
debug-output/button-all-states/
└── complete-button/
    ├── SUMMARY.md
    ├── ui-base-state/
    │   ├── 1-silhouette.png
    │   ├── 2-prompt-normal.txt
    │   ├── 3-generated-normal.png
    │   └── 4-final-normal.png
    └── ui-variation-states/
        ├── 2-prompt-hover.txt
        ├── 3-generated-hover.png
        ├── 4-final-hover.png
        ├── 2-prompt-pressed.txt
        ├── 3-generated-pressed.png
        ├── 4-final-pressed.png
        ├── 2-prompt-disabled.txt
        ├── 3-generated-disabled.png
        └── 4-final-disabled.png
\`\`\`
`;

  fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
  fs.writeFileSync(summaryPath, summary);
  console.log(`\n📝 Summary saved: ${summaryPath}`);
}

main().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
