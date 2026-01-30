const MODAL_ENDPOINT = 'https://hassoncs--slopcade-comfyui-comfyuiworker-web-generate.modal.run';
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(process.cwd(), 'debug-output/flappy-bird-assets');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const assets = [
  {
    id: 'bird',
    prompt: 'A cute round bird character for a game, soft teal feathers with cream-colored belly, big expressive eyes, cheerful expression, small orange beak, tiny fluttering wings, fluffy and adorable, cartoon style, transparent background',
    width: 512,
    height: 512
  },
  {
    id: 'pipe-top',
    prompt: 'An ancient weathered stone pillar hanging from above, covered in trailing vines and emerald moss, crumbling edges with mystical runes carved into surface, ivy draping down, game platform, transparent background',
    width: 512,
    height: 1024
  },
  {
    id: 'pipe-bottom',
    prompt: 'An ancient weathered stone pillar rising from below, covered in climbing vines and emerald moss, crumbling edges with mystical runes carved into surface, small flowers growing from cracks, game platform, transparent background',
    width: 512,
    height: 1024
  },
  {
    id: 'background',
    prompt: 'A dreamy sky kingdom background for a flying game. Soft gradient sky from pale blue at bottom to deeper azure at top. Fluffy white clouds scattered throughout. Distant floating islands with tiny castles visible. Magical sparkles and light rays filtering through clouds. Whimsical and enchanting atmosphere.',
    width: 1024,
    height: 1024
  }
];

async function generateAsset(asset) {
  console.log(`Generating ${asset.id}...`);
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
  
  const outputPath = path.join(OUTPUT_DIR, `${asset.id}.png`);
  fs.writeFileSync(outputPath, Buffer.from(data.image_base64, 'base64'));
  console.log(`  ✅ ${asset.id} generated in ${duration}s (${data.image_base64.length} bytes)`);
}

async function main() {
  console.log('Generating Flappy Bird Assets...\n');
  console.log(`Output directory: ${OUTPUT_DIR}\n`);
  
  for (const asset of assets) {
    try {
      await generateAsset(asset);
    } catch (error) {
      console.error(`  ❌ Failed to generate ${asset.id}: ${error.message}`);
    }
  }
  
  console.log('\n✅ All assets generated!');
  console.log(`\nFiles saved in: ${OUTPUT_DIR}`);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
