#!/usr/bin/env node
/**
 * Generate tileable UI material textures for game themes
 * Usage: npx tsx api/scripts/generate-ui-textures.ts [theme-name]
 */

import * as path from 'path';
import * as fs from 'fs';

const OUTPUT_DIR = path.join(process.cwd(), 'debug-output/ui-textures');
const MODAL_ENDPOINT = 'https://hassoncs--slopcade-comfyui-comfyuiworker-web-generate.modal.run';

// Game themes and their material styles
const THEMES: Record<string, { materials: string[], aesthetic: string }> = {
  'arcade': {
    materials: ['painted metal', 'brushed aluminum', 'neon plastic'],
    aesthetic: 'retro arcade, vibrant colors, glossy finish, 80s synthwave'
  },
  'fantasy': {
    materials: ['weathered stone', 'ancient metal', 'leather', 'parchment'],
    aesthetic: 'medieval fantasy, runic engravings, magical glow, aged patina'
  },
  'scifi': {
    materials: ['carbon fiber', 'brushed steel', 'holographic panel', 'matte black metal'],
    aesthetic: 'futuristic sci-fi, clean lines, HUD interface, military tech'
  },
  'candy': {
    materials: ['glossy plastic', 'sugar glaze', 'soft rubber'],
    aesthetic: 'cute candy world, pastel colors, shiny sweet surfaces, kawaii'
  },
  'nature': {
    materials: ['polished wood', 'smooth stone', 'woven bamboo'],
    aesthetic: 'organic natural, earthy tones, smooth polished surfaces, zen minimal'
  },
  'cyberpunk': {
    materials: ['rusted metal', 'grime concrete', 'neon-lit circuit board'],
    aesthetic: 'cyberpunk dystopia, neon accents, worn industrial, tech-noir'
  }
};

async function generateTexture(
  themeName: string, 
  material: string, 
  aesthetic: string,
  variation: number
): Promise<{ success: boolean; filename?: string; error?: string }> {
  const filename = `${themeName}_${material.replace(/\s+/g, '_')}_v${variation}.png`;
  
  // Seamless texture prompt
  const prompt = `Seamless tileable texture, repeatable pattern with no visible seams, flat even lighting with no shadows or highlights, orthographic top-down material swatch. ${material} in ${aesthetic} style. High frequency detail suitable for UI tiling. No text, no symbols, no UI elements, no borders, no frames, no vignette, no watermark, no central focal point, uniform distribution across entire image`;

  console.log(`  Generating: ${filename}`);
  const startTime = Date.now();

  try {
    const response = await fetch(MODAL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        width: 512,
        height: 512,
        steps: 25,
        guidance: 2.0
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error);
    }

    fs.writeFileSync(
      path.join(OUTPUT_DIR, filename),
      Buffer.from(data.image_base64, 'base64')
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`   ✅ ${filename} (${duration}s)`);
    return { success: true, filename };
    
  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  const targetTheme = process.argv[2];
  
  console.log('='.repeat(70));
  console.log('UI Material Texture Generation');
  console.log('='.repeat(70));
  console.log(`Output: ${OUTPUT_DIR}\n`);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const themesToProcess = targetTheme 
    ? { [targetTheme]: THEMES[targetTheme] }
    : THEMES;

  if (targetTheme && !THEMES[targetTheme]) {
    console.error(`Unknown theme: ${targetTheme}`);
    console.log(`Available themes: ${Object.keys(THEMES).join(', ')}`);
    process.exit(1);
  }

  const results: Array<{ theme: string, material: string, variation: number, success: boolean, filename?: string, error?: string }> = [];

  for (const [themeName, theme] of Object.entries(themesToProcess)) {
    console.log(`\n🎨 Theme: ${themeName}`);
    console.log(`   Aesthetic: ${theme.aesthetic}`);
    
    for (const material of theme.materials) {
      // Generate 2 variations per material
      for (let v = 1; v <= 2; v++) {
        const result = await generateTexture(themeName, material, theme.aesthetic, v);
        results.push({ theme: themeName, material, variation: v, ...result });
      }
    }
  }

  // Generate summary
  generateSummary(results);

  console.log('\n' + '='.repeat(70));
  console.log('Texture Generation Complete!');
  console.log('='.repeat(70));
  console.log(`\n📁 Total textures: ${results.filter(r => r.success).length}/${results.length}`);
  console.log(`📂 Location: ${OUTPUT_DIR}`);
  console.log('\n💡 Next steps:');
  console.log('   1. Check textures for seamless tiling');
  console.log('   2. Import into Godot with Repeat enabled');
  console.log('   3. Apply the StyledButton shader');
}

function generateSummary(results: Array<any>) {
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>UI Texture Gallery</title>
  <style>
    body { font-family: sans-serif; background: #1a1a2e; color: #eee; padding: 20px; }
    h1 { text-align: center; }
    .theme { margin: 40px 0; }
    .theme-title { color: #0f0; font-size: 24px; margin-bottom: 10px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; }
    .texture { text-align: center; }
    .texture img { width: 100%; height: 200px; object-fit: cover; border-radius: 8px; border: 2px solid #444; }
    .texture-name { margin-top: 8px; font-size: 12px; color: #888; }
    .check { color: #0f0; }
  </style>
</head>
<body>
  <h1>🎨 UI Material Texture Gallery</h1>
  <p style="text-align: center; color: #888;">Tileable seamless textures for Godot UI shaders</p>
  
  ${Object.entries(THEMES).map(([themeName, theme]) => {
    const themeResults = results.filter(r => r.theme === themeName && r.success);
    if (themeResults.length === 0) return '';
    return `
      <div class="theme">
        <div class="theme-title">${themeName}</div>
        <div class="grid">
          ${themeResults.map(r => `
            <div class="texture">
              <img src="${r.filename}" alt="${r.material}">
              <div class="texture-name">${r.material} v${r.variation}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('')}
  
  <div style="text-align: center; margin-top: 40px; padding: 20px; background: rgba(255,255,255,0.05); border-radius: 8px;">
    <h3>✅ Seamless Tiling Check</h3>
    <p>Open each texture and look for visible seams when tiled 3x3</p>
    <p>Good textures should have no obvious repetition patterns</p>
  </div>
</body>
</html>`;

  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), html);
}

main().catch(console.error);
