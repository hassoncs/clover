import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GameInspectorState, WindowWithBridge } from '../types.js'
import { takeScreenshot, takeScreenshotToBuffer } from '../utils.js'

export function registerSnapshotTools(server: McpServer, state: GameInspectorState) {
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

      if (!state.page) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "No game open. Call game_open first." }) }],
        };
      }

      const opts = { detail, filterTemplate, filterTags };
      
      const result = await state.page.evaluate(async (evalOpts: { detail: string; filterTemplate?: string; filterTags?: string[]; debug: boolean }) => {
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

        // Define interface for the snapshot to avoid 'unknown' type issues
        interface SnapshotEntity {
          id: string;
          template?: string;
          position: { x: number; y: number };
          angle?: number;
          velocity?: { x: number; y: number };
          angularVelocity?: number;
          physics?: {
            bodyType: string;
            mass?: number;
            isSleeping?: boolean;
          };
          visible?: boolean;
          zIndex?: number;
          meta?: Record<string, unknown>;
        }

        interface GameSnapshot {
          protocolVersion: string;
          timestamp: number;
          frameId: number;
          world: {
            pixelsPerMeter: number;
            gravity: { x: number; y: number };
            bounds: { width: number; height: number };
          };
          camera: {
            position: { x: number; y: number };
            zoom: number;
            target?: string;
          };
          viewport: { width: number; height: number };
          entities: SnapshotEntity[];
          entityCount: number;
        }

        const snapshot = await w.GodotDebugBridge.getSnapshot({ detail: evalOpts.detail, filterTemplate: evalOpts.filterTemplate, filterTags: evalOpts.filterTags }) as GameSnapshot;

        // Compute interactables
        const interactables: {
          entities: Array<{
            entityId: string;
            tapPoint: { x: number; y: number };
            sources: ('physics' | 'explicit')[];
            template?: string;
            tags?: string[];
          }>;
          explicitTargets: string[];
        } = {
          entities: [],
          explicitTargets: [],
        };

        // Get game rules to find explicit tap targets
        const gameRuntime = (window as unknown as { __GAME_RUNTIME__?: { getGameDefinition?: () => unknown } }).__GAME_RUNTIME__;
        if (gameRuntime?.getGameDefinition) {
          try {
            const gameDef = gameRuntime.getGameDefinition();
            const rules = (gameDef as { rules?: Array<{ trigger?: { type: string; target?: string } }> })?.rules ?? [];
            const tapRules = rules.filter(r => r.trigger?.type === 'tap');
            interactables.explicitTargets = tapRules
              .map(r => r.trigger?.target)
              .filter((t): t is string => typeof t === 'string');
          } catch {
            // Failed to get game definition - continue without explicit targets
          }
        }

        // Known templates that have physics bodies
        const KNOWN_PHYSICS_TEMPLATES = new Set([
          'tubeSensor',
          'tubeWall',
          'tubeBottom',
          'wall',
          'ground',
          'platform',
          'peg',
          'bumper',
          'paddle',
        ]);

        // For each entity in snapshot, determine if tappable
        for (const entity of snapshot.entities ?? []) {
          const sources: ('physics' | 'explicit')[] = [];

          // Check if has physics body
          const hasPhysics = entity.physics !== undefined ||
            (entity.template !== undefined && KNOWN_PHYSICS_TEMPLATES.has(entity.template));
          if (hasPhysics) {
            sources.push('physics');
          }

          // Get entity tags from meta
          const entityTags: string[] = [];
          if (entity.meta && typeof entity.meta === 'object' && !Array.isArray(entity.meta)) {
            const meta = entity.meta as Record<string, unknown>;
            if (Array.isArray(meta.tags)) {
              entityTags.push(...(meta.tags as string[]));
            }
          }

          // Check if matches explicit target tag
          if (entityTags.some(t => interactables.explicitTargets.includes(t))) {
            sources.push('explicit');
          }

          if (sources.length > 0) {
            interactables.entities.push({
              entityId: entity.id,
              tapPoint: entity.position,
              sources,
              template: entity.template,
              tags: entityTags.length > 0 ? entityTags : undefined,
            });
          }
        }

        const result = { ...snapshot, interactables };

        if (evalOpts.debug) {
          return { snapshot: result, debugInfo };
        }
        return result;
      }, { ...opts, debug });

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
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

      if (!state.page) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "No game open. Call game_open first." }) }],
        };
      }

      if (filename) {
        const result = await takeScreenshot(state.page, { filepath: filename });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ 
                success: true, 
                filename: result.filepath, 
                width: result.width, 
                height: result.height,
                isGameCanvas: result.isGameCanvas,
              }),
            },
          ],
        };
      }

      const result = await takeScreenshotToBuffer(state.page);
      const base64 = result.buffer.toString("base64");

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
}
