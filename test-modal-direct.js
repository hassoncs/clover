const MODAL_ENDPOINT = 'https://hassoncs--slopcade-comfyui-web-generate.modal.run';

async function testModal() {
  console.log('Testing Modal endpoint...\n');
  
  // Test 1: Simple txt2img
  console.log('Test 1: Text-to-image');
  try {
    const response = await fetch(MODAL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'A simple red circle',
        width: 512,
        height: 512,
        steps: 10,
        guidance: 3.5
      })
    });
    
    console.log(`Status: ${response.status}`);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2).substring(0, 500));
    console.log('✅ txt2img works!\n');
  } catch (error) {
    console.error('❌ txt2img failed:', error.message, '\n');
  }
  
  // Test 2: img2img with base64
  console.log('Test 2: Image-to-image');
  try {
    // Simple 1x1 red pixel PNG
    const testImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    
    const response = await fetch(MODAL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'A blue circle',
        image_base64: testImage,
        strength: 0.5,
        steps: 10,
        guidance: 3.5
      })
    });
    
    console.log(`Status: ${response.status}`);
    const text = await response.text();
    console.log('Response:', text.substring(0, 500));
    if (response.ok) {
      console.log('✅ img2img works!\n');
    } else {
      console.error('❌ img2img failed with status', response.status, '\n');
    }
  } catch (error) {
    console.error('❌ img2img failed:', error.message, '\n');
  }
}

testModal();
