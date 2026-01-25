import { createNodeAdapters, createFileDebugSink } from '../src/ai/pipeline/adapters/node';
import { uiBaseStateStage, uiVariationStatesStage, uiUploadR2Stage } from '../src/ai/pipeline/stages/ui-component';
import type { AssetRun, UIComponentSheetSpec } from '../src/ai/pipeline/types';
import * as fs from 'fs';
import * as path from 'path';

const THEME = 'cyberpunk neon with glowing edges and holographic effects';
const OUTPUT_DIR = path.join(process.cwd(), 'debug-output/ui-checkbox-test');

async function main() {
  console.log('='.repeat(80));
  console.log('UI Checkbox Generation Test');
  console.log('='.repeat(80));
  console.log(`Theme: ${THEME}`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  const apiKey = process.env.SCENARIO_API_KEY;
  const apiSecret = process.env.SCENARIO_SECRET_API_KEY || process.env.SCENARIO_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.error('Error: SCENARIO_API_KEY and SCENARIO_SECRET_API_KEY required');
    console.error('Set them in your environment or use hush:');
    console.error('  hush run -- npx tsx api/scripts/generate-ui-checkbox.ts');
    process.exit(1);
  }

  const adapters = await createNodeAdapters({
    scenarioApiKey: apiKey,
    scenarioApiSecret: apiSecret,
    r2Bucket: 'slopcade-assets-dev',
    wranglerCwd: process.cwd(),
    publicUrlBase: 'http://localhost:8787/assets',
  });

  const debugSink = createFileDebugSink(OUTPUT_DIR);

  const spec: UIComponentSheetSpec = {
    type: 'sheet',
    id: 'checkbox-test',
    kind: 'ui_component',
    componentType: 'checkbox',
    states: ['normal', 'hover', 'pressed', 'disabled'],
    ninePatchMargins: { left: 12, right: 12, top: 12, bottom: 12 },
    baseResolution: 256,
    layout: { type: 'manual' },
  };

  const run: AssetRun<UIComponentSheetSpec> = {
    spec,
    artifacts: {},
    meta: {
      gameId: 'test-game',
      gameTitle: 'UI Test',
      theme: THEME,
      style: 'flat',
      r2Prefix: 'generated/test-ui/checkbox',
      startedAt: Date.now(),
      runId: crypto.randomUUID(),
    },
  };

  try {
    console.log('Stage 1: Generating base state (normal)...');
    const afterBase = await uiBaseStateStage.run(run, adapters, debugSink);

    console.log('\nStage 2: Generating variation states (hover, pressed, disabled)...');
    const afterVariations = await uiVariationStatesStage.run(afterBase, adapters, debugSink);

    console.log('\nStage 3: Uploading to R2...');
    const final = await uiUploadR2Stage.run(afterVariations, adapters, debugSink);

    console.log('\n' + '='.repeat(80));
    console.log('✅ Generation Complete!');
    console.log('='.repeat(80));
    console.log(`\nR2 Keys:`);
    final.artifacts.r2Keys?.forEach(key => {
      console.log(`  - ${key}`);
    });
    console.log(`\nPublic URLs:`);
    final.artifacts.publicUrls?.forEach(url => {
      console.log(`  - ${url}`);
    });

    generateReport(OUTPUT_DIR, final, THEME);

    console.log(`\n📄 Report saved to: ${path.join(OUTPUT_DIR, 'REPORT.md')}`);
    console.log(`\nOpen report: code "${path.join(OUTPUT_DIR, 'REPORT.md')}"`);
  } catch (error) {
    console.error('\n❌ Generation failed:', error);
    process.exit(1);
  }
}

function generateReport(outputDir: string, run: AssetRun, theme: string) {
  const reportPath = path.join(outputDir, 'REPORT.md');
  const assetDir = path.join(outputDir, run.spec.id);

  const files = fs.existsSync(assetDir) ? fs.readdirSync(assetDir) : [];
  
  const promptFiles = files.filter(f => f.includes('prompt')).sort();
  const imageFiles = files.filter(f => f.match(/\.(png|jpg|webp)$/)).sort();

  let report = `# UI Checkbox Generation Report

**Generated**: ${new Date().toLocaleString()}  
**Theme**: ${theme}  
**Component**: checkbox  
**States**: normal, hover, pressed, disabled  
**Resolution**: 256x256  
**Nine-Patch Margins**: 12px all sides

---

## Generation Summary

`;

  if (run.artifacts.stateImages) {
    const states = Object.keys(run.artifacts.stateImages);
    report += `✅ **${states.length}/4 states generated successfully**\n\n`;
    states.forEach(state => {
      report += `- ✅ ${state}\n`;
    });
  }

  report += `\n---

## Prompts

`;

  promptFiles.forEach(file => {
    const state = file.match(/prompt-(\w+)/)?.[1] || 'unknown';
    const content = fs.readFileSync(path.join(assetDir, file), 'utf-8');
    const [positive, negative] = content.split('=== NEGATIVE ===').map(s => s.replace('=== POSITIVE ===', '').trim());

    report += `### ${state.charAt(0).toUpperCase() + state.slice(1)} State

<details>
<summary><strong>Positive Prompt</strong> (${positive.length} chars)</summary>

\`\`\`
${positive}
\`\`\`

</details>

<details>
<summary><strong>Negative Prompt</strong> (${negative.length} chars)</summary>

\`\`\`
${negative}
\`\`\`

</details>

`;
  });

  report += `---

## Generated Images

`;

  const stateOrder = ['normal', 'hover', 'pressed', 'disabled'];
  stateOrder.forEach(state => {
    const finalImage = imageFiles.find(f => f.includes(`final-${state}`));
    if (finalImage) {
      report += `### ${state.charAt(0).toUpperCase() + state.slice(1)} State

![${state}](${run.spec.id}/${finalImage})

**File**: \`${finalImage}\`

`;
    }
  });

  report += `---

## Intermediate Outputs

`;

  const silhouette = imageFiles.find(f => f.includes('silhouette'));
  if (silhouette) {
    report += `### Silhouette

![silhouette](${run.spec.id}/${silhouette})

`;
  }

  const generatedImages = imageFiles.filter(f => f.includes('generated'));
  if (generatedImages.length) {
    report += `### Before Background Removal

`;
    generatedImages.forEach(img => {
      const state = img.match(/generated-(\w+)/)?.[1] || 'unknown';
      report += `**${state}**:  
![${state}-generated](${run.spec.id}/${img})

`;
    });
  }

  report += `---

## Metadata

`;

  if (run.artifacts.uiComponentMetadata) {
    report += `\`\`\`json
${run.artifacts.uiComponentMetadata}
\`\`\`

`;
  }

  report += `---

## R2 Storage

`;

  if (run.artifacts.r2Keys) {
    report += `### Keys

`;
    run.artifacts.r2Keys.forEach(key => {
      report += `- \`${key}\`\n`;
    });
  }

  if (run.artifacts.publicUrls) {
    report += `
### Public URLs

`;
    run.artifacts.publicUrls.forEach(url => {
      report += `- ${url}\n`;
    });
  }

  report += `
---

## File Listing

\`\`\`
${files.join('\n')}
\`\`\`
`;

  fs.writeFileSync(reportPath, report);
}

main();
