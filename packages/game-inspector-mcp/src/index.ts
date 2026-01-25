#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { chromium, type Browser, type Page } from "playwright";

const AVAILABLE_GAMES = [
  "breakoutBouncer",
  "candyCrush",
  "comboFighter",
  "dungeonCrawler",
  "physicsStacker",
  "pinballLite",
  "rpgProgressionDemo",
  "simplePlatformer",
  "slopeggle",
  "towerDefense",
] as const;

type GameId = (typeof AVAILABLE_GAMES)[number];

const DEFAULT_BASE_URL = "http://localhost:8085";
const DEFAULT_TIMEOUT = 30000;

let browser: Browser | null = null;
let page: Page | null = null;
let currentGameId: string | null = null;

function normalizeGameName(name: string): GameId | null {
  const normalized = name.toLowerCase().replace(/[-_\s]/g, "");
  for (const game of AVAILABLE_GAMES) {
    if (game.toLowerCase() === normalized) {
      return game;
    }
  }
  if (normalized === "peggle") return "slopeggle";
  if (normalized === "breakout") return "breakoutBouncer";
  if (normalized === "pinball") return "pinballLite";
  if (normalized === "stacker") return "physicsStacker";
  if (normalized === "platformer") return "simplePlatformer";
  return null;
}

function buildGameUrl(gameId: string, baseUrl: string): string {
  return `${baseUrl}/test-games/${gameId}?debug=true&autostart=true`;
}

async function ensureBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({ headless: false });
  }
  return browser;
}

async function ensurePage(): Promise<Page> {
  const b = await ensureBrowser();
  if (!page) {
    page = await b.newPage();
  }
  return page;
}

interface DebugBridge {
  enabled: boolean;
  getSnapshot: (opts: { detail: string; filterTemplate?: string; filterTags?: string[] }) => Promise<unknown>;
  simulateTap: (x: number, y: number) => Promise<unknown>;
  simulateDrag: (sx: number, sy: number, ex: number, ey: number, duration: number) => Promise<void>;
  waitForStationary: (id: string, timeout: number, epsilon: number) => Promise<unknown>;
  waitForCollision: (a: string, b: string, timeout: number) => Promise<unknown>;
  assert: {
    exists: (id: string) => unknown;
    nearPosition: (id: string, pos: { x: number; y: number }, tolerance: number) => unknown;
    hasVelocity: (id: string, threshold: number) => unknown;
    isStationary: (id: string, threshold: number) => unknown;
    collisionOccurred: (a: string, b: string) => unknown;
    hasTag: (id: string, tag: string) => unknown;
    entityCount: (tag: string, count: number) => unknown;
  };
}

interface WindowWithBridge {
  GodotDebugBridge?: DebugBridge;
}

async function waitForDebugBridge(p: Page, timeout: number = DEFAULT_TIMEOUT): Promise<boolean> {
  try {
    await p.waitForFunction(
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

const server = new McpServer({
  name: "game-inspector",
  version: "1.0.0",
});

server.tool(
  "game_list",
  "List all available test games",
  {},
  async () => {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              games: AVAILABLE_GAMES,
              aliases: {
                peggle: "slopeggle",
                breakout: "breakoutBouncer",
                pinball: "pinballLite",
                stacker: "physicsStacker",
                platformer: "simplePlatformer",
              },
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool(
  "game_open",
  "Open a test game in the browser and wait for it to be ready",
  {
    name: z.string().describe("Game name or ID (e.g., 'candyCrush', 'peggle', 'slopeggle')"),
    baseUrl: z.string().optional().describe(`Base URL for the app (default: ${DEFAULT_BASE_URL})`),
    timeout: z.number().optional().describe(`Timeout in ms to wait for game ready (default: ${DEFAULT_TIMEOUT})`),
  },
  async (args) => {
    const name = args.name as string;
    const baseUrl = (args.baseUrl as string | undefined) ?? DEFAULT_BASE_URL;
    const timeout = (args.timeout as number | undefined) ?? DEFAULT_TIMEOUT;

    const gameId = normalizeGameName(name);
    if (!gameId) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              success: false,
              error: `Unknown game: "${name}". Available games: ${AVAILABLE_GAMES.join(", ")}`,
            }),
          },
        ],
      };
    }

    const url = buildGameUrl(gameId, baseUrl);
    const p = await ensurePage();

    await p.goto(url);
    const ready = await waitForDebugBridge(p, timeout);

    if (!ready) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              success: false,
              error: "Timeout waiting for GodotDebugBridge to become ready",
              url,
            }),
          },
        ],
      };
    }

    currentGameId = gameId;

    const snapshot = await p.evaluate(async () => {
      const w = window as unknown as WindowWithBridge;
      if (!w.GodotDebugBridge) return null;
      return w.GodotDebugBridge.getSnapshot({ detail: "med" });
    });

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            success: true,
            gameId,
            url,
            snapshot,
          }),
        },
      ],
    };
  }
);

