#!/usr/bin/env node

import fs from "fs";
import path from "path";

const API_URL = "https://api.elevenlabs.io/v1/sound-generation";

async function generateSoundEffect({
  text,
  outputPath,
  durationSeconds = null,
  promptInfluence = 0.3,
  outputFormat = "mp3_44100_128",
}) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ELEVENLABS_API_KEY not found. Run with: npx hush run -t api -- node scripts/generate-sound-effect.mjs"
    );
  }

  console.log(`Generating sound effect: "${text}"`);
  console.log(`Output: ${outputPath}`);

  const body = {
    text,
    prompt_influence: promptInfluence,
  };

  if (durationSeconds !== null) {
    body.duration_seconds = durationSeconds;
  }

  const url = new URL(API_URL);
  url.searchParams.set("output_format", outputFormat);

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error ${response.status}: ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, buffer);
  console.log(`Saved: ${outputPath} (${buffer.length} bytes)`);

  return outputPath;
}

const SOUNDS_DIR = "app/public/assets/games/physics-stacker/sounds";

const SOUND_PRESETS = {
  thud: {
    text: "Short deep thud sound of a heavy wooden block landing on a platform, satisfying impact",
    durationSeconds: 1,
    promptInfluence: 0.5,
  },
};

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage:");
    console.log(
      '  node scripts/generate-sound-effect.mjs <preset>           - Generate preset sound (e.g., "thud")'
    );
    console.log(
      '  node scripts/generate-sound-effect.mjs "<prompt>" <name>  - Generate custom sound'
    );
    console.log("\nAvailable presets:", Object.keys(SOUND_PRESETS).join(", "));
    process.exit(1);
  }

  const presetName = args[0];

  if (SOUND_PRESETS[presetName]) {
    const preset = SOUND_PRESETS[presetName];
    const outputPath = path.join(SOUNDS_DIR, `${presetName}.mp3`);
    await generateSoundEffect({
      text: preset.text,
      outputPath,
      durationSeconds: preset.durationSeconds,
      promptInfluence: preset.promptInfluence,
    });
  } else if (args.length >= 2) {
    const [prompt, name] = args;
    const outputPath = path.join(SOUNDS_DIR, `${name}.mp3`);
    await generateSoundEffect({
      text: prompt,
      outputPath,
    });
  } else {
    console.error(`Unknown preset: ${presetName}`);
    console.log("Available presets:", Object.keys(SOUND_PRESETS).join(", "));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
