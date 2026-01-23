/**
 * Silhouette → Image-to-Image Test
 * 
 * This test validates the hypothesis that using a black/white silhouette
 * as a base image for img2img generation will produce better-sized assets
 * that match the intended physics body dimensions.
 * 
 * The approach:
 * 1. Generate a silhouette image programmatically (black shape on transparent bg)
 * 2. Upload it to Scenario.com
 * 3. Use img2img to transform the silhouette into a detailed game asset
 * 4. Compare sizing accuracy vs direct txt2img generation
 * 
 * Usage:
 *   hush run -- npx tsx api/src/ai/__tests__/silhouette-img2img-test.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { ScenarioClient } from '../scenario';

const OUTPUT_DIR = path.join(__dirname, 'output', 'silhouette-tests');

interface TestCase {
  name: string;
  description: string;
  physicsShape: 'box' | 'circle';
  physicsWidth: number;
  physicsHeight: number;
  prompt: string;
  style: 'pixel' | 'cartoon';
}

interface TestResult {
  testCase: TestCase;
  silhouettePath?: string;
  txt2imgPath?: string;
  img2imgPath?: string;
  txt2imgDuration?: number;
  img2imgDuration?: number;
  success: boolean;
  error?: string;
}

const TEST_CASES: TestCase[] = [
  {
    name: 'wide-platform',
    description: 'Wide horizontal platform (4:1 ratio)',
    physicsShape: 'box',
    physicsWidth: 4,
    physicsHeight: 1,
    prompt: 'pixel art wooden platform, 16-bit style, mossy stone surface, game asset, transparent background',
    style: 'pixel',
  },
  {
    name: 'tall-pillar',
    description: 'Tall vertical pillar (1:3 ratio)',
    physicsShape: 'box',
    physicsWidth: 1,
    physicsHeight: 3,
    prompt: 'pixel art stone pillar, 16-bit style, ancient ruins, game asset, transparent background',
    style: 'pixel',
  },
  {
    name: 'square-character',
    description: 'Square character (1:1 ratio)',
    physicsShape: 'box',
    physicsWidth: 1,
    physicsHeight: 1,
    prompt: 'pixel art knight character, 16-bit style, idle pose, silver armor, game sprite, transparent background',
    style: 'pixel',
  },
  {
    name: 'circular-ball',
    description: 'Circular ball/coin',
    physicsShape: 'circle',
    physicsWidth: 1,
    physicsHeight: 1,
    prompt: 'pixel art golden coin, 16-bit style, shiny, game collectible, transparent background',
    style: 'pixel',
  },
  {
    name: 'very-wide-beam',
    description: 'Very wide beam (8:1 ratio)',
    physicsShape: 'box',
    physicsWidth: 8,
    physicsHeight: 1,
    prompt: 'pixel art metal beam, 16-bit style, industrial, game platform, transparent background',
    style: 'pixel',
  },
];

function ensureOutputDir(): void {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

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
  
  const whiteBackground = await sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  }).png().toBuffer();
  
  let shapeSvg: string;
  if (shape === 'circle') {
    const radius = Math.min(shapeWidth, shapeHeight) / 2;
    const cx = canvasSize / 2;
    const cy = canvasSize / 2;
    shapeSvg = `<svg width="${canvasSize}" height="${canvasSize}">
      <circle cx="${cx}" cy="${cy}" r="${radius}" fill="black"/>
    </svg>`;
  } else {
    shapeSvg = `<svg width="${canvasSize}" height="${canvasSize}">
      <rect x="${x}" y="${y}" width="${shapeWidth}" height="${shapeHeight}" fill="black" rx="8"/>
    </svg>`;
  }
  
  const shapeBuffer = await sharp(Buffer.from(shapeSvg)).png().toBuffer();
  
  return sharp(whiteBackground)
    .composite([{ input: shapeBuffer, blend: 'over' }])
    .png()
    .toBuffer();
}

async function runTest(client: ScenarioClient, testCase: TestCase): Promise<TestResult> {
  const timestamp = Date.now();
  console.log(`\n🧪 Testing: ${testCase.name} - ${testCase.description}`);
  console.log(`   Physics: ${testCase.physicsWidth}x${testCase.physicsHeight} (${testCase.physicsShape})`);
  
  try {
    const pngBuffer = await createSilhouettePng(
      testCase.physicsShape,
      testCase.physicsWidth,
      testCase.physicsHeight
    );
    
    const silhouettePath = path.join(OUTPUT_DIR, `${testCase.name}-silhouette-${timestamp}.png`);
    fs.writeFileSync(silhouettePath, pngBuffer);
    console.log(`   📁 Silhouette saved: ${path.basename(silhouettePath)}`);
    
    console.log(`   🎨 Generating txt2img (baseline)...`);
    const txt2imgStart = Date.now();
    const txt2imgResult = await client.generate({
      prompt: testCase.prompt,
      modelId: 'model_retrodiffusion-plus',
      width: 512,
      height: 512,
    });
    const txt2imgDuration = Date.now() - txt2imgStart;
    
    if (txt2imgResult.assetIds.length === 0) {
      throw new Error('txt2img generated no assets');
    }
    
    const { buffer: txt2imgBuffer, extension: txt2imgExt } = await client.downloadAsset(txt2imgResult.assetIds[0]);
    const txt2imgPath = path.join(OUTPUT_DIR, `${testCase.name}-txt2img-${timestamp}${txt2imgExt}`);
    fs.writeFileSync(txt2imgPath, Buffer.from(txt2imgBuffer));
    console.log(`   ✅ txt2img complete (${(txt2imgDuration / 1000).toFixed(1)}s): ${path.basename(txt2imgPath)}`);
    
    console.log(`   🎨 Uploading silhouette for img2img...`);
    const arrayBuffer = pngBuffer.buffer.slice(
      pngBuffer.byteOffset,
      pngBuffer.byteOffset + pngBuffer.byteLength
    ) as ArrayBuffer;
    const uploadedAssetId = await client.uploadAsset(arrayBuffer);
    console.log(`   📤 Uploaded silhouette: ${uploadedAssetId}`);
    
    console.log(`   🎨 Generating img2img from silhouette...`);
    const img2imgStart = Date.now();
    
    const enhancedPrompt = `${testCase.prompt}. The object should fill the exact shape shown in the reference image. Maintain the silhouette proportions exactly.`;
    
    const img2imgResult = await client.generateImg2Img({
      prompt: enhancedPrompt,
      image: uploadedAssetId,
      strength: 0.75,
      modelId: 'model_retrodiffusion-plus',
      numInferenceSteps: 28,
      guidance: 3.5,
    });
    const img2imgDuration = Date.now() - img2imgStart;
    
    if (img2imgResult.assetIds.length === 0) {
      throw new Error('img2img generated no assets');
    }
    
    const { buffer: img2imgBuffer, extension: img2imgExt } = await client.downloadAsset(img2imgResult.assetIds[0]);
    const img2imgPath = path.join(OUTPUT_DIR, `${testCase.name}-img2img-${timestamp}${img2imgExt}`);
    fs.writeFileSync(img2imgPath, Buffer.from(img2imgBuffer));
    console.log(`   ✅ img2img complete (${(img2imgDuration / 1000).toFixed(1)}s): ${path.basename(img2imgPath)}`);
    
    return {
      testCase,
      silhouettePath,
      txt2imgPath,
      img2imgPath,
      txt2imgDuration,
      img2imgDuration,
      success: true,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.log(`   ❌ Failed: ${errorMessage}`);
    return {
      testCase,
      success: false,
      error: errorMessage,
    };
  }
}

async function runStrengthComparison(client: ScenarioClient): Promise<void> {
  console.log('\n\n📊 STRENGTH PARAMETER COMPARISON');
  console.log('================================');
  console.log('Testing different strength values to find optimal setting for shape preservation\n');
  
  const testCase = TEST_CASES[0];
  const strengths = [0.3, 0.5, 0.7, 0.85, 0.95];
  const timestamp = Date.now();
  
  const pngBuffer = await createSilhouettePng(
    testCase.physicsShape,
    testCase.physicsWidth,
    testCase.physicsHeight
  );
  
  const strengthArrayBuffer = pngBuffer.buffer.slice(
    pngBuffer.byteOffset,
    pngBuffer.byteOffset + pngBuffer.byteLength
  ) as ArrayBuffer;
  const uploadedAssetId = await client.uploadAsset(strengthArrayBuffer);
  console.log(`📤 Uploaded silhouette for comparison: ${uploadedAssetId}\n`);
  
  for (const strength of strengths) {
    console.log(`🎨 Testing strength=${strength}...`);
    const start = Date.now();
    
    try {
      const result = await client.generateImg2Img({
        prompt: testCase.prompt,
        image: uploadedAssetId,
        strength,
        modelId: 'model_retrodiffusion-plus',
      });
      
      if (result.assetIds.length > 0) {
        const { buffer, extension } = await client.downloadAsset(result.assetIds[0]);
        const outputPath = path.join(OUTPUT_DIR, `strength-${strength}-${timestamp}${extension}`);
        fs.writeFileSync(outputPath, Buffer.from(buffer));
        console.log(`   ✅ Saved: ${path.basename(outputPath)} (${((Date.now() - start) / 1000).toFixed(1)}s)`);
      }
    } catch (err) {
      console.log(`   ❌ Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }
}

async function main(): Promise<void> {
  console.log('🚀 Silhouette → Image-to-Image Test Suite');
  console.log('=========================================\n');
  
  const apiKey = process.env.SCENARIO_API_KEY;
  const apiSecret = process.env.SCENARIO_SECRET_API_KEY;
  
  if (!apiKey || !apiSecret) {
    console.error('❌ Missing credentials. Set SCENARIO_API_KEY and SCENARIO_SECRET_API_KEY');
    process.exit(1);
  }
  
  ensureOutputDir();
  
  const client = new ScenarioClient({ apiKey, apiSecret });
  
  const results: TestResult[] = [];
  
  for (const testCase of TEST_CASES) {
    const result = await runTest(client, testCase);
    results.push(result);
  }
  
  await runStrengthComparison(client);
  
  console.log('\n\n📋 SUMMARY');
  console.log('==========');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`\n✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  
  if (successful.length > 0) {
    console.log('\n📊 Timing Comparison:');
    console.log('| Test Case | txt2img | img2img | Difference |');
    console.log('|-----------|---------|---------|------------|');
    for (const r of successful) {
      const txt2img = r.txt2imgDuration ? `${(r.txt2imgDuration / 1000).toFixed(1)}s` : 'N/A';
      const img2img = r.img2imgDuration ? `${(r.img2imgDuration / 1000).toFixed(1)}s` : 'N/A';
      const diff = r.txt2imgDuration && r.img2imgDuration 
        ? `${((r.img2imgDuration - r.txt2imgDuration) / 1000).toFixed(1)}s`
        : 'N/A';
      console.log(`| ${r.testCase.name.padEnd(9)} | ${txt2img.padEnd(7)} | ${img2img.padEnd(7)} | ${diff.padEnd(10)} |`);
    }
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    for (const r of failed) {
      console.log(`   - ${r.testCase.name}: ${r.error}`);
    }
  }
  
  console.log(`\n📁 Output directory: ${OUTPUT_DIR}`);
  console.log('\n🔍 NEXT STEPS:');
  console.log('   1. Compare the txt2img vs img2img outputs visually');
  console.log('   2. Check if img2img better preserves the intended aspect ratio');
  console.log('   3. Review strength comparison images to find optimal value');
  console.log('   4. If successful, integrate into AssetService');
}

main().catch(console.error);
