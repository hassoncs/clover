#!/usr/bin/env node
/**
 * Simple img2img tuning for button generation
 * Tests different strengths and prompts to find optimal settings
 * Usage: npx tsx api/scripts/tune-img2img-buttons.ts
 */

import * as path from 'path';
import * as fs from 'fs';

const OUTPUT_DIR = path.join(process.cwd(), 'debug-output/img2img-tuning');
const MODAL_ENDPOINT = 'https://hassoncs--slopcade-comfyui-comfyuiworker-web-generate.modal.run';

// Test configurations
const TESTS = [
  {
    name: 'ultra_low',
    strength: 0.55,
    prompt: 'Blue glass morphism button style, soft gradient, subtle shadows, modern UI. Transform color and texture only - maintain exact rectangular shape and proportions from input.'
  },
  {
    name: 'low_precise',
    strength: 0.62,
    prompt: 'Blue glass morphism game button with soft shadows. CRITICAL: Keep the exact same rectangular shape, dimensions, sharp corners from input image.'
  },
  {
    name: 'medium_balanced',
    strength: 0.68,
    prompt: 'Modern blue glass button with gradient. MUST preserve input silhouette: same rectangular proportions, sharp 90-degree corners, identical geometry.'
  },
  {
    name: 'medium_creative',
    strength: 0.75,
    prompt: 'Professional game UI button, blue glass theme, centered text. Input shows exact target shape - match it perfectly, apply style only.'
  },
  {
    name: 'high_style',
    strength: 0.82,
    prompt: 'Beautiful blue glass morphism button with depth and polish. Use input as exact shape template - rectangular form, sharp corners maintained.'
  }
];

async function createSilhouette(width: number, height: number): Promise<Buffer> {
  const sharp = (await import('sharp')).default;
  
  // Larger canvas - button fills more space
  const canvasSize = 512;
  const x = Math.floor((canvasSize - width) / 2);
  const y = Math.floor((canvasSize - height) / 2);
  
  // Pure black on white for maximum contrast
  const svg = `
    <svg width="${canvasSize}" height="${canvasSize}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${canvasSize}" height="${canvasSize}" fill="white"/>
      <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="black"/>
      <text x="${canvasSize/2}" y="${canvasSize/2}" 
            font-family="Arial" 
            font-size="${Math.floor(height * 0.35)}" 
            fill="#808080"
            text-anchor="middle"
            dominant-baseline="middle">BTN</text>
    </svg>
  `;
  
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function runTest(test: typeof TESTS[0]) {
  console.log(`\n🎨 Testing: ${test.name} (strength: ${test.strength})`);
  
  // Create silhouette - larger relative to canvas
  const silhouetteBuffer = await createSilhouette(256, 96);
  const silhouetteBase64 = silhouetteBuffer.toString('base64');
  
  // Save silhouette for reference (only once)
  if (test === TESTS[0]) {
    fs.writeFileSync(path.join(OUTPUT_DIR, '00_silhouette.png'), silhouetteBuffer);
  }
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(MODAL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: test.prompt,
        image_base64: silhouetteBase64,
        strength: test.strength,
        width: 512,
        height: 512,
        steps: 25,
        guidance: 2.0  // Lower guidance for Flux
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
    const filename = `${test.name}_s${test.strength}.png`;
    
    fs.writeFileSync(
      path.join(OUTPUT_DIR, filename),
      Buffer.from(data.image_base64, 'base64')
    );

    console.log(`   ✅ ${filename} (${(duration/1000).toFixed(1)}s)`);
    return { success: true, filename, ...test };
    
  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}`);
    return { success: false, error: error.message, ...test };
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('img2img Button Tuning - Finding Optimal Settings');
  console.log('='.repeat(70));
  console.log(`Output: ${OUTPUT_DIR}\n`);
  console.log('Testing different strengths with shape-preserving prompts...\n');

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Run all tests
  const results: Array<{name: string, strength: number, prompt: string, success: boolean, filename?: string, error?: string}> = [];
  for (const test of TESTS) {
    const result = await runTest(test);
    results.push(result);
  }

  // Generate simple HTML viewer
  generateHTML(results);

  console.log('\n' + '='.repeat(70));
  console.log('Tuning Complete!');
  console.log('='.repeat(70));
  console.log(`\n📁 Results: ${OUTPUT_DIR}`);
  console.log(`🌐 Open: ${path.join(OUTPUT_DIR, 'index.html')}`);
  console.log('\n💡 Compare results to find best strength/prompt combo');
  console.log('   Look for: sharp corners, rectangular shape preserved');
}

function generateHTML(results: Array<any>) {
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>img2img Button Tuning Results</title>
  <style>
    body { font-family: sans-serif; background: #1a1a2e; color: #eee; padding: 20px; }
    h1 { text-align: center; }
    .ref { text-align: center; margin: 20px 0; padding: 20px; background: rgba(255,255,255,0.1); border-radius: 8px; }
    .ref img { max-width: 400px; border: 2px solid #0f0; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; max-width: 1400px; margin: 0 auto; }
    .card { background: rgba(255,255,255,0.05); border-radius: 8px; overflow: hidden; }
    .card-header { padding: 15px; background: rgba(0,0,0,0.3); }
    .card-name { font-weight: bold; font-size: 16px; }
    .card-params { color: #888; font-size: 12px; margin-top: 5px; }
    .card img { width: 100%; display: block; }
    .legend { text-align: center; margin-top: 40px; padding: 20px; background: rgba(255,255,255,0.03); border-radius: 8px; }
    .legend h3 { color: #0f0; }
  </style>
</head>
<body>
  <h1>🔘 img2img Button Tuning Results</h1>
  
  <div class="ref">
    <img src="00_silhouette.png" alt="Input silhouette">
    <p style="color: #0f0; margin-top: 10px;">Target: Rectangular button (256x96)</p>
  </div>

  <div class="grid">
    ${results.filter(r => r.success).map(r => `
      <div class="card">
        <div class="card-header">
          <div class="card-name">${r.name}</div>
          <div class="card-params">Strength: ${r.strength}</div>
        </div>
        <img src="${r.filename}" alt="${r.name}">
      </div>
    `).join('')}
  </div>

  <div class="legend">
    <h3>What to Look For</h3>
    <p>✅ Sharp 90° corners | ✅ Rectangular proportions | ✅ Shape matches silhouette</p>
    <p>❌ Rounded corners | ❌ Different proportions | ❌ Blob/organic shape</p>
  </div>
</body>
</html>`;

  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), html);
}

main().catch(console.error);
