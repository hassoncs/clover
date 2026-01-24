const apiKey = process.env.SCENARIO_API_KEY;
const apiSecret = process.env.SCENARIO_SECRET_API_KEY;

console.log('API Key set:', !!apiKey, apiKey?.slice(0, 8) + '...');
console.log('Secret set:', !!apiSecret, apiSecret?.slice(0, 8) + '...');

if (!apiKey || !apiSecret) {
  console.error('Missing credentials');
  process.exit(1);
}

const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

async function test() {
  try {
    console.log('\nTesting API connection...');
    const res = await fetch('https://api.cloud.scenario.com/v1/models', {
      headers: { 
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Response:', text.slice(0, 500));
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

test();
