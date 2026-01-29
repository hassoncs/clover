#!/usr/bin/env node
/**
 * ControlNet Canny button generation - optimized silhouettes
 * Usage: npx tsx api/scripts/generate-button-controlnet.ts
 */

import * as path from 'path';
import * as fs from 'fs';

const OUTPUT_DIR = path.join(process.cwd(), 'debug-output/button-controlnet');
const MODAL_ENDPOINT = 'https://hassoncs--slopcade-comfyui-comfyuiworker-web-controlnet.modal.run';

// Create a silhouette optimized for Canny edge detection
async function createCannySilhouette(width: number, height: number, canvasSize: number = 512): Promise<Buffer> {
  const sharp = (await import('sharp')).default;
  
  // Center the button on canvas
  const x = Math.floor((canvasSize - width) / 2);
  const y = Math.floor((canvasSize - height) / 2);
  
  // Create pure black rectangle on white background
  // Canny works best with high contrast edges
  const svg = `
    <svg width="${canvasSize}" height="${canvasSize}" xmlns="http://www.w3.org/2000/svg">
      <!-- White background -->
      <rect width="${canvasSize}" height="${canvasSize}" fill="white"/>
      <!-- Black button shape - sharp edges for Canny -->
      <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="black"/>
      <!-- "BUTTON" text hint in gray (won't be detected by Canny but guides the AI) -->
      <text x="${canvasSize/2}" y="${canvasSize/2}" 
            font-family="Arial, sans-serif" 
            font-size="${Math.floor(height * 0.4)}" 
            font-weight="bold"
            fill="#808080"
            text-anchor="middle"
            dominant-baseline="middle">BUTTON</text>
    </svg>
  `;
  
  return sharp(Buffer.from(svg)).png().toBuffer();
}

// Test configurations
const TESTS = [
  {
    name: 'small_button',
    width: 160,
    height: 64,
    control_strength: 0.7,
    prompt: 'A modern blue glass morphism game button with soft shadows, professional UI design'
  },
  {
    name: 'medium_button', 
    width: 256,
    height: 96,
    control_strength: 0.7,
    prompt: 'A modern blue glass morphism game button with soft shadows, professional UI design'
  },
  {
    name: 'large_button',
    width: 384,
    height: 128,
    control_strength: 0.7,
    prompt: 'A modern blue glass morphism game button with soft shadows, professional UI design'
  },
  {
    name: 'strong_control',
    width: 256,
    height: 96,
    control_strength: 0.9,
    prompt: 'A modern blue glass morphism game button with soft shadows, professional UI design'
  },
  {
    name: 'weak_control',
    width: 256,
    height: 96,
    control_strength: 0.5,
    prompt: 'A modern blue glass morphism game button with soft shadows, professional UI design'
  }
];

async function runTest(test: typeof TESTS[0]) {
  console.log(`\n🎨 ${test.name}`);
  console.log(`   Size: ${test.width}x${test.height}, Control: ${test.control_strength}`);
  
  // Create silhouette
  const silhouetteBuffer = await createCannySilhouette(test.width, test.height);
  const silhouetteBase64 = silhouetteBuffer.toString('base64');
  
  // Save silhouette for reference
  fs.writeFileSync(path.join(OUTPUT_DIR, `${test.name}_silhouette.png`), silhouetteBuffer);
  
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
    const filename = `${test.name}_result.png`;
    
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
  console.log('ControlNet Canny Button Generation');
  console.log('='.repeat(70));
  console.log(`Output: ${OUTPUT_DIR}\n`);
  console.log('How ControlNet Canny works:');
  console.log('  1. Canny edge detector finds edges in your silhouette');
  console.log('  2. ControlNet forces Flux to follow those edges');
  console.log('  3. Higher control_strength = stricter shape adherence\n');

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Run tests
  const results: Array<{name: string, width: number, height: number, control_strength: number, prompt: string, success: boolean, filename?: string, error?: string}> = [];
  for (const test of TESTS) {
    const result = await runTest(test);
    results.push(result);
  }

  // Generate comparison HTML
  generateHTML(results);

  console.log('\n' + '='.repeat(70));
  console.log('Complete!');
  console.log('='.repeat(70));
  console.log(`\n📁 Results: ${OUTPUT_DIR}`);
  console.log(`🌐 Viewer: ${path.join(OUTPUT_DIR, 'index.html')}`);
  
  console.log('\n📚 What we tested:');
  console.log('  • Different button sizes (160x64 to 384x128)');
  console.log('  • Different control strengths (0.5 to 0.9)');
  console.log('  • High-contrast silhouettes (black on white)');
  
  console.log('\n💡 Tips for best results:');
  console.log('  • Use control_strength 0.6-0.8 for good balance');
  console.log('  • Make silhouette fill 30-60% of canvas');
  console.log('  • Pure black shape on pure white background works best');
  console.log('  • Add text hints in gray (not black/white) to guide AI');
}

