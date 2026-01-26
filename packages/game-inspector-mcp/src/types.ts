import type { Browser, Page } from "playwright";

export const AVAILABLE_GAMES = [
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

export const AVAILABLE_EXAMPLES = [
  "draggable_cubes",
  "dynamic_images",
  "dynamic_shader",
  "glb_viewer",
  "shader_test",
  "spinning_wheel",
  "texture_button",
  "ui_components",
  "vfx_showcase",
] as const;

export type GameId = (typeof AVAILABLE_GAMES)[number];
export type ExampleId = (typeof AVAILABLE_EXAMPLES)[number];

export const DEFAULT_BASE_URL = "http://localhost:8085";
export const DEFAULT_TIMEOUT = 30000;

export interface DebugBridge {
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

export interface WindowWithBridge {
  GodotDebugBridge?: DebugBridge;
}

export interface AssertParams {
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

export interface GameInspectorState {
  browser: Browser | null;
  page: Page | null;
  currentGameId: string | null;
}
