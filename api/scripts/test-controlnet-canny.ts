#!/usr/bin/env node
/**
 * Test ControlNet Canny for silhouette preservation
 * Usage: npx tsx api/scripts/test-controlnet-canny.ts
 */

import { createNinePatchSilhouette } from '../src/ai/pipeline/silhouettes/ui-component';
import * as path from 'path';
import * as fs from 'fs';

const OUTPUT_DIR = path.join(process.cwd(), 'debug-output/controlnet-canny-test');
const MODAL_ENDPOINT = 'https://hassoncs--slopcade-comfyui-comfyuiworker-web-controlnet.modal.run';

const TESTS = [
  {
    name: 'controlnet_low',
    control_strength: 0.5,
    prompt: 'Modern blue glass morphism game button with soft shadows, "BUTTON" text'
  },
  {
    name: 'controlnet_medium',
    control_strength: 0.7,
    prompt: 'Modern blue glass morphism game button with soft shadows, "BUTTON" text'
  },
  {
    name: 'controlnet_high',
    control_strength: 0.9,
    prompt: 'Modern blue glass morphism game button with soft shadows, "BUTTON" text'
  }
];

async function runTest(test: typeof TESTS[0], silhouetteBase64: string) {
  console.log(`\n🎨 ${test.name}`);
  console.log(`   Control Strength: ${test.control_strength}`);
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(MODAL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: test.prompt,
        image_base64: silhouetteBase64,
        control_strength: test.control_strength,
        steps: 25
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error);
    }

    const duration = Date.now() - startTime;
    const filename = `${test.name}_cs${test.control_strength}.png`;
    
    fs.writeFileSync(
      path.join(OUTPUT_DIR, filename),
      Buffer.from(data.image_base64, 'base64')
    );

    console.log(`   ✅ Saved: ${filename} (${(duration/1000).toFixed(1)}s)`);
    return { success: true, filename, ...test };
    
  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}`);
    return { success: false, error: error.message, ...test };
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('ControlNet Canny Test - Shape Preservation');
  console.log('='.repeat(70));
  console.log(`Output: ${OUTPUT_DIR}\n`);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Generate silhouette
  console.log('Creating silhouette...');
  const silhouettePng = await createNinePatchSilhouette({
    width: 160,
    height: 64,
    marginSize: 12,
    canvasSize: 512,
    textHint: {
      text: 'BUTTON',
      fontSize: 24,
      color: '#E0E0E0',
      fontWeight: 'bold'
    }
  });
  
  const silhouetteBase64 = Buffer.from(silhouettePng).toString('base64');
  fs.writeFileSync(path.join(OUTPUT_DIR, '00_SILHOUETTE.png'), Buffer.from(silhouettePng));
  console.log('✅ Silhouette saved (160x64 rect on 512x512 canvas)\n');

  // Run tests
  const results = [];
  for (const test of TESTS) {
    const result = await runTest(test, silhouetteBase64);
    results.push(result);
  }

  console.log('\n' + '='.repeat(70));
  console.log('Complete!');
  console.log('='.repeat(70));
  console.log(`\n📁 Results: ${OUTPUT_DIR}`);
  console.log('\n💡 ControlNet Canny uses edge detection to preserve shape.');
  console.log('   Higher control_strength = stricter shape adherence');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
