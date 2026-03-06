const { chromium } = require('playwright');
const { execSync } = require('child_process');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  await page.goto('http://localhost:8089');
  await page.waitForTimeout(2000);
  
  console.log('Sending MCP request...');
  
  // Send MCP request in background
  execSync(`curl -s -X POST http://localhost:8090/mcp/tools/pencil_batch_design \\
    -H "Content-Type: application/json" \\
    -d '{"operations": "[{\\"type\\": \\"addFrame\\", \\"title\\": \\"Cursor Test\\", \\"x\\": 500, \\"y\\": 500}]"}'`);
    
  await page.waitForTimeout(1000);
  
  // Check if cursor element exists
  const hasCursor = await page.evaluate(() => {
    const text = document.body.innerText;
    return text.includes('radbot') || text.includes('🤖');
  });
  
  console.log('Has cursor:', hasCursor);
  
  await browser.close();
})();
