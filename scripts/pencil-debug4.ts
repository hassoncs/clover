import { chromium } from "playwright";
import { readFileSync } from "fs";

async function main() {
  const docJson = readFileSync("/tmp/pencil-cli-doc.json", "utf-8");
  const doc = JSON.parse(docJson);
  const frames = doc.children;
  
  // Move frame 1 (Auth) to origin, shift others away
  const modified = JSON.parse(docJson);
  const target = frames[1]; // Auth & Settings
  const tx = target.x || 0;
  const ty = target.y || 0;
  modified.children[1].x = 0;
  modified.children[1].y = 0;
  for (let j = 0; j < modified.children.length; j++) {
    if (j === 1) continue;
    modified.children[j].x = (modified.children[j].x || 0) - tx + 5000;
    modified.children[j].y = (modified.children[j].y || 0) - ty + 5000;
  }
  const modifiedJson = JSON.stringify(modified);
  console.log("Modified doc size:", modifiedJson.length, "bytes");
  console.log("Modified child positions:", modified.children.map((c: any) => `${c.name}: (${c.x},${c.y})`));
  
  const browser = await chromium.launch({
    headless: true,
    args: ["--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  const logs: string[] = [];
  page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on("pageerror", (err) => logs.push(`[ERROR] ${err.message}`));
  
  await page.goto("http://localhost:8089", { waitUntil: "domcontentloaded", timeout: 25000 });
  await page.waitForTimeout(3000);
  
  // Set localStorage
  await page.evaluate((j) => window.localStorage.setItem("pencil:last-document", j), modifiedJson);
  
  // Verify it was set
  const lsSize = await page.evaluate(() => window.localStorage.getItem("pencil:last-document")?.length);
  console.log("localStorage size after set:", lsSize);
  
  // Reload
  await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
  await page.waitForTimeout(5000);
  
  // Verify what the app loaded
  const loadedSize = await page.evaluate(() => window.localStorage.getItem("pencil:last-document")?.length);
  console.log("localStorage size after reload:", loadedSize);
  
  // Check if app loaded the right doc by looking at layers
  const layersText = await page.evaluate(() => {
    const el = document.querySelector('[class*="layers"]') || document.querySelector('[class*="LAYERS"]');
    return el ? el.textContent?.substring(0, 500) : "NO LAYERS ELEMENT";
  });
  console.log("Layers text:", layersText?.substring(0, 300));
  
  // Check for any error overlay or fallback text
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 200));
  console.log("Body text:", bodyText);
  
  // Check console errors
  const errors = logs.filter(l => l.includes("[error]") || l.includes("[PAGE_ERROR]"));
  if (errors.length > 0) {
    console.log("\nErrors:");
    errors.forEach(e => console.log(`  ${e.substring(0, 200)}`));
  }
  
  await page.screenshot({ path: "pencil-comparison/pencil-app/99-debug4.png" });
  await browser.close();
}
main();
