/**
 * Quick img2img test - validates silhouette → game asset transformation
 * Usage: hush run -- npx tsx api/src/ai/__tests__/quick-img2img-test.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { ScenarioClient } from '../scenario';

const OUTPUT_DIR = path.join(__dirname, 'output', 'silhouette-tests');

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
  console.log('🚀 Quick Silhouette → img2img Test\n');
  
  const apiKey = process.env.SCENARIO_API_KEY;
  const apiSecret = process.env.SCENARIO_SECRET_API_KEY;
  
  if (!apiKey || !apiSecret) {
    console.error('❌ Missing credentials');
    process.exit(1);
  }
  
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  const client = new ScenarioClient({ apiKey, apiSecret });
  const timestamp = Date.now();
  
  console.log('📐 Creating wide platform silhouette (4:1 ratio)...');
  const pngBuffer = await createSilhouettePng('box', 4, 1);
  
  const silhouettePath = path.join(OUTPUT_DIR, `silhouette-4x1-${timestamp}.png`);
  fs.writeFileSync(silhouettePath, pngBuffer);
  console.log(`   ✅ Saved: ${silhouettePath}`);
  
  console.log('\n📤 Uploading to Scenario.com...');
  const arrayBuffer = pngBuffer.buffer.slice(
    pngBuffer.byteOffset,
    pngBuffer.byteOffset + pngBuffer.byteLength
  ) as ArrayBuffer;
  const assetId = await client.uploadAsset(arrayBuffer);
  console.log(`   ✅ Uploaded: ${assetId}`);
  
  console.log('\n🎨 Running img2img transformation...');
  const start = Date.now();
  
  const result = await client.generateImg2Img({
    prompt: 'pixel art wooden platform, 16-bit style, mossy stone surface, game asset, transparent background. Fill the exact shape shown.',
    image: assetId,
    strength: 0.75,
    modelId: 'model_retrodiffusion-plus',
  });
  
  console.log(`   ⏱️  Took ${((Date.now() - start) / 1000).toFixed(1)}s`);
  
  if (result.assetIds.length > 0) {
    const { buffer, extension } = await client.downloadAsset(result.assetIds[0]);
    const outputPath = path.join(OUTPUT_DIR, `img2img-result-${timestamp}${extension}`);
    fs.writeFileSync(outputPath, Buffer.from(buffer));
    console.log(`   ✅ Result saved: ${outputPath}`);
    console.log('\n🎉 SUCCESS! Check the output to see if shape was preserved.');
  } else {
    console.log('   ❌ No assets generated');
  }
}

main().catch(console.error);
