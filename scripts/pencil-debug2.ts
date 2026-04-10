import { chromium } from "playwright";
import { readFileSync } from "fs";

async function main() {
  const docJson = readFileSync("/tmp/pencil-cli-doc.json", "utf-8");
  
  // Try headless: "new" with WebGL support via SwiftShader
  const browser = await chromium.launch({ 
    headless: true,
    args: [
      "--enable-webgl",
      "--use-gl=angle",
      "--use-angle=swiftshader-webgl",
      "--enable-unsafe-swiftshader",
      "--ignore-gpu-blocklist",
      "--disable-gpu-sandbox",
      "--enable-features=VaapiVideoDecodeLinuxGL",
    ]
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  const allConsole: string[] = [];
  page.on("console", (msg) => allConsole.push(`[${msg.type()}] ${msg.text()}`));
  page.on("pageerror", (err) => allConsole.push(`[PAGE_ERROR] ${err.stack || err.message}`));
  
  await page.goto("http://localhost:8089", { waitUntil: "networkidle", timeout: 30000 });
  
  await page.evaluate((json) => {
    window.localStorage.setItem("pencil:last-document", json);
  }, docJson);
  await page.reload({ waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(4000);
  
  const glCheck = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("webgl2");
    return {
      webglAvailable: !!gl,
      renderer: gl ? gl.getParameter(gl.RENDERER) : null,
    };
  });
  console.log("WebGL:", JSON.stringify(glCheck));
  
  const pageErrorCount = allConsole.filter(m => m.startsWith("[PAGE_ERROR]")).length;
  console.log(`Page errors: ${pageErrorCount}`);
  
  await page.screenshot({ path: "pencil-comparison/pencil-app/00-debug3.png" });
  
  // Print last few errors
  const errors = allConsole.filter(m => m.startsWith("[PAGE_ERROR]") || m.startsWith("[error]"));
  if (errors.length > 0) {
    console.log("\nErrors:");
    errors.slice(-5).forEach(e => console.log(`  ${e.substring(0, 200)}`));
  }
  
  await browser.close();
}

main();
