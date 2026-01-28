const fs = require('fs');
const path = require('path');

// Configuration
const MODAL_ENDPOINT = 'https://hassoncs--slopcade-comfyui-web-img2img.modal.run';
const TIMEOUT_MS = 600000; // 10 minutes

async function testImg2img() {
  console.log('🎨 Testing Modal img2img...');
  console.log('=' .repeat(60));
  
  // Create a simple test image (1x1 red pixel as base64)
  // For a real test, we'll first generate an image with txt2img, then transform it
  console.log('\n📸 Step 1: Generating base image with txt2img...');
  
  // First generate a base image using Modal's txt2img
  // Since we don't have a txt2img web endpoint yet, we'll use the Python client
  // For now, let's test with a pre-existing image
  
  // Create a simple colored image as base64 for testing
  const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  
  console.log('\n🎭 Step 2: Testing img2img transformation...');
  console.log('   Prompt: "A magical transformation"');
  console.log('   Strength: 0.6');
  
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    
    const response = await fetch(MODAL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'A cute pixel art character, 16-bit style',
        image_base64: testImageBase64,
        strength: 0.6,
        steps: 15,
        guidance: 3.5
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const elapsed = (Date.now() - startTime) / 1000;
    
    if (data.success && data.image_base64) {
      console.log(`\n✅ SUCCESS! Generated in ${elapsed.toFixed(1)}s`);
      console.log(`   Image size: ${(data.image_base64.length * 0.75 / 1024).toFixed(0)} KB`);
      
      // Save the result
      const outputDir = path.join(__dirname, 'test_outputs');
      fs.mkdirSync(outputDir, { recursive: true });
      
      const outputPath = path.join(outputDir, 'test_img2img_result.png');
      fs.writeFileSync(outputPath, Buffer.from(data.image_base64, 'base64'));
      console.log(`   Saved to: ${outputPath}`);
      
      return true;
    } else {
      console.error('\n❌ FAILED:', data.error || 'Unknown error');
      return false;
    }
  } catch (error) {
    const elapsed = (Date.now() - startTime) / 1000;
    console.error(`\n❌ ERROR after ${elapsed.toFixed(1)}s:`, error.message);
    return false;
  }
}

// Run the test
testImg2img().then(success => {
  console.log('\n' + '='.repeat(60));
  if (success) {
    console.log('🎉 IMG2IMG IS WORKING!');
    process.exit(0);
  } else {
    console.log('💥 IMG2IMG TEST FAILED');
    process.exit(1);
  }
});
