#!/usr/bin/env node
/**
 * Generate Flappy Bird assets with silhouettes side-by-side
 * Usage: npx tsx api/scripts/generate-flappy-bird-with-silhouettes.ts
 */

import * as path from 'path';
import * as fs from 'fs';
import { createNodeAdapters } from '../src/ai/pipeline/adapters/node';

const MODAL_ENDPOINT = 'https://hassoncs--slopcade-comfyui-comfyuiworker-web-generate.modal.run';
const OUTPUT_DIR = path.join(process.cwd(), 'debug-output/flappy-bird-assets');

// Asset definitions with their silhouette specs
const assets = [
  {
    id: 'bird',
    name: 'Bird Character',
    prompt: 'A cute round bird character for a game, soft teal feathers with cream-colored belly, big expressive eyes, cheerful expression, small orange beak, tiny fluttering wings, fluffy and adorable, cartoon style, transparent background',
    width: 512,
    height: 512,
    silhouetteType: 'circle',
  },
  {
    id: 'pipe-top',
    name: 'Top Pipe',
    prompt: 'An ancient weathered stone pillar hanging from above, covered in trailing vines and emerald moss, crumbling edges with mystical runes carved into surface, ivy draping down, game platform, transparent background',
    width: 512,
    height: 1024,
    silhouetteType: 'rect',
  },
  {
    id: 'pipe-bottom',
    name: 'Bottom Pipe',
    prompt: 'An ancient weathered stone pillar rising from below, covered in climbing vines and emerald moss, crumbling edges with mystical runes carved into surface, small flowers growing from cracks, game platform, transparent background',
    width: 512,
    height: 1024,
    silhouetteType: 'rect',
  },
  {
    id: 'background',
    name: 'Background',
    prompt: 'A dreamy sky kingdom background for a flying game. Soft gradient sky from pale blue at bottom to deeper azure at top. Fluffy white clouds scattered throughout. Distant floating islands with tiny castles visible. Magical sparkles and light rays filtering through clouds. Whimsical and enchanting atmosphere.',
    width: 1024,
    height: 1024,
    silhouetteType: 'full', // Full canvas, no silhouette needed
  }
];

async function createCircleSilhouette(width: number, height: number): Promise<Buffer> {
  const sharp = (await import('sharp')).default;
  
  // Create a circle silhouette
  const size = Math.min(width, height);
  const radius = Math.floor(size * 0.4);
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="white"/>
      <circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="black"/>
    </svg>
  `;
  
  return await sharp(Buffer.from(svg))
    .resize(width, height)
    .png()
    .toBuffer();
}

async function createRectSilhouette(width: number, height: number): Promise<Buffer> {
  const sharp = (await import('sharp')).default;
  
  // Create a rectangle silhouette with some padding
  const padding = Math.min(width, height) * 0.1;
  const rectWidth = width - padding * 2;
  const rectHeight = height - padding * 2;
  
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="white"/>
      <rect x="${padding}" y="${padding}" width="${rectWidth}" height="${rectHeight}" fill="black"/>
    </svg>
  `;
  
  return await sharp(Buffer.from(svg))
    .resize(width, height)
    .png()
    .toBuffer();
}

async function generateSilhouette(asset: typeof assets[0]): Promise<Buffer | null> {
  if (asset.silhouetteType === 'full') {
    return null; // Background doesn't need a silhouette
  }
  
  console.log(`  Creating ${asset.silhouetteType} silhouette (${asset.width}x${asset.height})...`);
  
  if (asset.silhouetteType === 'circle') {
    return await createCircleSilhouette(asset.width, asset.height);
  } else {
    return await createRectSilhouette(asset.width, asset.height);
  }
}

async function generateFromSilhouette(
  asset: typeof assets[0],
  silhouetteBuffer: Buffer
): Promise<Buffer> {
  console.log(`  Calling Modal img2img...`);
  const startTime = Date.now();
  
  const response = await fetch(MODAL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: asset.prompt,
      image_base64: silhouetteBuffer.toString('base64'),
      strength: 0.85,
      width: asset.width,
      height: asset.height,
      steps: 20
    })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  
  const data = await response.json();
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  
  if (!data.success) {
    throw new Error(`Modal error: ${data.error}`);
  }
  
  console.log(`  ✅ Generated in ${duration}s`);
  return Buffer.from(data.image_base64, 'base64');
}

