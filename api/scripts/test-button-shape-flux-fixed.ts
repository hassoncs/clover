#!/usr/bin/env node
/**
 * Button shape preservation test - Flux-fixed version
 * Usage: npx tsx api/scripts/test-button-shape-flux-fixed.ts
 */

import { createNinePatchSilhouette } from '../src/ai/pipeline/silhouettes/ui-component';
import * as path from 'path';
import * as fs from 'fs';

const OUTPUT_DIR = path.join(process.cwd(), 'debug-output/button-shape-flux-fixed');
const MODAL_ENDPOINT = 'https://hassoncs--slopcade-comfyui-comfyuiworker-web-generate.modal.run';

// Test with proper Flux settings (no negative prompt, lower guidance)
const TESTS = [
  {
    name: 'ultra_low_50',
    strength: 0.50,
    guidance: 1.5,
    prompt: 'Style transfer: Transform this exact rectangular button silhouette into a blue glass morphism button. CRITICAL: Maintain identical rectangular shape, dimensions, and proportions. Preserve sharp 90-degree corners. Same size, same shape, only change colors and add subtle shadows.'
  },
  {
    name: 'low_55_shape_emphasis',
    strength: 0.55,
    guidance: 1.5,
    prompt: 'Rectangular game button with blue gradient, glass morphism effect. MUST preserve exact input shape: rectangular proportions, sharp corners, same dimensions. Apply style only, zero geometry change.'
  },
  {
    name: 'medium_60_precise',
    strength: 0.60,
    guidance: 2.0,
    prompt: 'Professional game UI button with blue glass theme, soft shadows, "BUTTON" text. Shape preservation mandatory: identical rectangular silhouette, sharp corners maintained, exact proportions preserved.'
  },
  {
    name: 'high_65_detailed',
    strength: 0.65,
    guidance: 2.0,
    prompt: 'Modern blue button with glass morphism aesthetic, centered "BUTTON" text, subtle depth. Input shape is rectangular with sharp corners - output must match exactly. No rounding, no distortion, identical geometry.'
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
    const filename = `${test.name}_s${test.strength}_g${test.guidance}.png`;
    
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
  console.log('Button Shape Test - Flux Fixed (No Negative, Lower Guidance)');
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

  // Run all tests
  const results = [];
  for (const test of TESTS) {
    const result = await runTest(test, silhouetteBase64);
    results.push(result);
  }

  // Generate comparison HTML
  generateHTML(results);

  console.log('\n' + '='.repeat(70));
  console.log('Complete!');
  console.log('='.repeat(70));
  console.log(`\n📁 Results: ${OUTPUT_DIR}`);
  console.log(`🌐 Viewer: ${path.join(OUTPUT_DIR, 'index.html')}`);
  console.log('\n💡 Key changes:');
  console.log('   - Fixed: Empty negative prompt (Flux ignores negatives)');
  console.log('   - Fixed: Guidance capped at 2.0 (Flux works better with lower CFG)');
  console.log('   - Prompts explicitly emphasize shape preservation');
}

function generateHTML(results: Array<{name: string, strength: number, guidance: number, success: boolean, filename?: string, error?: string, prompt: string}>) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Button Shape Test - Flux Fixed</title>
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
      margin-bottom: 10px;
      font-size: 14px;
    }
    .fix-note {
      text-align: center;
      color: #0f0;
      margin-bottom: 30px;
      font-size: 13px;
    }
    .reference {
      text-align: center;
      margin-bottom: 40px;
      padding: 20px;
      background: rgba(0,255,0,0.1);
      border: 2px solid #0f0;
      border-radius: 12px;
    }
    .reference img {
      max-width: 400px;
      border-radius: 8px;
    }
    .reference p {
      margin-top: 10px;
      color: #0f0;
      font-weight: bold;
    }
    .results {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
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
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .test-name {
      font-weight: bold;
      color: #fff;
      font-size: 16px;
    }
    .test-params {
      color: #888;
      font-size: 12px;
    }
    .test-image {
      padding: 20px;
      text-align: center;
      background: #222;
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
      max-height: 100px;
      overflow-y: auto;
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
  </style>
</head>
<body>
  <h1>🔘 Button Shape Test - Flux Fixed</h1>
  <p class="subtitle">Testing shape preservation with fixed Flux workflow</p>
  <p class="fix-note">✓ Fixed: Empty negative prompt | ✓ Fixed: Lower guidance (1.5-2.0)</p>
  
  <div class="reference">
    <img src="00_SILHOUETTE.png" alt="Input silhouette">
    <p>↑ TARGET: Rectangular button (160×64 ratio) with sharp corners</p>
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
          ${r.prompt}
        </div>
      </div>
    `).join('')}
  </div>

  <div class="legend">
    <h3>What to Look For</h3>
    <div class="legend-grid">
      <div>✅ <strong>Good:</strong> Maintains rectangular 160×64 proportions</div>
      <div>❌ <strong>Bad:</strong> Became square, round, or blob</div>
      <div>✅ <strong>Good:</strong> Sharp 90° corners preserved</div>
      <div>❌ <strong>Bad:</strong> Corners became rounded</div>
      <div>✅ <strong>Good:</strong> Same size relative to canvas</div>
      <div>❌ <strong>Bad:</strong> Much larger/smaller than silhouette</div>
      <div>✅ <strong>Good:</strong> "BUTTON" text visible</div>
      <div>❌ <strong>Bad:</strong> Text missing or unreadable</div>
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
