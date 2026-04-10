import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "fs";

async function main() {
  const docJson = readFileSync("/tmp/pencil-cli-doc.json", "utf-8");
  const doc = JSON.parse(docJson);

  // Load the FULL unmodified document and check for errors
  const browser = await chromium.launch({
    headless: true,
    args: ["--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("http://localhost:8089", { waitUntil: "domcontentloaded", timeout: 25000 });
  await page.waitForTimeout(2000);
  await page.evaluate((j) => window.localStorage.setItem("pencil:last-document", j), docJson);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
  await page.waitForTimeout(5000);

  console.log("Page errors:", errors.length);
  errors.forEach((e) => console.log(`  ${e.substring(0, 200)}`));

  // Take full screenshot
  mkdirSync("pencil-comparison/pencil-app", { recursive: true });
  await page.screenshot({ path: "pencil-comparison/pencil-app/99-full-doc.png" });
  console.log("Saved: 99-full-doc.png");

  // Now try with just Login frame at origin but keep ALL other frames intact
  // Move Login to origin, leave everything else where it is
  const modified = JSON.parse(docJson);
  // Find and move Login/Auth frame (index 1) to origin
  const authFrame = modified.children[1];
  const savedPos = { x: authFrame.x, y: authFrame.y };
  modified.children[1].x = 0;
  modified.children[1].y = 0;
  // Also offset all other children of this frame to avoid overlap
  // Actually, just move the frame to origin and let the canvas show it

  await page.evaluate((j) => window.localStorage.setItem("pencil:last-document", j), JSON.stringify(modified));
  await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
  await page.waitForTimeout(5000);

  const errors2: string[] = [];
  page.on("pageerror", (err) => errors2.push(err.message));
  
  // Check if there are new errors
  const newErrors = errors2.filter(e => !errors.includes(e));
  console.log("\nAfter repositioning:");
  console.log("New errors:", newErrors.length);
  newErrors.forEach((e) => console.log(`  ${e.substring(0, 200)}`));

  await page.screenshot({ path: "pencil-comparison/pencil-app/99-repositioned.png" });
  console.log("Saved: 99-repositioned.png");

  await browser.close();
}
main();
