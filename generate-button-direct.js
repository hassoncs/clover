const MODAL_ENDPOINT = 'https://hassoncs--slopcade-comfyui-comfyuiworker-web-generate.modal.run';
const fs = require('fs');
const path = require('path');

async function generateButton() {
  console.log('Generating button directly...\n');
  
  const OUTPUT_DIR = path.join(process.cwd(), 'debug-output/direct-button-test');
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  
  // Read the silhouette
  const silhouettePath = path.join(process.cwd(), 'api/debug-output/test-button-run/test-button/ui-base-state_1-silhouette.png');
  if (!fs.existsSync(silhouettePath)) {
    console.error('Silhouette not found!');
    process.exit(1);
  }
  
  const silhouetteData = fs.readFileSync(silhouettePath);
  const silhouetteBase64 = silhouetteData.toString('base64');
  console.log(`Loaded silhouette: ${silhouetteData.length} bytes`);
  
  // Call Modal
  console.log('Calling Modal img2img...');
  const startTime = Date.now();
  
  const response = await fetch(MODAL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'A modern blue button UI element with "BUTTON" text, clean design, game interface style, professional game UI',
      image_base64: silhouetteBase64,
      strength: 0.85,
      width: 512,
      height: 512,
      steps: 15
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
  
  console.log(`✅ Generated in ${duration}s!`);
  console.log(`Image size: ${data.image_base64.length} bytes`);
  
  // Save the generated image
  const outputPath = path.join(OUTPUT_DIR, 'generated-button.png');
  fs.writeFileSync(outputPath, Buffer.from(data.image_base64, 'base64'));
  console.log(`Saved to: ${outputPath}`);
}

generateButton().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
