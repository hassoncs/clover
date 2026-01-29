#!/usr/bin/env node
/**
 * Generate button with strength/guidance matrix for tuning
 * Usage: npx tsx api/scripts/generate-button-matrix.ts
 */

import { createNodeAdapters, createFileDebugSink } from '../src/ai/pipeline/adapters/node';
import { createNinePatchSilhouette } from '../src/ai/pipeline/silhouettes/ui-component';
import * as path from 'path';
import * as fs from 'fs';

const OUTPUT_DIR = path.join(process.cwd(), 'debug-output/button-matrix');
const MODAL_ENDPOINT = process.env.MODAL_ENDPOINT ?? 'https://hassoncs--slopcade-comfyui-comfyuiworker-web-generate.modal.run';

// Test matrix
const STRENGTHS = [0.60, 0.68, 0.75, 0.82];
const GUIDANCES = [3.0, 4.0, 5.0];

const PROMPT = 'A modern glass morphism game button with blue gradient, soft shadows, rounded corners, "BUTTON" text in center';

async function generateMatrix() {
  console.log('='.repeat(70));
  console.log('Button Generation Matrix - Strength vs Guidance');
  console.log('='.repeat(70));
  console.log(`Output: ${OUTPUT_DIR}\n`);
  console.log(`Testing ${STRENGTHS.length} strengths × ${GUIDANCES.length} guidances = ${STRENGTHS.length * GUIDANCES.length} combinations\n`);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Generate silhouette once
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
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'silhouette.png'), Buffer.from(silhouettePng));
  console.log('✅ Silhouette saved\n');

  const results: Array<{strength: number, guidance: number, filename: string, duration: number}> = [];

  // Generate matrix
  for (const strength of STRENGTHS) {
    for (const guidance of GUIDANCES) {
      console.log(`Generating: strength=${strength.toFixed(2)}, guidance=${guidance.toFixed(1)}`);
      
      const startTime = Date.now();
      
      try {
        const response = await fetch(MODAL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: PROMPT,
            image_base64: Buffer.from(silhouettePng).toString('base64'),
            strength,
            guidance,
            width: 512,
            height: 512,
            steps: 20
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
        const filename = `s${strength.toFixed(2)}_g${guidance.toFixed(1)}.png`;
        
        fs.writeFileSync(
          path.join(OUTPUT_DIR, filename),
          Buffer.from(data.image_base64, 'base64')
        );

        results.push({strength, guidance, filename, duration});
        console.log(`  ✅ Saved: ${filename} (${(duration/1000).toFixed(1)}s)\n`);
        
      } catch (error) {
        console.error(`  ❌ Failed: ${error.message}\n`);
      }
    }
  }

  // Generate HTML viewer
  generateHTML(results);
  
  console.log('='.repeat(70));
  console.log('Matrix complete!');
  console.log('='.repeat(70));
  console.log(`\n📁 Results: ${OUTPUT_DIR}`);
  console.log(`🌐 Open: ${path.join(OUTPUT_DIR, 'index.html')}`);
}

