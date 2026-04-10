#!/usr/bin/env npx tsx
import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "fs";

async function main() {
  const docJson = readFileSync("/tmp/pencil-cli-doc.json", "utf-8");
  const doc = JSON.parse(docJson);
  
  const frames = (doc.children || []).map((c: any, i: number) => ({
    index: i, id: c.id, name: c.name || c.id,
  }));

  const dir = "pencil-comparison/pencil-app";
  mkdirSync(dir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ["--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto("http://localhost:8089", { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(2000);
  
  await page.evaluate((json) => {
    window.localStorage.setItem("pencil:last-document", json);
  }, docJson);
  
  await page.reload({ waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(5000);

  await page.screenshot({ path: `${dir}/00-full.png` });
  console.log(`Saved: 00-full.png`);

  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    const safe = f.name.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 40);
    const num = String(i + 1).padStart(2, "0");
    const search = f.name.length > 25 ? f.name.substring(0, 25) : f.name;

    try {
      // Find layer row by partial text
      const row = page.locator(`div:has-text("${search}")`).first();
      await row.scrollIntoViewIfNeeded({ timeout: 3000 });
      await row.click({ timeout: 5000 });
      await page.waitForTimeout(1500);
      
      // Double-click to zoom-to-fit the frame
      await row.dblclick({ timeout: 5000 });
      await page.waitForTimeout(2000);
      
      await page.screenshot({ path: `${dir}/${num}-${safe}.png` });
      console.log(`Saved: ${num}-${safe}.png`);
    } catch (e: any) {
      console.log(`Error ${f.name}: ${e.message.substring(0, 60)}`);
    }
  }

  await browser.close();
  console.log("Done!");
}

main();
