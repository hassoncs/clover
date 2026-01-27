import { chromium } from "playwright";
import type { Browser, Page } from "playwright";
import type { GameInspectorState, WindowWithBridge, ConsoleLogEntry } from "./types.js";
import { DEFAULT_TIMEOUT } from "./types.js";
import { findByIdOrPath, type GameInfo } from "./registry.js";
import path from "path";
import fs from "fs";

export function normalizeGameName(name: string): GameInfo | null {
  return findByIdOrPath(name) ?? null;
}

export function buildGameUrl(gameId: string, baseUrl: string): string {
  return `${baseUrl}/test-games/${gameId}?debug=true&autostart=true`;
}

export function buildExampleUrl(exampleId: string, baseUrl: string): string {
  return `${baseUrl}/examples/${exampleId}?debug=true`;
}

export async function ensureBrowser(state: GameInspectorState): Promise<Browser> {
  if (!state.browser) {
    state.browser = await chromium.launch({ headless: false });
  }
  return state.browser;
}

export async function ensurePage(state: GameInspectorState): Promise<Page> {
  const browser = await ensureBrowser(state);
  if (!state.page) {
    state.page = await browser.newPage();
    setupConsoleCapture(state.page, state);
  }
  return state.page;
}

function setupConsoleCapture(page: Page, state: GameInspectorState): void {
  page.on('console', (msg) => {
    const entry: ConsoleLogEntry = {
      timestamp: Date.now(),
      type: msg.type() as ConsoleLogEntry['type'],
      text: msg.text(),
    };
    
    state.consoleLogs.push(entry);
    
    if (state.consoleLogs.length > state.maxLogEntries) {
      state.consoleLogs.shift();
    }
  });
}

export function getRecentLogs(state: GameInspectorState, since?: number): ConsoleLogEntry[] {
  if (since === undefined) {
    return [...state.consoleLogs];
  }
  return state.consoleLogs.filter(log => log.timestamp >= since);
}

export function clearLogs(state: GameInspectorState): void {
  state.consoleLogs.length = 0;
}

export async function takeScreenshot(page: Page, prefix: string = 'screenshot'): Promise<string> {
  const screenshotsDir = path.join(process.cwd(), 'tmp', 'game-inspector-screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
  
  const timestamp = Date.now();
  const filename = `${prefix}-${timestamp}.png`;
  const filepath = path.join(screenshotsDir, filename);
  
  await page.screenshot({ path: filepath });
  return filepath;
}

export async function waitForDebugBridge(page: Page, timeout: number = DEFAULT_TIMEOUT): Promise<boolean> {
  try {
    await page.waitForFunction(
      () => {
        const w = window as unknown as WindowWithBridge;
        return w.GodotDebugBridge?.enabled === true;
      },
      { timeout }
    );
    return true;
  } catch {
    return false;
  }
}

export async function queryGodot<T>(page: Page | null, method: string, args: unknown[] = []): Promise<T | { error: string }> {
  if (!page) {
    return { error: "No game open. Call game_open first." };
  }

  return page.evaluate(async (evalArgs: { method: string; args: unknown[] }) => {
    const iframe = document.querySelector('iframe[title="Godot Game Engine"]') as HTMLIFrameElement | null;
    if (!iframe?.contentWindow) return { error: "Godot iframe not found" };
    
    const bridge = (iframe.contentWindow as { GodotBridge?: { query?: (id: string, method: string, argsJson: string) => void } }).GodotBridge;
    if (!bridge?.query) return { error: "Godot bridge not available" };

    const requestId = `mcp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    return new Promise<unknown>((resolve) => {
      const timeout = setTimeout(() => resolve({ error: `Query timeout: ${evalArgs.method}` }), 5000);
      
      type GodotQueryWindow = Window & { 
        _godotPendingQueries?: Map<string, { resolve: (r: unknown) => void; timeout: ReturnType<typeof setTimeout> }>;
        _godotQueryResolve?: (id: string, json: string) => void;
      };
      const win = window as GodotQueryWindow;
      
      if (!win._godotPendingQueries) win._godotPendingQueries = new Map();
      if (!win._godotQueryResolve) {
        win._godotQueryResolve = (id: string, json: string) => {
          const pending = win._godotPendingQueries?.get(id);
          if (pending) {
            clearTimeout(pending.timeout);
            win._godotPendingQueries?.delete(id);
            try { pending.resolve(JSON.parse(json)); } 
            catch { pending.resolve({ error: "Parse error" }); }
          }
        };
      }
      
      win._godotPendingQueries.set(requestId, { resolve, timeout });
      bridge.query!(requestId, evalArgs.method, JSON.stringify(evalArgs.args));
    });
  }, { method, args }) as Promise<T | { error: string }>;
}
