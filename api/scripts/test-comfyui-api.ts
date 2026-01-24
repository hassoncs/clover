#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';
import { createComfyUIClient } from '../src/ai/comfyui';

async function main() {
  const apiKey = process.env.RUNPOD_API_KEY;
  const endpointId = process.env.RUNPOD_COMFYUI_ENDPOINT_ID;

  if (!apiKey || !endpointId) {
    console.error('Error: Required environment variables:');
    console.error('  RUNPOD_API_KEY - Your RunPod API key');
    console.error('  RUNPOD_COMFYUI_ENDPOINT_ID - Your custom ComfyUI endpoint ID');
    console.log('\nUsage:');
    console.log('  pnpm hush run -- npx tsx api/scripts/test-comfyui-api.ts "A pixel art knight"');
    process.exit(1);
  }

  console.log('ComfyUI API Test');
  console.log('=================');
  console.log(`Endpoint ID: ${endpointId}`);
  console.log('');

  const client = createComfyUIClient({
    RUNPOD_API_KEY: apiKey,
    RUNPOD_ENDPOINT_ID: endpointId,
  });

  const outputDir = path.join(__dirname, '..', 'debug-output', 'comfyui-test');
  fs.mkdirSync(outputDir, { recursive: true });

  const prompt = process.argv[2] || 'A cute pixel art cat, 16-bit style, game sprite';
  const testMode = process.argv[3] || 'txt2img';

  console.log(`Prompt: "${prompt}"`);
  console.log(`Mode: ${testMode}`);
  console.log('');

  const startTime = Date.now();

  try {
    if (testMode === 'txt2img') {
      console.log('Generating image (txt2img)...');
      console.log('(First request may take 30-60s for cold start)');
      
      const result = await client.txt2img({
        prompt,
        width: 512,
        height: 512,
        steps: 20,
        guidance: 3.5,
      });

      const elapsed = Date.now() - startTime;
      console.log(`Done in ${(elapsed / 1000).toFixed(1)}s`);
      console.log(`Asset ID: ${result.assetId}`);

      const { buffer } = await client.downloadImage(result.assetId);
      const outputPath = path.join(outputDir, `txt2img-${Date.now()}.png`);
      fs.writeFileSync(outputPath, Buffer.from(buffer));
      console.log(`Saved to: ${outputPath}`);

      console.log('\n✅ txt2img test passed!');
    } else if (testMode === 'img2img') {
      const inputPath = process.argv[4];
      if (!inputPath) {
        console.error('Error: img2img mode requires an input image path');
        console.log('Usage: ... test-comfyui-api.ts "prompt" img2img /path/to/image.png');
        process.exit(1);
      }

      console.log(`Input image: ${inputPath}`);
      console.log('Generating image (img2img)...');

      const inputBuffer = fs.readFileSync(inputPath);
      const inputBase64 = inputBuffer.toString('base64');

      const result = await client.img2img({
        image: inputBase64,
        prompt,
        strength: 0.6,
        steps: 20,
        guidance: 3.5,
      });

      const elapsed = Date.now() - startTime;
      console.log(`Done in ${(elapsed / 1000).toFixed(1)}s`);

      const { buffer } = await client.downloadImage(result.assetId);
      const outputPath = path.join(outputDir, `img2img-${Date.now()}.png`);
      fs.writeFileSync(outputPath, Buffer.from(buffer));
      console.log(`Saved to: ${outputPath}`);

      console.log('\n✅ img2img test passed!');
    } else if (testMode === 'rmbg') {
      const inputPath = process.argv[4];
      if (!inputPath) {
        console.error('Error: rmbg mode requires an input image path');
        console.log('Usage: ... test-comfyui-api.ts "" rmbg /path/to/image.png');
        process.exit(1);
      }

      console.log(`Input image: ${inputPath}`);
      console.log('Removing background...');

      const inputBuffer = fs.readFileSync(inputPath);
      const inputBase64 = inputBuffer.toString('base64');

      const result = await client.removeBackground({
        image: inputBase64,
      });

      const elapsed = Date.now() - startTime;
      console.log(`Done in ${(elapsed / 1000).toFixed(1)}s`);

      const { buffer } = await client.downloadImage(result.assetId);
      const outputPath = path.join(outputDir, `rmbg-${Date.now()}.png`);
      fs.writeFileSync(outputPath, Buffer.from(buffer));
      console.log(`Saved to: ${outputPath}`);

      console.log('\n✅ Background removal test passed!');
    } else if (testMode === 'full') {
      console.log('Running full pipeline test: txt2img → img2img → rmbg');
      console.log('(First request may take 30-60s for cold start)');
      console.log('');

      console.log('Step 1/3: txt2img...');
      const txt2imgResult = await client.txt2img({
        prompt,
        width: 512,
        height: 512,
        steps: 20,
        guidance: 3.5,
      });
      const step1Time = Date.now() - startTime;
      console.log(`  Done in ${(step1Time / 1000).toFixed(1)}s`);

      const { buffer: txt2imgBuffer } = await client.downloadImage(txt2imgResult.assetId);
      const txt2imgPath = path.join(outputDir, `full-1-txt2img-${Date.now()}.png`);
      fs.writeFileSync(txt2imgPath, Buffer.from(txt2imgBuffer));
      console.log(`  Saved: ${txt2imgPath}`);

      console.log('Step 2/3: img2img (refine)...');
      const step2Start = Date.now();
      const img2imgResult = await client.img2img({
        image: txt2imgResult.assetId,
        prompt: `${prompt}, highly detailed, refined`,
        strength: 0.4,
        steps: 20,
        guidance: 3.5,
      });
      const step2Time = Date.now() - step2Start;
      console.log(`  Done in ${(step2Time / 1000).toFixed(1)}s`);

      const { buffer: img2imgBuffer } = await client.downloadImage(img2imgResult.assetId);
      const img2imgPath = path.join(outputDir, `full-2-img2img-${Date.now()}.png`);
      fs.writeFileSync(img2imgPath, Buffer.from(img2imgBuffer));
      console.log(`  Saved: ${img2imgPath}`);

      console.log('Step 3/3: Remove background...');
      const step3Start = Date.now();
      const rmbgResult = await client.removeBackground({
        image: img2imgResult.assetId,
      });
      const step3Time = Date.now() - step3Start;
      console.log(`  Done in ${(step3Time / 1000).toFixed(1)}s`);

      const { buffer: rmbgBuffer } = await client.downloadImage(rmbgResult.assetId);
      const rmbgPath = path.join(outputDir, `full-3-rmbg-${Date.now()}.png`);
      fs.writeFileSync(rmbgPath, Buffer.from(rmbgBuffer));
      console.log(`  Saved: ${rmbgPath}`);

      const totalTime = Date.now() - startTime;
      console.log('');
      console.log(`✅ Full pipeline test passed!`);
      console.log(`Total time: ${(totalTime / 1000).toFixed(1)}s`);
    } else {
      console.error(`Unknown mode: ${testMode}`);
      console.log('Available modes: txt2img, img2img, rmbg, full');
      process.exit(1);
    }
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`\n❌ Test failed after ${(elapsed / 1000).toFixed(1)}s`);
    console.error(error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
