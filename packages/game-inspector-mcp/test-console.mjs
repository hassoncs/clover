import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

const logs = [];
page.on('console', msg => {
  const text = msg.text();
  logs.push(text);
  if (text.includes('Match3') || text.includes('world:')) {
    console.log('>>>', text);
  }
});

console.log('Opening Candy Crush...');
await page.goto('http://localhost:8085/test-games/candyCrush?debug=true&autostart=true');
await page.waitForTimeout(3000);

console.log('Hovering mouse at screen position 200,200...');
await page.mouse.move(200, 200);
await page.waitForTimeout(1000);

console.log('Hovering at 400,400...');
await page.mouse.move(400, 400);
await page.waitForTimeout(1000);

console.log('\nDone. Closing...');
await browser.close();