server.tool(
  "game_snapshot",
  "Get the current game state snapshot",
  {
    detail: z.enum(["low", "med", "high"]).optional().describe("Detail level (default: med)"),
    filterTemplate: z.string().optional().describe("Filter entities by template"),
    filterTags: z.array(z.string()).optional().describe("Filter entities by tags"),
    debug: z.boolean().optional().describe("Include debug info about bridge state"),
  },
  async (args) => {
    const detail = (args.detail as "low" | "med" | "high" | undefined) ?? "med";
    const filterTemplate = args.filterTemplate as string | undefined;
    const filterTags = args.filterTags as string[] | undefined;
    const debug = (args.debug as boolean | undefined) ?? false;

    if (!page) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: "No game open. Call game_open first." }) }],
      };
    }

    const opts = { detail, filterTemplate, filterTags };
    
    const result = await page.evaluate(async (evalOpts: { detail: string; filterTemplate?: string; filterTags?: string[]; debug: boolean }) => {
      const w = window as unknown as WindowWithBridge & { GodotBridge?: Record<string, unknown> };
      
      const debugInfo: Record<string, unknown> = {};
      
      if (evalOpts.debug) {
        debugInfo.hasGodotBridge = !!w.GodotBridge;
        debugInfo.hasGodotDebugBridge = !!w.GodotDebugBridge;
        
        const iframes = document.querySelectorAll('iframe');
        debugInfo.iframeCount = iframes.length;
        debugInfo.iframeTitles = Array.from(iframes).map(f => f.title || f.id || f.src?.slice(0, 50) || 'no-id');
        
        const godotIframe = document.querySelector('iframe[title="Godot Game Engine"]') as HTMLIFrameElement | null;
        debugInfo.godotIframeFound = !!godotIframe;
        
        if (godotIframe?.contentWindow) {
          const iframeWin = godotIframe.contentWindow as { GodotBridge?: Record<string, unknown> };
          debugInfo.iframeHasGodotBridge = !!iframeWin.GodotBridge;
          if (iframeWin.GodotBridge) {
            debugInfo.iframeBridgeMethods = Object.keys(iframeWin.GodotBridge).slice(0, 30);
          }
        }
        
        if (w.GodotBridge) {
          debugInfo.godotBridgeMethods = Object.keys(w.GodotBridge).filter(k => 
            typeof (w.GodotBridge as Record<string, unknown>)[k] === 'function' || k.startsWith('get') || k.startsWith('_')
          );
          debugInfo.hasGetSceneSnapshot = 'getSceneSnapshot' in w.GodotBridge;
          debugInfo.hasGetAllTransforms = 'getAllTransforms' in w.GodotBridge;
        }
        
        if (godotIframe?.contentWindow) {
          const iframeWin = godotIframe.contentWindow as { GodotBridge?: { getAllTransforms?: () => void; _lastResult?: unknown } };
          if (iframeWin.GodotBridge?.getAllTransforms) {
            iframeWin.GodotBridge.getAllTransforms();
            debugInfo.iframeAllTransformsResult = iframeWin.GodotBridge._lastResult;
          }
        }
      }
      
      if (!w.GodotDebugBridge) {
        return { error: "GodotDebugBridge not available", debugInfo };
      }
      
      const snapshot = await w.GodotDebugBridge.getSnapshot({ detail: evalOpts.detail, filterTemplate: evalOpts.filterTemplate, filterTags: evalOpts.filterTags });
      
      if (evalOpts.debug) {
        return { snapshot, debugInfo };
      }
      return snapshot;
    }, { ...opts, debug });

    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "game_tap",
  "Simulate a tap at world coordinates",
  {
    x: z.number().describe("X coordinate in world units (meters)"),
    y: z.number().describe("Y coordinate in world units (meters)"),
  },
  async (args) => {
    const x = args.x as number;
    const y = args.y as number;

    if (!page) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: "No game open. Call game_open first." }) }],
      };
    }

    const result = await page.evaluate(async (coords: { x: number; y: number }) => {
      const w = window as unknown as WindowWithBridge;
      if (!w.GodotDebugBridge) return { error: "GodotDebugBridge not available" };
      return w.GodotDebugBridge.simulateTap(coords.x, coords.y);
    }, { x, y });

    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  }
);

