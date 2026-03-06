const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  await page.goto('http://localhost:8089');
  await page.waitForTimeout(3000);
  
  const text = await page.evaluate(() => {
    return document.body.innerText;
  });
  
  console.log('Body text includes "Server":', text.includes('Server'));
  console.log('Body text includes "Local":', text.includes('Local'));
  
  await browser.close();
})();
