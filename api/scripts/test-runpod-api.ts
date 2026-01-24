#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';
import { RunPodClient } from '../src/ai/runpod';

async function main() {
  const apiKey = process.env.RUNPOD_API_KEY;
  const fluxEndpointId = process.env.RUNPOD_FLUX_ENDPOINT_ID;
  const sdxlEndpointId = process.env.RUNPOD_SDXL_ENDPOINT_ID;

  if (!apiKey) {
    console.error('Error: RUNPOD_API_KEY environment variable required');
    console.log('\nUsage:');
    console.log('  RUNPOD_API_KEY=xxx RUNPOD_FLUX_ENDPOINT_ID=yyy npx tsx api/scripts/test-runpod-api.ts');
    process.exit(1);
  }

  if (!fluxEndpointId && !sdxlEndpointId) {
    console.error('Error: Need at least one endpoint ID (RUNPOD_FLUX_ENDPOINT_ID or RUNPOD_SDXL_ENDPOINT_ID)');
    process.exit(1);
  }

  console.log('RunPod API Test');
  console.log('================');
  console.log(`Flux Endpoint: ${fluxEndpointId ?? 'not set'}`);
  console.log(`SDXL Endpoint: ${sdxlEndpointId ?? 'not set'}`);
  console.log('');

  const client = new RunPodClient({
    apiKey,
    fluxEndpointId,
    sdxlEndpointId,
  });

  const outputDir = path.join(__dirname, '..', 'debug-output', 'runpod-test');
  fs.mkdirSync(outputDir, { recursive: true });

  const prompt = process.argv[2] || 'A cute pixel art cat, 16-bit style, game sprite, transparent background';
  console.log(`Prompt: "${prompt}"`);
  console.log('');
  console.log('Generating image...');

  const startTime = Date.now();

  try {
    const result = await client.txt2img({
      prompt,
      width: 512,
      height: 512,
    });

    const elapsed = Date.now() - startTime;
    console.log(`Done in ${(elapsed / 1000).toFixed(1)}s`);
    console.log(`Asset ID: ${result.assetId}`);

    const { buffer } = await client.downloadImage(result.assetId);

    const outputPath = path.join(outputDir, `test-${Date.now()}.png`);
    fs.writeFileSync(outputPath, Buffer.from(buffer));
    console.log(`Saved to: ${outputPath}`);

    console.log('\n✅ Test passed!');
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`\n❌ Test failed after ${(elapsed / 1000).toFixed(1)}s`);
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