server.tool(
  "game_drag",
  "Simulate a drag gesture from start to end position",
  {
    startX: z.number().describe("Start X coordinate in world units"),
    startY: z.number().describe("Start Y coordinate in world units"),
    endX: z.number().describe("End X coordinate in world units"),
    endY: z.number().describe("End Y coordinate in world units"),
    durationMs: z.number().optional().describe("Duration of drag in milliseconds (default: 500)"),
  },
  async (args) => {
    const startX = args.startX as number;
    const startY = args.startY as number;
    const endX = args.endX as number;
    const endY = args.endY as number;
    const durationMs = (args.durationMs as number | undefined) ?? 500;

    if (!page) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: "No game open. Call game_open first." }) }],
      };
    }

    const params = { startX, startY, endX, endY, durationMs };
    await page.evaluate(async (p: typeof params) => {
      const w = window as unknown as WindowWithBridge;
      if (!w.GodotDebugBridge) return;
      await w.GodotDebugBridge.simulateDrag(p.startX, p.startY, p.endX, p.endY, p.durationMs);
    }, params);

    return {
      content: [{ type: "text" as const, text: JSON.stringify({ success: true, from: { x: startX, y: startY }, to: { x: endX, y: endY }, durationMs }) }],
    };
  }
);

server.tool(
  "game_wait_stationary",
  "Wait for an entity to stop moving",
  {
    entityId: z.string().describe("Entity ID to wait for"),
    timeout: z.number().optional().describe("Timeout in milliseconds (default: 5000)"),
    epsilon: z.number().optional().describe("Velocity threshold to consider stationary (default: 0.1)"),
  },
  async (args) => {
    const entityId = args.entityId as string;
    const timeout = (args.timeout as number | undefined) ?? 5000;
    const epsilon = (args.epsilon as number | undefined) ?? 0.1;

    if (!page) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: "No game open. Call game_open first." }) }],
      };
    }

    const params = { entityId, timeout, epsilon };
    const result = await page.evaluate(async (p: typeof params) => {
      const w = window as unknown as WindowWithBridge;
      if (!w.GodotDebugBridge) return { error: "GodotDebugBridge not available" };
      return w.GodotDebugBridge.waitForStationary(p.entityId, p.timeout, p.epsilon);
    }, params);

    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  }
);

server.tool(
  "game_wait_collision",
  "Wait for a collision between two entities",
  {
    entityA: z.string().describe("First entity ID"),
    entityB: z.string().describe("Second entity ID"),
    timeout: z.number().optional().describe("Timeout in milliseconds (default: 5000)"),
  },
  async (args) => {
    const entityA = args.entityA as string;
    const entityB = args.entityB as string;
    const timeout = (args.timeout as number | undefined) ?? 5000;

    if (!page) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: "No game open. Call game_open first." }) }],
      };
    }

    const params = { entityA, entityB, timeout };
    const result = await page.evaluate(async (p: typeof params) => {
      const w = window as unknown as WindowWithBridge;
      if (!w.GodotDebugBridge) return { error: "GodotDebugBridge not available" };
      return w.GodotDebugBridge.waitForCollision(p.entityA, p.entityB, p.timeout);
    }, params);

    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  }
);

server.tool(
  "game_screenshot",
  "Capture a screenshot of the current game",
  {
    filename: z.string().optional().describe("Save to file path (returns base64 if not specified)"),
  },
  async (args) => {
    const filename = args.filename as string | undefined;

    if (!page) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: "No game open. Call game_open first." }) }],
      };
    }

    const godotElement = await page.$('iframe[title="Godot Game Engine"], canvas#canvas, canvas');
    
    if (!godotElement) {
      const buffer = await page.screenshot({ type: "png" });
      const base64 = buffer.toString("base64");
      
      if (filename) {
        const fs = await import("fs/promises");
        await fs.writeFile(filename, buffer);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ success: true, filename, note: "Full page screenshot (Godot element not found)" }),
            },
          ],
        };
      }
      
      return {
        content: [
          {
            type: "image" as const,
            data: base64,
            mimeType: "image/png",
          },
        ],
      };
    }

    const buffer = await godotElement.screenshot({ type: "png" });
    const base64 = buffer.toString("base64");
    const box = await godotElement.boundingBox();

    if (filename) {
      const fs = await import("fs/promises");
      await fs.writeFile(filename, buffer);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ 
              success: true, 
              filename, 
              width: box?.width ?? 0, 
              height: box?.height ?? 0 
            }),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "image" as const,
          data: base64,
          mimeType: "image/png",
        },
      ],
    };
  }
);

interface AssertParams {
  type: string;
  entityId?: string;
  position?: { x: number; y: number };
  tolerance?: number;
  threshold?: number;
  entityA?: string;
  entityB?: string;
  tag?: string;
  count?: number;
}

