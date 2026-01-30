const MODAL_ENDPOINT = 'https://hassoncs--slopcade-comfyui-comfyuiworker-web-generate.modal.run';

async function testWithRetry() {
  console.log('Testing Modal with retries...\n');

  const startTime = Date.now();
  let attempt = 0;

  while (Date.now() - startTime < 600000) { // 10 minutes max
    attempt++;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    try {
      console.log(`[${elapsed}s] Attempt ${attempt}...`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout per attempt

      const response = await fetch(MODAL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'A simple blue button with text BUTTON on it',
          width: 512,
          height: 512,
          steps: 15
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.status === 200) {
        const data = await response.json();
        if (data.success) {
          console.log(`\n✅ SUCCESS in ${elapsed}s!`);
          console.log(`Image size: ${data.image_base64.length} bytes`);
          process.exit(0);
        } else {
          console.log(`\n❌ Error from Modal: ${data.error}`);
          process.exit(1);
        }
      } else if (response.status === 503) {
        console.log(`  Container still starting (503), retrying in 10s...`);
        await new Promise(r => setTimeout(r, 10000));
      } else {
        console.log(`  Status ${response.status}, retrying in 5s...`);
        await new Promise(r => setTimeout(r, 5000));
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('abort') || msg.includes('timeout')) {
        console.log(`  Request timed out, Modal is still starting... retrying in 10s`);
        await new Promise(r => setTimeout(r, 10000));
      } else {
        console.log(`  Error: ${msg.substring(0, 100)}, retrying in 5s...`);
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  }

  console.log('\n❌ Failed after 10 minutes');
  process.exit(1);
}

testWithRetry();