function generateHTML(results: Array<{strength: number, guidance: number, filename: string, duration: number}>) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Button Generation Matrix</title>
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
      margin-bottom: 30px;
      padding: 20px;
      background: rgba(255,255,255,0.05);
      border-radius: 12px;
    }
    .reference img {
      max-width: 300px;
      border-radius: 8px;
      border: 2px solid #444;
    }
    .reference p {
      margin-top: 10px;
      color: #888;
    }
    .matrix {
      display: grid;
      grid-template-columns: 100px repeat(${GUIDANCES.length}, 1fr);
      gap: 15px;
      max-width: 1400px;
      margin: 0 auto;
    }
    .header-cell {
      font-weight: 600;
      color: #888;
      text-align: center;
      padding: 10px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .row-label {
      font-weight: 600;
      color: #888;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 15px;
      font-size: 12px;
    }
    .cell {
      position: relative;
      background: rgba(255,255,255,0.03);
      border-radius: 12px;
      overflow: hidden;
      transition: transform 0.2s;
      cursor: pointer;
    }
    .cell:hover {
      transform: scale(1.02);
      background: rgba(255,255,255,0.06);
    }
    .cell img {
      width: 100%;
      height: auto;
      display: block;
    }
    .cell-info {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(transparent, rgba(0,0,0,0.8));
      padding: 30px 10px 10px;
      font-size: 11px;
      opacity: 0;
      transition: opacity 0.2s;
    }
    .cell:hover .cell-info {
      opacity: 1;
    }
    .comparison {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.95);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 40px;
    }
    .comparison.active {
      display: flex;
    }
    .comparison-content {
      display: flex;
      gap: 40px;
      align-items: center;
    }
    .comparison-side {
      text-align: center;
    }
    .comparison-side img {
      max-width: 400px;
      max-height: 400px;
      border-radius: 12px;
      border: 2px solid #444;
    }
    .comparison-side p {
      margin-top: 15px;
      color: #888;
      font-size: 14px;
    }
    .vs {
      font-size: 24px;
      font-weight: bold;
      color: #666;
    }
    .close-btn {
      position: absolute;
      top: 20px;
      right: 20px;
      background: #333;
      border: none;
      color: #fff;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 20px;
    }
    .close-btn:hover {
      background: #555;
    }
    .legend {
      text-align: center;
      margin-top: 40px;
      color: #666;
      font-size: 12px;
    }
    .legend strong {
      color: #888;
    }
  </style>
</head>
<body>
  <h1>🔘 Button Generation Matrix</h1>
  <p class="subtitle">Comparing Strength (shape preservation) vs Guidance (prompt adherence)</p>
  
  <div class="reference">
    <img src="silhouette.png" alt="Input silhouette">
    <p>↑ Input Silhouette</p>
  </div>

  <div class="matrix">
    <div class="header-cell"></div>
    ${GUIDANCES.map(g => `<div class="header-cell">Guidance: ${g.toFixed(1)}</div>`).join('')}
    
    ${STRENGTHS.map(s => `
      <div class="row-label">Strength: ${s.toFixed(2)}</div>
      ${GUIDANCES.map(g => {
        const result = results.find(r => r.strength === s && r.guidance === g);
        if (!result) return `<div class="cell" style="background:#300"></div>`;
        return `
          <div class="cell" onclick="showComparison(${s}, ${g})">
            <img src="${result.filename}" alt="s=${s}, g=${g}">
            <div class="cell-info">
              ${result.duration/1000}s
            </div>
          </div>
        `;
      }).join('')}
    `).join('')}
  </div>

  <div class="legend">
    <strong>Strength:</strong> Lower = more like silhouette, Higher = more creative freedom<br>
    <strong>Guidance:</strong> Lower = more artistic interpretation, Higher = strict prompt following
  </div>

  <div class="comparison" id="comparison" onclick="closeComparison()">
    <button class="close-btn">×</button>
    <div class="comparison-content" onclick="event.stopPropagation()">
      <div class="comparison-side">
        <img src="silhouette.png" alt="Silhouette">
        <p>Original Silhouette</p>
      </div>
      <div class="vs">→</div>
      <div class="comparison-side">
        <img id="result-img" src="" alt="Result">
        <p id="result-info"></p>
      </div>
    </div>
  </div>

  <script>
    function showComparison(strength, guidance) {
      const filename = 's' + strength.toFixed(2) + '_g' + guidance.toFixed(1) + '.png';
      document.getElementById('result-img').src = filename;
      document.getElementById('result-info').textContent = 
        'Strength: ' + strength.toFixed(2) + ', Guidance: ' + guidance.toFixed(1);
      document.getElementById('comparison').classList.add('active');
    }
    
    function closeComparison() {
      document.getElementById('comparison').classList.remove('active');
    }
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeComparison();
    });
  </script>
</body>
</html>`;

  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), html);
  console.log('✅ HTML viewer generated\n');
}

generateMatrix().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
