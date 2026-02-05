import { chromium } from "playwright";
import type { Browser, Page } from "playwright";
import type { GameInspectorState, WindowWithBridge, ConsoleLogEntry } from './types.js'
import { DEFAULT_TIMEOUT } from './types.js'
import { findByIdOrPath, type GameInfo } from './registry.js'
import path from "path";
import fs from "fs";

export function normalizeGameName(name: string): GameInfo | null {
  return findByIdOrPath(name) ?? null;
}

export function buildGameUrl(gameId: string, baseUrl: string): string {
  return `${baseUrl}/test-games/${gameId}?debug=true`;
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
  page.on('console', async (msg) => {
    let text = msg.text();
    
    // For some console messages (especially from eval'd code), msg.text() may be empty
    // In that case, try to get text from args
    if (!text || text === '') {
      try {
        const args = msg.args();
        const argTexts = await Promise.all(
          args.map(async (arg) => {
            try {
              const val = await arg.jsonValue();
              return typeof val === 'string' ? val : JSON.stringify(val);
            } catch {
              return arg.toString();
            }
          })
        );
        text = argTexts.join(' ');
      } catch {
        // Fall back to original text
      }
    }
    
    const entry: ConsoleLogEntry = {
      timestamp: Date.now(),
      type: msg.type() as ConsoleLogEntry['type'],
      text,
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

export function getScreenshotsDir(): string {
  const screenshotsDir = path.join(process.cwd(), 'tmp', 'game-inspector-screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
  return screenshotsDir;
}

export interface ScreenshotResult {
  filepath: string;
  width: number;
  height: number;
  isGameCanvas: boolean;
}

export interface ScreenshotOptions {
  filepath?: string;
  prefix?: string;
}

export async function takeScreenshot(page: Page, options: ScreenshotOptions = {}): Promise<ScreenshotResult> {
  const { filepath: explicitPath, prefix = 'screenshot' } = options;
  
  const filepath = explicitPath ?? path.join(getScreenshotsDir(), `${prefix}-${Date.now()}.png`);
  
  const godotElement = await page.$('iframe[title="Godot Game Engine"], canvas#canvas, canvas');
  
  if (godotElement) {
    await godotElement.screenshot({ path: filepath });
    const box = await godotElement.boundingBox();
    return {
      filepath,
      width: box?.width ?? 0,
      height: box?.height ?? 0,
      isGameCanvas: true,
    };
  }
  
  await page.screenshot({ path: filepath });
  const viewport = page.viewportSize();
  return {
    filepath,
    width: viewport?.width ?? 0,
    height: viewport?.height ?? 0,
    isGameCanvas: false,
  };
}

export async function takeScreenshotToBuffer(page: Page): Promise<{ buffer: Buffer; width: number; height: number; isGameCanvas: boolean }> {
  const godotElement = await page.$('iframe[title="Godot Game Engine"], canvas#canvas, canvas');
  
  if (godotElement) {
    const buffer = await godotElement.screenshot({ type: 'png' });
    const box = await godotElement.boundingBox();
    return {
      buffer,
      width: box?.width ?? 0,
      height: box?.height ?? 0,
      isGameCanvas: true,
    };
  }
  
  const buffer = await page.screenshot({ type: 'png' });
  const viewport = page.viewportSize();
  return {
    buffer,
    width: viewport?.width ?? 0,
    height: viewport?.height ?? 0,
    isGameCanvas: false,
  };
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

export async function waitForGameReady(page: Page, timeout: number = DEFAULT_TIMEOUT): Promise<boolean> {
  try {
    await page.waitForFunction(
      () => {
        const w = window as unknown as WindowWithBridge;
        return w.SlopcadeDebugBridge?.ready === true || w.slopcadeGameReady === true;
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
    type DebugOpsWindow = Window & { debugOps?: any };
    const win = window as DebugOpsWindow;
    
    if (!win.debugOps) {
      return { error: "debugOps not available. Ensure game is loaded with ?debug=true" };
    }

    const methodFn = win.debugOps[evalArgs.method];
    if (typeof methodFn !== "function") {
      return { error: `Method ${evalArgs.method} not found on debugOps` };
    }

    try {
      const result = await methodFn.apply(win.debugOps, evalArgs.args);
      return result ?? { success: true };
    } catch (err) {
      return { error: `Error calling ${evalArgs.method}: ${String(err)}` };
    }
  }, { method, args }) as Promise<T | { error: string }>;
}

export async function querySlopcade<T>(page: Page | null, method: string, args: unknown[] = []): Promise<T | { error: string }> {
  if (!page) {
    return { error: "No game open. Call game_open first." };
  }

  return page.evaluate(async (evalArgs: { method: string; args: unknown[] }) => {
    type DebugOpsWindow = Window & { debugOps?: any };
    const win = window as DebugOpsWindow;
    
    if (!win.debugOps) {
      return { error: "debugOps not available. Ensure game is loaded with ?debug=true" };
    }

    const methodFn = win.debugOps[evalArgs.method];
    if (typeof methodFn !== "function") {
      return { error: `Method ${evalArgs.method} not found on debugOps` };
    }

    try {
      const result = await methodFn.apply(win.debugOps, evalArgs.args);
      return result ?? { success: true };
    } catch (err) {
      return { error: `Error calling ${evalArgs.method}: ${String(err)}` };
    }
  }, { method, args }) as Promise<T | { error: string }>;
}
