#!/usr/bin/env npx tsx
/**
 * Test script for RunPod's pre-made ComfyUI endpoint
 * Tests with the exact workflow format RunPod expects
 */
import * as fs from 'fs';
import * as path from 'path';

const ENDPOINT_ID = process.env.RUNPOD_COMFYUI_ENDPOINT_ID || 'pd3dqti6qlf5cs';
const API_KEY = process.env.RUNPOD_API_KEY;

if (!API_KEY) {
  console.error('Error: RUNPOD_API_KEY environment variable required');
  console.log('\nUsage:');
  console.log('  pnpm hush run -- npx tsx api/scripts/test-runpod-premade.ts "your prompt"');
  process.exit(1);
}

const prompt = process.argv[2] || 'A cute pixel art cat, 16-bit style, game sprite, front view';

// Build workflow matching RunPod's exact format for flux1-dev
function buildWorkflow(promptText: string, seed: number = Math.floor(Math.random() * 1e15)) {
  return {
    "5": {
      "inputs": { "width": 512, "height": 512, "batch_size": 1 },
      "class_type": "EmptyLatentImage"
    },
    "6": {
      "inputs": { "text": promptText, "clip": ["11", 0] },
      "class_type": "CLIPTextEncode"
    },
    "8": {
      "inputs": { "samples": ["13", 0], "vae": ["10", 0] },
      "class_type": "VAEDecode"
    },
    "9": {
      "inputs": { "filename_prefix": "ComfyUI", "images": ["8", 0] },
      "class_type": "SaveImage"
    },
    "10": {
      "inputs": { "vae_name": "ae.safetensors" },
      "class_type": "VAELoader"
    },
    "11": {
      "inputs": {
        "clip_name1": "t5xxl_fp8_e4m3fn.safetensors",
        "clip_name2": "clip_l.safetensors",
        "type": "flux"
      },
      "class_type": "DualCLIPLoader"
    },
    "12": {
      "inputs": { "unet_name": "flux1-dev.safetensors", "weight_dtype": "fp8_e4m3fn" },
      "class_type": "UNETLoader"
    },
    "13": {
      "inputs": {
        "noise": ["25", 0],
        "guider": ["22", 0],
        "sampler": ["16", 0],
        "sigmas": ["17", 0],
        "latent_image": ["5", 0]
      },
      "class_type": "SamplerCustomAdvanced"
    },
    "16": {
      "inputs": { "sampler_name": "euler" },
      "class_type": "KSamplerSelect"
    },
    "17": {
      "inputs": { "scheduler": "sgm_uniform", "steps": 20, "denoise": 1, "model": ["12", 0] },
      "class_type": "BasicScheduler"
    },
    "22": {
      "inputs": { "model": ["12", 0], "conditioning": ["6", 0] },
      "class_type": "BasicGuider"
    },
    "25": {
      "inputs": { "noise_seed": seed },
      "class_type": "RandomNoise"
    }
  };
}

async function runTest() {
  console.log('RunPod Pre-made ComfyUI Test');
  console.log('============================');
  console.log(`Endpoint: ${ENDPOINT_ID}`);
  console.log(`Prompt: "${prompt}"`);
  console.log('');

  const workflow = buildWorkflow(prompt);
  const requestBody = { input: { workflow } };

  console.log('Sending request to RunPod...');
  console.log('(First request may take 30-120s for cold start)');
  
  const startTime = Date.now();

  try {
    // Use /runsync for synchronous execution
    const response = await fetch(`https://api.runpod.ai/v2/${ENDPOINT_ID}/runsync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`RunPod API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json() as {
      id: string;
      status: string;
      output?: {
        images?: Array<{ filename: string; type: string; data: string }>;
        error?: string;
      };
      error?: string;
    };

    const elapsed = Date.now() - startTime;
    console.log(`\nResponse received in ${(elapsed / 1000).toFixed(1)}s`);
    console.log(`Status: ${result.status}`);
    console.log(`Job ID: ${result.id}`);

    if (result.status === 'FAILED' || result.error) {
      throw new Error(`Job failed: ${result.error || result.output?.error || 'Unknown error'}`);
    }

    if (result.status === 'COMPLETED' && result.output?.images?.length) {
      const outputDir = path.join(__dirname, '..', 'debug-output', 'runpod-premade');
      fs.mkdirSync(outputDir, { recursive: true });

      for (const img of result.output.images) {
        const buffer = Buffer.from(img.data, 'base64');
        const outputPath = path.join(outputDir, `${img.filename || `output-${Date.now()}.png`}`);
        fs.writeFileSync(outputPath, buffer);
        console.log(`\nSaved: ${outputPath}`);
      }

      console.log('\n✅ Test passed! Image generated successfully.');
    } else if (result.status === 'IN_QUEUE' || result.status === 'IN_PROGRESS') {
      console.log('\nJob still in progress. Use /status endpoint to check completion.');
      console.log(`Job ID: ${result.id}`);
    } else {
      console.log('\nUnexpected status or no images returned.');
      console.log('Full response:', JSON.stringify(result, null, 2));
    }
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`\n❌ Test failed after ${(elapsed / 1000).toFixed(1)}s`);
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

runTest();
