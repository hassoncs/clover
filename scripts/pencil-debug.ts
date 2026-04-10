import { chromium } from "playwright";
import { readFileSync } from "fs";

async function main() {
  const docJson = readFileSync("/tmp/pencil-cli-doc.json", "utf-8");
  const doc = JSON.parse(docJson);
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  const consoleMessages: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => {
    consoleMessages.push(`[PAGE ERROR] ${err.message}`);
  });
  
  console.log("=== NAVIGATING ===");
  await page.goto("http://localhost:8089", { waitUntil: "networkidle", timeout: 30000 });
  
  const loadedFromLS = await page.evaluate(() => {
    const raw = window.localStorage.getItem("pencil:last-document");
    if (!raw) return { error: "No localStorage" };
    const parsed = JSON.parse(raw);
    return {
      version: parsed.version,
      childrenCount: parsed.children?.length,
      childrenTypes: parsed.children?.slice(0, 5).map((c: any) => `${c.type}:${c.id}`),
    };
  });
  console.log("Before inject:", JSON.stringify(loadedFromLS));
  
  console.log("\n=== INJECTING DOCUMENT ===");
  await page.evaluate((json) => {
    window.localStorage.setItem("pencil:last-document", json);
  }, docJson);
  
  await page.reload({ waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3000);
  
  const loadedAfter = await page.evaluate(() => {
    const raw = window.localStorage.getItem("pencil:last-document");
    if (!raw) return { error: "No localStorage" };
    const parsed = JSON.parse(raw);
    return {
      version: parsed.version,
      childrenCount: parsed.children?.length,
    };
  });
  console.log("After reload:", JSON.stringify(loadedAfter));
  
  // Check canvas state
  const canvasInfo = await page.evaluate(() => {
    const canvases = document.querySelectorAll("canvas");
    return {
      count: canvases.length,
      dims: Array.from(canvases).map((c) => ({
        w: (c as HTMLCanvasElement).width,
        h: (c as HTMLCanvasElement).height,
        id: c.id,
        cls: c.className,
      })),
    };
  });
  console.log("Canvas info:", JSON.stringify(canvasInfo, null, 2));
  
  // Check layers panel content
  const layersCount = await page.evaluate(() => {
    const rows = document.querySelectorAll('[class*="layers"] [class*="row"], [style*="paddingLeft"]');
    return { visibleRows: rows.length };
  });
  console.log("Layers:", JSON.stringify(layersCount));
  
  // Check if PencilCanvasPanel is mounted
  const componentCheck = await page.evaluate(() => {
    // Check what's in the main canvas area
    const mainArea = document.querySelector('[class*="canvasArea"]') || 
                     document.querySelector('[class*="canvas-area"]') ||
                     document.querySelector('[class*="Canvas"]');
    return {
      mainAreaExists: !!mainArea,
      mainAreaHTML: mainArea ? mainArea.innerHTML.substring(0, 300) : "NOT FOUND",
    };
  });
  console.log("Main area:", JSON.stringify(componentCheck));
  
  // Take screenshot
  await page.screenshot({ path: "pencil-comparison/pencil-app/00-debug.png" });
  console.log("\nScreenshot saved.");
  
  if (consoleMessages.length > 0) {
    console.log("\nConsole messages:");
    consoleMessages.slice(-20).forEach((m) => console.log(`  ${m}`));
  }
  
  await browser.close();
}

main();
