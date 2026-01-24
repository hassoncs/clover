/**
 * Generate silhouettes for Breakout game entities
 * 
 * Usage: npx tsx api/scripts/generate-breakout-silhouettes.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

const OUTPUT_DIR = path.join(__dirname, '..', 'debug-output', 'breakout');

interface EntitySpec {
  name: string;
  shape: 'box' | 'circle';
  width: number;
  height: number;
  prompt: string;
}

const BREAKOUT_ENTITIES: EntitySpec[] = [
  {
    name: 'ball',
    shape: 'circle',
    width: 0.5,  // diameter (2 * radius)
    height: 0.5,
    prompt: 'glowing neon ball, sci-fi arcade style, energy sphere, bright white core with cyan glow, transparent background, game asset',
  },
  {
    name: 'paddle',
    shape: 'box',
    width: 2,
    height: 0.4,
    prompt: 'futuristic paddle, sci-fi arcade style, neon cyan glowing edges, metallic surface, game asset, transparent background',
  },
  {
    name: 'brick-red',
    shape: 'box',
    width: 1.2,
    height: 0.5,
    prompt: 'neon brick block, sci-fi arcade style, glowing red/magenta, crystalline structure, game asset, transparent background',
  },
  {
    name: 'brick-yellow',
    shape: 'box',
    width: 1.2,
    height: 0.5,
    prompt: 'neon brick block, sci-fi arcade style, glowing yellow/gold, crystalline structure, game asset, transparent background',
  },
  {
    name: 'brick-green',
    shape: 'box',
    width: 1.2,
    height: 0.5,
    prompt: 'neon brick block, sci-fi arcade style, glowing green/lime, crystalline structure, game asset, transparent background',
  },
  {
    name: 'brick-blue',
    shape: 'box',
    width: 1.2,
    height: 0.5,
    prompt: 'neon brick block, sci-fi arcade style, glowing cyan/blue, crystalline structure, game asset, transparent background',
  },
];

async function createSilhouettePng(
  shape: 'box' | 'circle',
  physicsWidth: number,
  physicsHeight: number,
  canvasSize: number = 512
): Promise<Buffer> {
  const aspectRatio = physicsWidth / physicsHeight;
  
  let shapeWidth: number;
  let shapeHeight: number;
  
  if (aspectRatio >= 1) {
    shapeWidth = Math.floor(canvasSize * 0.9);
    shapeHeight = Math.floor(shapeWidth / aspectRatio);
  } else {
    shapeHeight = Math.floor(canvasSize * 0.9);
    shapeWidth = Math.floor(shapeHeight * aspectRatio);
  }
  
  const x = Math.floor((canvasSize - shapeWidth) / 2);
  const y = Math.floor((canvasSize - shapeHeight) / 2);
  
  let shapeSvg: string;
  if (shape === 'circle') {
    const radius = Math.min(shapeWidth, shapeHeight) / 2;
    const cx = canvasSize / 2;
    const cy = canvasSize / 2;
    shapeSvg = `<svg width="${canvasSize}" height="${canvasSize}">
      <rect width="${canvasSize}" height="${canvasSize}" fill="white"/>
      <circle cx="${cx}" cy="${cy}" r="${radius}" fill="black"/>
    </svg>`;
  } else {
    shapeSvg = `<svg width="${canvasSize}" height="${canvasSize}">
      <rect width="${canvasSize}" height="${canvasSize}" fill="white"/>
      <rect x="${x}" y="${y}" width="${shapeWidth}" height="${shapeHeight}" fill="black" rx="8"/>
    </svg>`;
  }
  
  return sharp(Buffer.from(shapeSvg)).png().toBuffer();
}

async function main(): Promise<void> {
  console.log('🎮 Generating Breakout Silhouettes\n');
  
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  const manifest: Array<{ name: string; silhouettePath: string; prompt: string; aspectRatio: string }> = [];
  
  for (const entity of BREAKOUT_ENTITIES) {
    console.log(`📐 ${entity.name}: ${entity.width}x${entity.height} (${entity.shape})`);
    
    const pngBuffer = await createSilhouettePng(
      entity.shape,
      entity.width,
      entity.height
    );
    
    const silhouettePath = path.join(OUTPUT_DIR, `${entity.name}-silhouette.png`);
    fs.writeFileSync(silhouettePath, pngBuffer);
    console.log(`   ✅ Saved: ${path.basename(silhouettePath)}`);
    
    manifest.push({
      name: entity.name,
      silhouettePath: path.basename(silhouettePath),
      prompt: entity.prompt,
      aspectRatio: `${entity.width}:${entity.height}`,
    });
  }
  
  const manifestPath = path.join(OUTPUT_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n📋 Manifest saved: ${manifestPath}`);
  
  console.log('\n✅ All silhouettes generated!');
  console.log(`📁 Output: ${OUTPUT_DIR}`);
  console.log('\n🎨 Next step: Run img2img on each silhouette with its prompt');
}

main().catch(console.error);