server.tool(
  "game_assert",
  "Run an assertion on the game state",
  {
    type: z.enum(["exists", "nearPosition", "hasVelocity", "isStationary", "collisionOccurred", "hasTag", "entityCount"]).describe("Assertion type"),
    entityId: z.string().optional().describe("Entity ID (for entity-specific assertions)"),
    position: z.object({ x: z.number(), y: z.number() }).optional().describe("Target position (for nearPosition)"),
    tolerance: z.number().optional().describe("Position tolerance (for nearPosition)"),
    threshold: z.number().optional().describe("Velocity threshold (for hasVelocity/isStationary)"),
    entityA: z.string().optional().describe("First entity (for collisionOccurred)"),
    entityB: z.string().optional().describe("Second entity (for collisionOccurred)"),
    tag: z.string().optional().describe("Tag to check (for hasTag/entityCount)"),
    count: z.number().optional().describe("Expected count (for entityCount)"),
  },
  async (args) => {
    const params: AssertParams = {
      type: args.type as string,
      entityId: args.entityId as string | undefined,
      position: args.position as { x: number; y: number } | undefined,
      tolerance: args.tolerance as number | undefined,
      threshold: args.threshold as number | undefined,
      entityA: args.entityA as string | undefined,
      entityB: args.entityB as string | undefined,
      tag: args.tag as string | undefined,
      count: args.count as number | undefined,
    };

    if (!page) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: "No game open. Call game_open first." }) }],
      };
    }

    const result = await page.evaluate(async (p: AssertParams) => {
      const w = window as unknown as WindowWithBridge;
      if (!w.GodotDebugBridge) return { error: "GodotDebugBridge not available" };

      const bridge = w.GodotDebugBridge;
      switch (p.type) {
        case "exists":
          return bridge.assert.exists(p.entityId!);
        case "nearPosition":
          return bridge.assert.nearPosition(p.entityId!, p.position!, p.tolerance ?? 0.5);
        case "hasVelocity":
          return bridge.assert.hasVelocity(p.entityId!, p.threshold ?? 1.0);
        case "isStationary":
          return bridge.assert.isStationary(p.entityId!, p.threshold ?? 0.1);
        case "collisionOccurred":
          return bridge.assert.collisionOccurred(p.entityA!, p.entityB!);
        case "hasTag":
          return bridge.assert.hasTag(p.entityId!, p.tag!);
        case "entityCount":
          return bridge.assert.entityCount(p.tag!, p.count!);
        default:
          return { error: `Unknown assertion type: ${p.type}` };
      }
    }, params);

    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  }
);

async function queryGodot<T>(method: string, args: unknown[] = []): Promise<T | { error: string }> {
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

server.tool(
  "game_find",
  "Find entities by template, tag, or name pattern",
  {
    template: z.string().optional().describe("Filter by template (e.g., 'candy', 'ball')"),
    tag: z.string().optional().describe("Filter by tag"),
    name: z.string().optional().describe("Filter by name pattern (partial match)"),
    limit: z.number().optional().describe("Max results (default: 20)"),
  },
  async (args) => {
    const opts = {
      template: args.template as string | undefined,
      tag: args.tag as string | undefined,
      name: args.name as string | undefined,
      limit: (args.limit as number | undefined) ?? 20,
    };

    const result = await queryGodot<unknown[]>("findEntities", [opts]);
    return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "game_entity",
  "Get detailed info about a specific entity",
  {
    id: z.string().describe("Entity ID"),
  },
  async (args) => {
    const id = args.id as string;
    const result = await queryGodot("getEntityDetails", [id]);
    return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "game_at_point",
  "Find entities at or near a world position",
  {
    x: z.number().describe("X coordinate in world units"),
    y: z.number().describe("Y coordinate in world units"),
  },
  async (args) => {
    const x = args.x as number;
    const y = args.y as number;
    const result = await queryGodot<unknown[]>("getEntitiesAtPoint", [x, y]);
    return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "game_in_rect",
  "Find entities within a rectangular region",
  {
    minX: z.number().describe("Min X coordinate"),
    minY: z.number().describe("Min Y coordinate"),
    maxX: z.number().describe("Max X coordinate"),
    maxY: z.number().describe("Max Y coordinate"),
  },
  async (args) => {
    const { minX, minY, maxX, maxY } = args as { minX: number; minY: number; maxX: number; maxY: number };
    const result = await queryGodot<unknown[]>("getEntitiesInRect", [minX, minY, maxX, maxY]);
    return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "game_count",
  "Count entities by template or tag",
  {
    template: z.string().optional().describe("Filter by template"),
    tag: z.string().optional().describe("Filter by tag"),
  },
  async (args) => {
    const opts = {
      template: args.template as string | undefined,
      tag: args.tag as string | undefined,
    };
    const result = await queryGodot("getEntityCount", [opts]);
    return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "game_close",
  "Close the browser and clean up",
  {},
  async () => {
    if (page) {
      await page.close();
      page = null;
    }
    if (browser) {
      await browser.close();
      browser = null;
    }
    currentGameId = null;

    return {
      content: [{ type: "text" as const, text: JSON.stringify({ success: true, message: "Browser closed" }) }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