async function generateFromText(asset: typeof assets[0]): Promise<Buffer> {
  console.log(`  Calling Modal txt2img...`);
  const startTime = Date.now();
  
  const response = await fetch(MODAL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: asset.prompt,
      width: asset.width,
      height: asset.height,
      steps: 20
    })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  
  const data = await response.json();
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  
  if (!data.success) {
    throw new Error(`Modal error: ${data.error}`);
  }
  
  console.log(`  ✅ Generated in ${duration}s`);
  return Buffer.from(data.image_base64, 'base64');
}

async function generateAsset(asset: typeof assets[0]) {
  console.log(`\n🎨 ${asset.name} (${asset.id})`);
  console.log(`   Dimensions: ${asset.width}x${asset.height}`);
  
  const assetDir = path.join(OUTPUT_DIR, asset.id);
  fs.mkdirSync(assetDir, { recursive: true });
  
  // Step 1: Generate silhouette
  const silhouetteBuffer = await generateSilhouette(asset);
  
  if (silhouetteBuffer) {
    // Save silhouette
    const silhouettePath = path.join(assetDir, '1-silhouette.png');
    fs.writeFileSync(silhouettePath, silhouetteBuffer);
    console.log(`   💾 Saved silhouette: ${silhouettePath}`);
    
    // Step 2: Generate from silhouette
    try {
      const generatedBuffer = await generateFromSilhouette(asset, silhouetteBuffer);
      const generatedPath = path.join(assetDir, '2-generated.png');
      fs.writeFileSync(generatedPath, generatedBuffer);
      console.log(`   💾 Saved generated: ${generatedPath}`);
      
      // Create side-by-side comparison
      await createSideBySide(asset, silhouetteBuffer, generatedBuffer);
    } catch (error) {
      console.error(`   ❌ Generation failed: ${error.message}`);
    }
  } else {
    // For background (full canvas), generate directly
    console.log('   (No silhouette needed for background)');
    try {
      const generatedBuffer = await generateFromText(asset);
      const generatedPath = path.join(assetDir, 'generated.png');
      fs.writeFileSync(generatedPath, generatedBuffer);
      console.log(`   💾 Saved: ${generatedPath}`);
    } catch (error) {
      console.error(`   ❌ Generation failed: ${error.message}`);
    }
  }
}

async function createSideBySide(
  asset: typeof assets[0],
  silhouetteBuffer: Buffer,
  generatedBuffer: Buffer
): Promise<void> {
  const sharp = (await import('sharp')).default;
  
  // Create a side-by-side comparison image
  const padding = 20;
  const labelHeight = 40;
  const totalWidth = asset.width * 2 + padding * 3;
  const totalHeight = asset.height + labelHeight + padding * 2;
  
  const composite = sharp({
    create: {
      width: totalWidth,
      height: totalHeight,
      channels: 4,
      background: { r: 40, g: 40, b: 40, alpha: 255 }
    }
  });
  
  const result = await composite
    .composite([
      {
        input: silhouetteBuffer,
        left: padding,
        top: padding + labelHeight,
      },
      {
        input: generatedBuffer,
        left: padding * 2 + asset.width,
        top: padding + labelHeight,
      }
    ])
    .png()
    .toBuffer();
  
  const comparisonPath = path.join(OUTPUT_DIR, asset.id, 'comparison.png');
  fs.writeFileSync(comparisonPath, result);
  console.log(`   📊 Saved comparison: ${comparisonPath}`);
}

async function main() {
  console.log('='.repeat(70));
  console.log('Flappy Bird Asset Generation with Silhouettes');
  console.log('='.repeat(70));
  console.log(`Output directory: ${OUTPUT_DIR}\n`);
  
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  
  for (const asset of assets) {
    try {
      await generateAsset(asset);
    } catch (error) {
      console.error(`\n❌ Failed to generate ${asset.id}: ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('Generation complete!');
  console.log('='.repeat(70));
  console.log(`\n📁 All assets saved in: ${OUTPUT_DIR}`);
  console.log('\nDirectory structure:');
  for (const asset of assets) {
    if (asset.silhouetteType === 'full') {
      console.log(`  ${asset.id}/`);
      console.log(`    └── generated.png`);
    } else {
      console.log(`  ${asset.id}/`);
      console.log(`    ├── 1-silhouette.png`);
      console.log(`    ├── 2-generated.png`);
      console.log(`    └── comparison.png`);
    }
  }
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
