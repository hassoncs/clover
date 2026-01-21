/**
 * Visual Test Runner for Scenario.com API
 * 
 * This CLI tool tests all scenario.com API endpoints and models,
 * saving generated images locally for quality inspection.
 * 
 * Usage:
 *   hush run -- npx tsx api/src/ai/__tests__/scenario-visual-test-runner.ts
 * 
 * Or run specific tests:
 *   hush run -- npx tsx api/src/ai/__tests__/scenario-visual-test-runner.ts --models-only
 *   hush run -- npx tsx api/src/ai/__tests__/scenario-visual-test-runner.ts --api-only
 *   hush run -- npx tsx api/src/ai/__tests__/scenario-visual-test-runner.ts --model=model_retrodiffusion-plus
 */

import * as fs from 'fs';
import * as path from 'path';
import { ScenarioClient } from '../scenario';
import type { GenerationParams, Model } from '../scenario-types';

const OUTPUT_DIR = path.join(__dirname, 'output', 'scenario-visual-tests');

interface TestResult {
  testName: string;
  model: string;
  success: boolean;
  duration: number;
  outputPath?: string;
  dimensions?: { width: number; height: number };
  error?: string;
}

interface TestSuite {
  name: string;
  results: TestResult[];
  totalDuration: number;
}

const MODEL_MATRIX: Record<string, { model: string; description: string; prompt: string; width?: number; height?: number }> = {
  'character-pixel-static': {
    model: 'model_retrodiffusion-plus',
    description: 'Pixel art character (static)',
    prompt: 'pixel art knight character, 16-bit style, side view, silver armor, sword, transparent background, game sprite, clean edges',
    width: 256,
    height: 256,
  },
  'character-pixel-animated': {
    model: 'model_retrodiffusion-animation',
    description: 'Pixel art character (animated walk cycle)',
    prompt: 'pixel art knight walking animation, 6 frames, horizontal sprite sheet, 16-bit style, side view, silver armor, transparent background',
    width: 384,
    height: 64,
  },
  'character-cartoon-static': {
    model: 'model_c8zak5M1VGboxeMd8kJBr2fn',
    description: 'Cartoon character (static)',
    prompt: 'cartoon hero character, friendly face, colorful outfit, side view, transparent background, game sprite',
    width: 512,
    height: 512,
  },
  'enemy-pixel-static': {
    model: 'model_retrodiffusion-plus',
    description: 'Pixel art enemy (static)',
    prompt: 'pixel art slime monster, 16-bit style, side view, green gelatinous blob, menacing expression, transparent background, game sprite',
    width: 256,
    height: 256,
  },
  'item-pixel-static': {
    model: 'model_retrodiffusion-plus',
    description: 'Pixel art item (static)',
    prompt: 'pixel art gold coin icon, 16-bit style, centered, shiny, transparent background, game item, simple design',
    width: 64,
    height: 64,
  },
  'item-3d-static': {
    model: 'model_7v2vV6NRvm8i8jJm6DWHf6DM',
    description: '3D style item icon',
    prompt: '3D rendered treasure chest icon, gold and brown, centered, transparent background, game item',
    width: 256,
    height: 256,
  },
  'platform-pixel-static': {
    model: 'model_retrodiffusion-tile',
    description: 'Pixel art tileable platform',
    prompt: 'pixel art grass ground tile, 16-bit style, top-down view, tileable seamless pattern, game tileset, no border artifacts',
    width: 256,
    height: 256,
  },
  'background-pixel-static': {
    model: 'model_uM7q4Ms6Y5X2PXie6oA9ygRa',
    description: 'Pixel art background',
    prompt: 'pixel art forest background scene, 16-bit style, parallax-ready, trees and bushes, blue sky',
    width: 512,
    height: 256,
  },
  'background-cartoon-static': {
    model: 'model_hHuMquQ1QvEGHS1w7tGuYXud',
    description: 'Cartoon background',
    prompt: 'cartoon style sunny meadow background, colorful, cheerful atmosphere, game background',
    width: 1024,
    height: 512,
  },
  'ui-pixel-static': {
    model: 'model_mcYj5uGzXteUw6tKapsaDgBP',
    description: 'Pixel art UI element',
    prompt: 'pixel art game button, 16-bit style, green start button, clean design, transparent background',
    width: 128,
    height: 64,
  },
  'ui-flat-static': {
    model: 'model_mcYj5uGzXteUw6tKapsaDgBP',
    description: 'Flat UI element',
    prompt: 'flat design game health bar, red and green, modern minimal style, transparent background',
    width: 256,
    height: 32,
  },
};

const NEGATIVE_PROMPT = 'blurry, anti-aliasing, smooth shading, 3d render, realistic, gradients, soft edges, text, watermark';

