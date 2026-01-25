/**
 * Test script for UI Component Generation Pipeline
 * 
 * Usage:
 *   npx tsx api/scripts/test-ui-generation.ts
 * 
 * Prerequisites:
 *   - SCENARIO_API_KEY environment variable set
 *   - Local R2 storage available (.wrangler/state/v3/r2/)
 */

import { createNinePatchSilhouette } from '../src/ai/pipeline/silhouettes/ui-component';
import { buildUIComponentPrompt } from '../src/ai/pipeline/prompt-builder';
import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_DIR = path.join(process.cwd(), 'debug-output/ui-test');

async function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function testSilhouetteGeneration() {
  console.log('\n=== Testing Silhouette Generation ===\n');
  
  const silhouette = await createNinePatchSilhouette({
    width: 256,
    height: 256,
    marginSize: 12,
    canvasSize: 256,
  });
  
  await ensureDir(OUTPUT_DIR);
  const silhouettePath = path.join(OUTPUT_DIR, 'test-silhouette.png');
  fs.writeFileSync(silhouettePath, silhouette);
  console.log(`Silhouette saved to: ${silhouettePath}`);
  console.log(`File size: ${silhouette.length} bytes`);
  
  return silhouette;
}

async function testPromptGeneration() {
  console.log('\n=== Testing Prompt Generation ===\n');
  
  const states = ['normal', 'hover', 'pressed', 'disabled'] as const;
  const theme = 'medieval fantasy with stone textures';
  
  for (const state of states) {
    const { prompt, negativePrompt } = buildUIComponentPrompt({
      componentType: 'checkbox',
      state,
      theme,
      baseResolution: 256,
    });
    
    console.log(`\n--- State: ${state} ---`);
    console.log('Prompt length:', prompt.length);
    console.log('Negative prompt length:', negativePrompt.length);
    
    const promptPath = path.join(OUTPUT_DIR, `prompt-${state}.txt`);
    fs.writeFileSync(promptPath, `=== POSITIVE ===\n${prompt}\n\n=== NEGATIVE ===\n${negativePrompt}`);
    console.log(`Saved to: ${promptPath}`);
  }
}

async function testFullPipeline() {
  console.log('\n=== Full Pipeline Test (requires SCENARIO_API_KEY) ===\n');
  
  const apiKey = process.env.SCENARIO_API_KEY;
  if (!apiKey) {
    console.log('SCENARIO_API_KEY not set. Skipping full pipeline test.');
    console.log('To run full test: SCENARIO_API_KEY=your_key npx tsx api/scripts/test-ui-generation.ts');
    return;
  }
  
  console.log('API key found. Full pipeline test would run here.');
  console.log('For actual generation, use the tRPC route via the dev server:');
  console.log('  1. pnpm dev');
  console.log('  2. Call uiComponents.generateUIComponent');
}

async function main() {
  console.log('UI Component Generation Test Script');
  console.log('====================================');
  
  try {
    await testSilhouetteGeneration();
    await testPromptGeneration();
    await testFullPipeline();
    
    console.log('\n=== Test Complete ===');
    console.log(`Output directory: ${OUTPUT_DIR}`);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

main();
