import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "fs";

async function main() {
  const docJson = readFileSync("/tmp/pencil-cli-doc.json", "utf-8");
  const doc = JSON.parse(docJson);

  // Check what's inside each frame
  const frames = doc.children || [];
  frames.forEach((f: any, i: number) => {
    console.log(`\n=== Frame ${i}: ${f.name} (${f.width}x${f.height}) ===`);
    console.log(`  x=${f.x} y=${f.y}`);
    console.log(`  fill: ${JSON.stringify(f.fill)}`);
    console.log(`  backgroundColor: ${f.backgroundColor}`);
    console.log(`  children count: ${f.children?.length || 0}`);
    if (f.children) {
      f.children.forEach((c: any, ci: number) => {
        console.log(`    child ${ci}: type=${c.type} id=${c.id} name="${c.name || ''}" x=${c.x||0} y=${c.y||0} w=${c.width||'?'} h=${c.height||'?'}`);
        if (c.children) {
          c.children.forEach((gc: any, gci: number) => {
            console.log(`      grandchild ${gci}: type=${gc.type} id=${gc.id} name="${gc.name || ''}"`);
          });
        }
      });
    }
  });

  // Now load just the first frame (design system) and check layout
  const firstFrame = JSON.parse(JSON.stringify(frames[0]));
  // Reset position and ensure reasonable size
  firstFrame.x = 0;
  firstFrame.y = 0;

  const singleDoc = { version: 1, children: [firstFrame] };
  const singleJson = JSON.stringify(singleDoc);
  mkdirSync("pencil-comparison/pencil-app", { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ["--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto("http://localhost:8089", { waitUntil: "domcontentloaded", timeout: 25000 });
  await page.waitForTimeout(2000);
  await page.evaluate((j) => window.localStorage.setItem("pencil:last-document", j), singleJson);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 25000 });
  await page.waitForTimeout(5000);

  // Check if there are errors
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  // Get canvas dimensions and check what's rendered
  const info = await page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    return {
      canvasW: (canvas as HTMLCanvasElement)?.width,
      canvasH: (canvas as HTMLCanvasElement)?.height,
      localStorageSize: window.localStorage.getItem("pencil:last-document")?.length,
    };
  });
  console.log("\nCanvas info:", JSON.stringify(info));

  // Take screenshot
  await page.screenshot({ path: "pencil-comparison/pencil-app/01-design-system-test.png" });
  console.log("Screenshot saved");

  if (errors.length > 0) {
    console.log("Errors:", errors.slice(0, 5));
  }

  await browser.close();
}
main();
