import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GameInspectorState, WindowWithBridge } from "../types.js";

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

      const godotElement = await state.page.$('iframe[title="Godot Game Engine"], canvas#canvas, canvas');
      
      if (!godotElement) {
        const buffer = await state.page.screenshot({ type: "png" });
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
}
