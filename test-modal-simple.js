const MODAL_ENDPOINT = 'https://hassoncs--slopcade-comfyui-comfyuiworker-web-generate.modal.run';

async function testModal() {
  console.log('Testing Modal endpoint...\n');
  
  // Test with minimal payload
  console.log('Test: Minimal txt2img');
  try {
    const response = await fetch(MODAL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'A red circle'
      })
    });
    
    console.log(`Status: ${response.status}`);
    console.log(`Status Text: ${response.statusText}`);
    
    const text = await response.text();
    console.log('Response text:', text.substring(0, 1000));
    
  } catch (error) {
    console.error('❌ Request failed:', error.message, '\n');
  }
}

testModal();
