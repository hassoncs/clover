#!/usr/bin/env npx tsx
import { chromium } from "playwright";

const DEFAULT_BASE_URL = "http://localhost:8085";

async function main() {
  const gameId = process.argv[2] || "candyCrush";
  const url = `${DEFAULT_BASE_URL}/test-games/${gameId}?debug=true&autostart=true`;
  
  console.log(`Opening ${url}...`);
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto(url);
  
  console.log("Waiting for GodotDebugBridge...");
  
  await page.waitForFunction(
    () => {
      const w = window as unknown as { GodotDebugBridge?: { enabled: boolean } };
      return w.GodotDebugBridge?.enabled === true;
    },
    { timeout: 30000 }
  );
  
  console.log("GodotDebugBridge ready!");
  
  console.log("\n=== Checking iframe and GodotBridge ===");
  
  const debugInfo = await page.evaluate(() => {
    const w = window as unknown as { 
      GodotBridge?: Record<string, unknown>;
      GodotDebugBridge?: { enabled: boolean };
    };
    
    const info: Record<string, unknown> = {
      hasGodotBridge: !!w.GodotBridge,
      hasGodotDebugBridge: !!w.GodotDebugBridge,
    };
    
    const iframes = document.querySelectorAll('iframe');
    info.iframeCount = iframes.length;
    info.iframeTitles = Array.from(iframes).map(f => f.title || f.id || 'no-title');
    
    const godotIframe = document.querySelector('iframe[title="Godot Game Engine"]') as HTMLIFrameElement | null;
    info.godotIframeFound = !!godotIframe;
    
    if (godotIframe?.contentWindow) {
      try {
        const iframeWin = godotIframe.contentWindow as { GodotBridge?: Record<string, unknown> };
        info.iframeHasGodotBridge = !!iframeWin.GodotBridge;
        
        if (iframeWin.GodotBridge) {
          info.bridgeMethods = Object.keys(iframeWin.GodotBridge);
          info.hasGetSceneSnapshot = 'getSceneSnapshot' in iframeWin.GodotBridge;
          info.hasGetAllTransforms = 'getAllTransforms' in iframeWin.GodotBridge;
          
          const bridge = iframeWin.GodotBridge as { 
            getAllTransforms?: () => void; 
            getSceneSnapshot?: () => void;
            _lastResult?: unknown 
          };
          
          info.lastResultBefore = bridge._lastResult;
          
          if (bridge.getSceneSnapshot) {
            bridge.getSceneSnapshot();
            info.sceneSnapshotResultImmediate = JSON.parse(JSON.stringify(bridge._lastResult || null));
          }
        }
      } catch (e) {
        info.iframeError = String(e);
      }
    }
    
    return info;
  });
  
  console.log("\nDebug Info:");
  console.log(JSON.stringify(debugInfo, null, 2));
  
  console.log("\n=== Waiting 500ms for Godot frame, then re-checking _lastResult ===");
  
  await page.waitForTimeout(500);
  
  const afterWaitResult = await page.evaluate(() => {
    const godotIframe = document.querySelector('iframe[title="Godot Game Engine"]') as HTMLIFrameElement | null;
    if (godotIframe?.contentWindow) {
      const iframeWin = godotIframe.contentWindow as { GodotBridge?: { _lastResult?: unknown } };
      return JSON.parse(JSON.stringify(iframeWin.GodotBridge?._lastResult || null));
    }
    return null;
  });
  
  console.log("_lastResult after 500ms wait:");
  console.log(JSON.stringify(afterWaitResult, null, 2));
  
  console.log("\n=== Testing async query system directly ===");
  
  const asyncQueryTest = await page.evaluate(async () => {
    const godotIframe = document.querySelector('iframe[title="Godot Game Engine"]') as HTMLIFrameElement | null;
    if (!godotIframe?.contentWindow) return { error: "No iframe" };
    
    const iframeWin = godotIframe.contentWindow as { 
      GodotBridge?: { 
        query?: (requestId: string, method: string, argsJson: string) => void;
      };
      _godotQueryResolve?: (requestId: string, resultJson: string) => void;
    };
    
    const bridge = iframeWin.GodotBridge;
    if (!bridge?.query) return { error: "No query method on bridge" };
    
    const requestId = `test_${Date.now()}`;
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ error: "Query timeout after 3s", requestId });
      }, 3000);
      
      const originalResolver = (window as typeof iframeWin)._godotQueryResolve;
      (window as typeof iframeWin)._godotQueryResolve = (id: string, resultJson: string) => {
        if (id === requestId) {
          clearTimeout(timeout);
          try {
            resolve({ 
              success: true, 
              requestId: id, 
              result: JSON.parse(resultJson)
            });
          } catch (e) {
            resolve({ error: `Parse error: ${e}`, raw: resultJson });
          }
        } else if (originalResolver) {
          originalResolver(id, resultJson);
        }
      };
      
      bridge.query!(requestId, "getSceneSnapshot", "[]");
    });
  });
  
  console.log("\nAsync query test result:");
  console.log(JSON.stringify(asyncQueryTest, null, 2));
  
  console.log("\n=== Calling GodotDebugBridge.getSnapshot ===");
  
  const snapshot = await page.evaluate(async () => {
    const w = window as unknown as { 
      GodotDebugBridge?: { 
        getSnapshot: (opts: { detail: string }) => Promise<unknown> 
      } 
    };
    if (!w.GodotDebugBridge) return { error: "No GodotDebugBridge" };
    return w.GodotDebugBridge.getSnapshot({ detail: "high" });
  });
  
  console.log("\nSnapshot result:");
  console.log(JSON.stringify(snapshot, null, 2));
  
  console.log("\n=== Taking screenshot ===");
  
  const godotElement = await page.$('iframe[title="Godot Game Engine"], canvas#canvas, canvas');
  if (godotElement) {
    await godotElement.screenshot({ path: "debug-game-screenshot.png" });
    console.log("Saved to debug-game-screenshot.png");
  }
  
  console.log("\nPress Ctrl+C to exit...");
  
  await new Promise(() => {});
}

main().catch(console.error);