function generateHTML(results: Array<{name: string, width: number, height: number, control_strength: number, prompt: string, success: boolean, filename?: string, error?: string}>) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ControlNet Canny Results</title>
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
    .explanation {
      background: rgba(255,255,255,0.05);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 30px;
      max-width: 800px;
      margin-left: auto;
      margin-right: auto;
    }
    .explanation h3 {
      color: #0f0;
      margin-bottom: 10px;
    }
    .explanation p {
      color: #aaa;
      line-height: 1.6;
      margin-bottom: 10px;
    }
    .explanation code {
      background: rgba(0,0,0,0.3);
      padding: 2px 6px;
      border-radius: 4px;
      color: #fff;
    }
    .results {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
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
    .comparison {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      padding: 15px;
    }
    .image-side {
      text-align: center;
    }
    .image-side img {
      max-width: 100%;
      border-radius: 8px;
      border: 1px solid #444;
    }
    .image-side .label {
      margin-top: 8px;
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
    }
    .legend {
      text-align: center;
      margin-top: 40px;
      padding: 20px;
      background: rgba(255,255,255,0.03);
      border-radius: 12px;
      max-width: 800px;
      margin-left: auto;
      margin-right: auto;
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
      font-size: 13px;
      color: #aaa;
    }
  </style>
</head>
<body>
  <h1>🔘 ControlNet Canny Button Generation</h1>
  <p class="subtitle">Testing silhouette preservation with different sizes and control strengths</p>
  
  <div class="explanation">
    <h3>How It Works</h3>
    <p><strong>ControlNet Canny</strong> uses edge detection to preserve your silhouette shape:</p>
    <p>1. <strong>Canny Edge Detection:</strong> Finds edges in your silhouette image<br>
       2. <strong>ControlNet:</strong> Forces Flux to follow those edges during generation<br>
       3. <strong>Control Strength:</strong> How strictly to follow the edges (0.0 = ignore, 1.0 = strict)</p>
    <p><strong>Optimal silhouette:</strong> Black shape on white background with sharp edges. Avoid internal colors/gradients - they confuse the edge detector.</p>
  </div>

  <div class="results">
    ${results.filter((r: {success: boolean}) => r.success).map((r: {name: string, width: number, height: number, control_strength: number, filename?: string}) => `
      <div class="test-card">
        <div class="test-header">
          <div class="test-name">${r.name}</div>
          <div class="test-params">Size: ${r.width}x${r.height} | Control: ${r.control_strength}</div>
        </div>
        <div class="comparison">
          <div class="image-side">
            <img src="${r.name}_silhouette.png" alt="Silhouette">
            <div class="label">Input Silhouette</div>
          </div>
          <div class="image-side">
            <img src="${r.filename}" alt="Result">
            <div class="label">ControlNet Output</div>
          </div>
        </div>
      </div>
    `).join('')}
  </div>

  <div class="legend">
    <h3>What to Look For</h3>
    <div class="legend-grid">
      <div>✅ <strong>Good:</strong> Output matches silhouette shape exactly</div>
      <div>❌ <strong>Bad:</strong> Shape is distorted or rounded</div>
      <div>✅ <strong>Good:</strong> Sharp corners preserved</div>
      <div>❌ <strong>Bad:</strong> Corners became rounded</div>
      <div>✅ <strong>Good:</strong> Button size matches silhouette</div>
      <div>❌ <strong>Bad:</strong> Much larger or smaller</div>
      <div>✅ <strong>Good:</strong> Style applied (color, texture)</div>
      <div>❌ <strong>Bad:</strong> Looks just like silhouette</div>
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
