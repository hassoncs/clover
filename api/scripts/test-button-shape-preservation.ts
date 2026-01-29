#!/usr/bin/env node
/**
 * Button shape preservation test - better prompts, lower strengths
 * Usage: npx tsx api/scripts/test-button-shape-preservation.ts
 */

import { createNinePatchSilhouette } from '../src/ai/pipeline/silhouettes/ui-component';
import * as path from 'path';
import * as fs from 'fs';

const OUTPUT_DIR = path.join(process.cwd(), 'debug-output/button-shape-test');
const MODAL_ENDPOINT = process.env.MODAL_ENDPOINT ?? 'https://hassoncs--slopcade-comfyui-comfyuiworker-web-generate.modal.run';

// Test with better prompts and lower strengths
const TESTS = [
  {
    name: 'low_strength_clean',
    strength: 0.55,
    guidance: 4.0,
    prompt: 'A modern game UI button with blue glass morphism style, gradient fill, professional game interface. MUST maintain the exact rectangular shape from the input image. Same proportions, same size, just apply style transformation.',
    negative: 'round, circular, curved edges, deformed shape, wrong proportions'
  },
  {
    name: 'low_strength_detailed', 
    strength: 0.60,
    guidance: 4.5,
    prompt: 'Transform this rectangular button into a polished game UI element with blue gradient, subtle shadows, and "BUTTON" text. CRITICAL: Keep the exact same rectangular shape, dimensions, and proportions as the input silhouette. Only change the visual style, not the geometry.',
    negative: 'round, circle, oval, curved, distorted, different shape, wrong size'
  },
  {
    name: 'medium_strength_precise',
    strength: 0.65,
    guidance: 5.0,
    prompt: 'Style transfer: Take this exact rectangular button shape and apply a modern blue glass morphism aesthetic with soft shadows. The output MUST have identical shape, size, and proportions to the input. Preserve all geometric boundaries perfectly.',
    negative: 'round corners, circular, oval, blob, shape change, size change, deformed'
  },
  {
    name: 'with_explicit_rectangular',
    strength: 0.60,
    guidance: 4.0,
    prompt: 'Rectangular game button with sharp corners, blue gradient fill, glass morphism effect, "BUTTON" text centered. Maintain exact rectangular proportions and sharp 90-degree corners from input image.',
    negative: 'rounded, curved, circular, soft edges, organic shape'
  },
  {
    name: 'ultra_low_shape_focus',
    strength: 0.50,
    guidance: 3.5,
    prompt: 'Apply style to rectangular button: blue glass theme, shadows, text. ZERO shape change allowed - output must be identical rectangle to input.',
    negative: 'any shape change, round, curve, distortion'
  }
];

async function runTest(test: typeof TESTS[0], silhouetteBase64: string) {
  console.log(`\n🎨 ${test.name}`);
  console.log(`   Strength: ${test.strength}, Guidance: ${test.guidance}`);
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(MODAL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: test.prompt,
        negative_prompt: test.negative,
        image_base64: silhouetteBase64,
        strength: test.strength,
        guidance: test.guidance,
        width: 512,
        height: 512,
        steps: 25
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error);
    }

    const duration = Date.now() - startTime;
    const filename = `${test.name}.png`;
    
    fs.writeFileSync(
      path.join(OUTPUT_DIR, filename),
      Buffer.from(data.image_base64, 'base64')
    );

    console.log(`   ✅ Saved: ${filename} (${(duration/1000).toFixed(1)}s)`);
    return { success: true, filename };
    
  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('Button Shape Preservation Test');
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
  fs.writeFileSync(path.join(OUTPUT_DIR, '00_silhouette.png'), Buffer.from(silhouettePng));
  console.log('✅ Silhouette saved\n');

  // Run all tests
  const results = [];
  for (const test of TESTS) {
    const result = await runTest(test, silhouetteBase64);
    results.push({ ...test, ...result });
  }

  // Generate comparison HTML
  generateHTML(results);

  console.log('\n' + '='.repeat(70));
  console.log('Complete!');
  console.log('='.repeat(70));
  console.log(`\n📁 Results: ${OUTPUT_DIR}`);
  console.log(`🌐 Viewer: ${path.join(OUTPUT_DIR, 'index.html')}`);
  console.log('\nKey insight: Lower strength = more shape preservation');
  console.log('Prompt should explicitly mention maintaining shape/rectangle');
}