function ensureOutputDir(): void {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

function getCredentials(): { apiKey: string; apiSecret: string } {
  const apiKey = process.env.SCENARIO_API_KEY;
  const apiSecret = process.env.SCENARIO_SECRET_API_KEY;

  if (!apiKey || !apiSecret) {
    console.error('❌ Missing Scenario.com credentials');
    console.error('Set SCENARIO_API_KEY and SCENARIO_SECRET_API_KEY environment variables');
    console.error('\nRun with: hush run -- npx tsx api/src/ai/__tests__/scenario-visual-test-runner.ts');
    process.exit(1);
  }

  return { apiKey, apiSecret };
}

async function saveImage(buffer: ArrayBuffer, filename: string): Promise<string> {
  const outputPath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(outputPath, Buffer.from(buffer));
  return outputPath;
}

async function testModelGeneration(
  client: ScenarioClient,
  testKey: string,
  config: typeof MODEL_MATRIX[string]
): Promise<TestResult> {
  const startTime = Date.now();
  const testName = `Model: ${config.description}`;

  console.log(`\n🎨 Testing ${testName}`);
  console.log(`   Model: ${config.model}`);
  console.log(`   Prompt: "${config.prompt.substring(0, 60)}..."`);

  try {
    const params: GenerationParams = {
      prompt: config.prompt,
      modelId: config.model,
      width: config.width ?? 256,
      height: config.height ?? 256,
      negativePrompt: NEGATIVE_PROMPT,
      guidance: 3.5,
      numInferenceSteps: 28,
    };

    const result = await client.generate(params);
    
    if (result.assetIds.length === 0) {
      throw new Error('No assets generated');
    }

    const assetId = result.assetIds[0];
    const { buffer, extension } = await client.downloadAsset(assetId);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${testKey}-${timestamp}${extension}`;
    const outputPath = await saveImage(buffer, filename);

    const duration = Date.now() - startTime;

    console.log(`   ✅ Success (${(duration / 1000).toFixed(1)}s)`);
    console.log(`   📁 Saved: ${path.basename(outputPath)}`);

    return {
      testName,
      model: config.model,
      success: true,
      duration,
      outputPath,
      dimensions: { width: config.width ?? 256, height: config.height ?? 256 },
    };
  } catch (err) {
    const duration = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    
    console.log(`   ❌ Failed: ${errorMessage}`);

    return {
      testName,
      model: config.model,
      success: false,
      duration,
      error: errorMessage,
    };
  }
}

async function testRemoveBackground(client: ScenarioClient): Promise<TestResult> {
  const startTime = Date.now();
  const testName = 'API: Remove Background';

  console.log(`\n🔧 Testing ${testName}`);

  try {
    const charResult = await client.generate({
      prompt: 'pixel art red apple on white background, simple, centered',
      modelId: 'model_retrodiffusion-plus',
      width: 256,
      height: 256,
    });

    if (charResult.assetIds.length === 0) {
      throw new Error('Failed to generate source image');
    }

    const sourceAssetId = charResult.assetIds[0];
    console.log(`   Generated source image: ${sourceAssetId}`);

    const removedBgAssetId = await client.removeBackground({
      image: sourceAssetId,
      format: 'png',
    });

    const { buffer, extension } = await client.downloadAsset(removedBgAssetId);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `remove-background-${timestamp}${extension}`;
    const outputPath = await saveImage(buffer, filename);

    const duration = Date.now() - startTime;

    console.log(`   ✅ Success (${(duration / 1000).toFixed(1)}s)`);
    console.log(`   📁 Saved: ${path.basename(outputPath)}`);

    return {
      testName,
      model: 'remove-background',
      success: true,
      duration,
      outputPath,
    };
  } catch (err) {
    const duration = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    
    console.log(`   ❌ Failed: ${errorMessage}`);

    return {
      testName,
      model: 'remove-background',
      success: false,
      duration,
      error: errorMessage,
    };
  }
}

async function testImg2Img(client: ScenarioClient): Promise<TestResult> {
  const startTime = Date.now();
  const testName = 'API: Image-to-Image Transform';

  console.log(`\n🔧 Testing ${testName}`);

  try {
    const sourceResult = await client.generate({
      prompt: 'pixel art knight character, 16-bit style, side view, idle pose, transparent background',
      modelId: 'model_retrodiffusion-plus',
      width: 256,
      height: 256,
    });

    if (sourceResult.assetIds.length === 0) {
      throw new Error('Failed to generate source image');
    }

    const sourceAssetId = sourceResult.assetIds[0];
    console.log(`   Generated source image: ${sourceAssetId}`);

    const img2imgResult = await client.generateImg2Img({
      prompt: 'pixel art knight character, 16-bit style, side view, running pose, transparent background',
      image: sourceAssetId,
      strength: 0.5,
      modelId: 'model_retrodiffusion-plus',
    });

    if (img2imgResult.assetIds.length === 0) {
      throw new Error('No assets generated from img2img');
    }

    const { buffer, extension } = await client.downloadAsset(img2imgResult.assetIds[0]);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `img2img-${timestamp}${extension}`;
    const outputPath = await saveImage(buffer, filename);

    const duration = Date.now() - startTime;

    console.log(`   ✅ Success (${(duration / 1000).toFixed(1)}s)`);
    console.log(`   📁 Saved: ${path.basename(outputPath)}`);

    return {
      testName,
      model: 'img2img',
      success: true,
      duration,
      outputPath,
    };
  } catch (err) {
    const duration = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    
    console.log(`   ❌ Failed: ${errorMessage}`);

    return {
      testName,
      model: 'img2img',
      success: false,
      duration,
      error: errorMessage,
    };
  }
}

async function testListModels(client: ScenarioClient): Promise<TestResult> {
  const startTime = Date.now();
  const testName = 'API: List Available Models';

  console.log(`\n🔧 Testing ${testName}`);

  try {
    const privateModels = await client.listModels(false);
    console.log(`   Found ${privateModels.length} private/custom models`);

    const publicModels = await client.listModels(true);
    console.log(`   Found ${publicModels.length} public models`);

    const modelsReport = {
      privateModels: privateModels.map((m: Model) => ({ id: m.id, name: m.name })),
      publicModels: publicModels.slice(0, 20).map((m: Model) => ({ id: m.id, name: m.name })),
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `models-list-${timestamp}.json`;
    const outputPath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(outputPath, JSON.stringify(modelsReport, null, 2));

    const duration = Date.now() - startTime;

    console.log(`   ✅ Success (${(duration / 1000).toFixed(1)}s)`);
    console.log(`   📁 Saved: ${path.basename(outputPath)}`);

    return {
      testName,
      model: 'list-models',
      success: true,
      duration,
      outputPath,
    };
  } catch (err) {
    const duration = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    
    console.log(`   ❌ Failed: ${errorMessage}`);

    return {
      testName,
      model: 'list-models',
      success: false,
      duration,
      error: errorMessage,
    };
  }
}

async function runAllTests(options: { modelsOnly?: boolean; apiOnly?: boolean; specificModel?: string }): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       Scenario.com Visual Test Runner                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const { apiKey, apiSecret } = getCredentials();
  ensureOutputDir();

  console.log(`\n📁 Output directory: ${OUTPUT_DIR}`);

  const client = new ScenarioClient({ apiKey, apiSecret });
  const suites: TestSuite[] = [];

  if (!options.apiOnly) {
    console.log('\n' + '═'.repeat(60));
    console.log('MODEL GENERATION TESTS');
    console.log('═'.repeat(60));

    const modelResults: TestResult[] = [];
    const modelStartTime = Date.now();

    const modelsToTest = options.specificModel
      ? Object.entries(MODEL_MATRIX).filter(([_, config]) => config.model === options.specificModel)
      : Object.entries(MODEL_MATRIX);

    if (modelsToTest.length === 0) {
      console.log(`\n⚠️  No models found matching: ${options.specificModel}`);
      console.log('Available models:');
      Object.entries(MODEL_MATRIX).forEach(([key, config]) => {
        console.log(`   - ${config.model} (${key})`);
      });
      return;
    }

    for (const [testKey, config] of modelsToTest) {
      const result = await testModelGeneration(client, testKey, config);
      modelResults.push(result);
    }

    suites.push({
      name: 'Model Generation',
      results: modelResults,
      totalDuration: Date.now() - modelStartTime,
    });
  }

  if (!options.modelsOnly) {
    console.log('\n' + '═'.repeat(60));
    console.log('API ENDPOINT TESTS');
    console.log('═'.repeat(60));

    const apiResults: TestResult[] = [];
    const apiStartTime = Date.now();

    apiResults.push(await testListModels(client));
    apiResults.push(await testRemoveBackground(client));
    apiResults.push(await testImg2Img(client));

    suites.push({
      name: 'API Endpoints',
      results: apiResults,
      totalDuration: Date.now() - apiStartTime,
    });
  }

  console.log('\n' + '═'.repeat(60));
  console.log('TEST SUMMARY');
  console.log('═'.repeat(60));

  let totalPassed = 0;
  let totalFailed = 0;
  let totalDuration = 0;

  for (const suite of suites) {
    const passed = suite.results.filter(r => r.success).length;
    const failed = suite.results.filter(r => !r.success).length;
    totalPassed += passed;
    totalFailed += failed;
    totalDuration += suite.totalDuration;

    console.log(`\n${suite.name}:`);
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   ⏱  Duration: ${(suite.totalDuration / 1000).toFixed(1)}s`);

    if (failed > 0) {
      console.log('\n   Failed tests:');
      suite.results
        .filter(r => !r.success)
        .forEach(r => console.log(`   - ${r.testName}: ${r.error}`));
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`TOTAL: ${totalPassed} passed, ${totalFailed} failed (${(totalDuration / 1000).toFixed(1)}s)`);
  console.log(`📁 Output saved to: ${OUTPUT_DIR}`);

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalPassed,
      totalFailed,
      totalDuration,
    },
    suites: suites.map(suite => ({
      name: suite.name,
      totalDuration: suite.totalDuration,
      results: suite.results,
    })),
  };

  const reportPath = path.join(OUTPUT_DIR, `test-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📊 Report saved to: ${path.basename(reportPath)}`);

  if (totalFailed > 0) {
    process.exit(1);
  }
}

const args = process.argv.slice(2);
const options = {
  modelsOnly: args.includes('--models-only'),
  apiOnly: args.includes('--api-only'),
  specificModel: args.find(a => a.startsWith('--model='))?.split('=')[1],
};

runAllTests(options).catch(console.error);