function generateHTML(results: Array<{name: string, strength: number, guidance: number, success: boolean, filename?: string, error?: string}>) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Button Shape Preservation Test</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a2e;
      color: #eee;
      padding: 20px;
    }
    h1 {
      text-align: center;
      margin-bottom: 10px;
      color: #fff;
    }
    .subtitle {
      text-align: center;
      color: #888;
      margin-bottom: 30px;
      font-size: 14px;
    }
    .reference {
      text-align: center;
      margin-bottom: 40px;
      padding: 20px;
      background: rgba(255,255,255,0.05);
      border-radius: 12px;
    }
    .reference img {
      max-width: 400px;
      border-radius: 8px;
      border: 3px solid #0f0;
    }
    .reference p {
      margin-top: 10px;
      color: #0f0;
      font-weight: bold;
    }
    .results {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 20px;
      max-width: 1400px;
      margin: 0 auto;
    }
    .test-card {
      background: rgba(255,255,255,0.05);
      border-radius: 12px;
      overflow: hidden;
      border: 2px solid #333;
    }
    .test-card:hover {
      border-color: #666;
    }
    .test-header {
      padding: 15px;
      background: rgba(0,0,0,0.3);
      border-bottom: 1px solid #333;
    }
    .test-name {
      font-weight: bold;
      color: #fff;
      font-size: 16px;
    }
    .test-params {
      color: #888;
      font-size: 12px;
      margin-top: 5px;
    }
    .test-image {
      padding: 20px;
      text-align: center;
    }
    .test-image img {
      max-width: 100%;
      border-radius: 8px;
      border: 1px solid #444;
    }
    .test-prompt {
      padding: 15px;
      background: rgba(0,0,0,0.2);
      font-size: 11px;
      color: #aaa;
      line-height: 1.5;
      max-height: 120px;
      overflow-y: auto;
    }
    .test-prompt strong {
      color: #888;
    }
    .legend {
      text-align: center;
      margin-top: 40px;
      padding: 20px;
      background: rgba(255,255,255,0.03);
      border-radius: 12px;
    }
    .legend h3 {
      margin-bottom: 15px;
      color: #fff;
    }
    .legend-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      text-align: left;
      max-width: 600px;
      margin: 0 auto;
      font-size: 13px;
      color: #aaa;
    }
    .check-shape {
      display: inline-block;
      padding: 3px 8px;
      background: #0f0;
      color: #000;
      font-size: 10px;
      border-radius: 4px;
      margin-left: 10px;
    }
  </style>
</head>
<body>
  <h1>🔘 Button Shape Preservation Test</h1>
  <p class="subtitle">Testing different prompts and strengths to maintain rectangular shape</p>
  
  <div class="reference">
    <img src="00_silhouette.png" alt="Input silhouette">
    <p>↑ TARGET SHAPE: Rectangular button (160×64 ratio) <span class="check-shape">CHECK AGAINST THIS</span></p>
  </div>

  <div class="results">
    ${results.filter(r => r.success).map(r => `
      <div class="test-card">
        <div class="test-header">
          <div class="test-name">${r.name}</div>
          <div class="test-params">Strength: ${r.strength} | Guidance: ${r.guidance}</div>
        </div>
        <div class="test-image">
          <img src="${r.filename}" alt="${r.name}">
        </div>
        <div class="test-prompt">
          <strong>Prompt:</strong> ${TESTS.find(t => t.name === r.name)?.prompt || ''}
          <br><br>
          <strong>Negative:</strong> ${TESTS.find(t => t.name === r.name)?.negative || ''}
        </div>
      </div>
    `).join('')}
  </div>

  <div class="legend">
    <h3>What to Look For</h3>
    <div class="legend-grid">
      <div>✅ <strong>Good:</strong> Rectangle maintains 160×64 proportions</div>
      <div>❌ <strong>Bad:</strong> Button became square or circular</div>
      <div>✅ <strong>Good:</strong> Sharp corners (90°)</div>
      <div>❌ <strong>Bad:</strong> Rounded corners</div>
      <div>✅ <strong>Good:</strong> Same size relative to canvas</div>
      <div>❌ <strong>Bad:</strong> Much larger or smaller</div>
      <div>✅ <strong>Good:</strong> "BUTTON" text visible</div>
      <div>❌ <strong>Bad:</strong> Text missing or distorted</div>
    </div>
  </div>
</body>
</html>`;

  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), html);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
