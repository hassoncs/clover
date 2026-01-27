import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GameInspectorState, AssertParams, ConsoleLogEntry } from "../types.js";
import { queryGodot, getRecentLogs, takeScreenshot } from "../utils.js";

interface QueryPointResult {
  entities: Array<{ entityId: string; shapeIndex: number }>;
  point: { x: number; y: number };
}

export function registerInteractionTools(server: McpServer, state: GameInspectorState) {
  server.tool(
    "simulate_input",
    "Simulate any type of user input - goes through the same code path as real input",
    {
      type: z.enum([
        "tap",
        "mouse_move",
        "mouse_leave",
        "drag_start",
        "drag_move",
        "drag_end",
        "key_down",
        "key_up",
      ]).describe("Input type to simulate"),
      
      worldX: z.number().optional().describe("World X coordinate (for position-based inputs)"),
      worldY: z.number().optional().describe("World Y coordinate (for position-based inputs)"),
      
      startWorldX: z.number().optional().describe("Drag start X (for drag_start)"),
      startWorldY: z.number().optional().describe("Drag start Y (for drag_start)"),
      
      targetEntityId: z.string().optional().describe("Entity being dragged (for drag_start)"),
      
      velocity: z.object({
        x: z.number(),
        y: z.number(),
      }).optional().describe("Release velocity (for drag_end)"),
      
      key: z.enum(["left", "right", "up", "down", "jump", "action"]).optional().describe("Button key (for key_down/key_up)"),
      
      waitMs: z.number().optional().describe("Time to wait after input before capturing screenshot/logs (default: 100ms)"),
      skipScreenshot: z.boolean().optional().describe("Skip automatic screenshot capture (default: false)"),
      skipLogs: z.boolean().optional().describe("Skip returning console logs (default: false)"),
    },
    async (args) => {
      const inputType = args.type as string;
      const worldX = args.worldX as number | undefined;
      const worldY = args.worldY as number | undefined;
      const startWorldX = args.startWorldX as number | undefined;
      const startWorldY = args.startWorldY as number | undefined;
      let targetEntityId = args.targetEntityId as string | undefined;
      const velocity = args.velocity as { x: number; y: number } | undefined;
      const key = args.key as string | undefined;
      const waitMs = (args.waitMs as number | undefined) ?? 100;
      const skipScreenshot = (args.skipScreenshot as boolean | undefined) ?? false;
      const skipLogs = (args.skipLogs as boolean | undefined) ?? false;

      if (!state.page) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "No game open. Call game_open first." }) }],
        };
      }

      if (inputType === "tap" && worldX !== undefined && worldY !== undefined && !targetEntityId) {
        const queryResult = await queryGodot<QueryPointResult>(
          state.page,
          "queryPoint",
          [worldX, worldY, { includeSensors: true }]
        );
        if (queryResult && !("error" in queryResult) && queryResult.entities?.length > 0) {
          targetEntityId = queryResult.entities[0].entityId;
        }
      }

      const result = await state.page.evaluate(
        async (params: {
          type: string;
          worldX?: number;
          worldY?: number;
          startWorldX?: number;
          startWorldY?: number;
          targetEntityId?: string;
          velocity?: { x: number; y: number };
          key?: string;
        }) => {
          const runtime = (window as any).__GAME_RUNTIME__;
          if (!runtime) {
            return { error: "__GAME_RUNTIME__ not available. Is the game running?" };
          }

          switch (params.type) {
            case "tap":
              if (params.worldX === undefined || params.worldY === undefined) {
                return { error: "tap requires worldX and worldY" };
              }
              runtime.setInput("tap", {
                x: 0,
                y: 0,
                worldX: params.worldX,
                worldY: params.worldY,
                targetEntityId: params.targetEntityId,
              });
              return { success: true, type: "tap", world: { x: params.worldX, y: params.worldY }, targetEntityId: params.targetEntityId };

            case "mouse_move":
              if (params.worldX === undefined || params.worldY === undefined) {
                return { error: "mouse_move requires worldX and worldY" };
              }
              runtime.setInput("mouse", {
                x: 0,
                y: 0,
                worldX: params.worldX,
                worldY: params.worldY,
              });
              return { success: true, type: "mouse_move", world: { x: params.worldX, y: params.worldY } };

            case "mouse_leave":
              runtime.clearInput("mouse");
              return { success: true, type: "mouse_leave" };

            case "drag_start":
              if (params.startWorldX === undefined || params.startWorldY === undefined) {
                return { error: "drag_start requires startWorldX and startWorldY" };
              }
              runtime.setInput("drag", {
                startX: 0,
                startY: 0,
                currentX: 0,
                currentY: 0,
                startWorldX: params.startWorldX,
                startWorldY: params.startWorldY,
                currentWorldX: params.startWorldX,
                currentWorldY: params.startWorldY,
                targetEntityId: params.targetEntityId,
              });
              return {
                success: true,
                type: "drag_start",
                world: { x: params.startWorldX, y: params.startWorldY },
                targetEntityId: params.targetEntityId,
              };

            case "drag_move": {
              if (params.worldX === undefined || params.worldY === undefined) {
                return { error: "drag_move requires worldX and worldY" };
              }
              const currentDrag = runtime.getInput?.("drag");
              if (!currentDrag) {
                return { error: "No active drag. Call drag_start first." };
              }
              runtime.setInput("drag", {
                ...currentDrag,
                currentX: 0,
                currentY: 0,
                currentWorldX: params.worldX,
                currentWorldY: params.worldY,
              });
              return { success: true, type: "drag_move", world: { x: params.worldX, y: params.worldY } };
            }

            case "drag_end":
              if (!params.velocity) {
                return { error: "drag_end requires velocity {x, y}" };
              }
              runtime.setInput("dragEnd", {
                velocityX: 0,
                velocityY: 0,
                worldVelocityX: params.velocity.x,
                worldVelocityY: params.velocity.y,
              });
              runtime.clearInput("drag");
              return {
                success: true,
                type: "drag_end",
                velocity: params.velocity,
              };

            case "key_down":
              if (!params.key) {
                return { error: "key_down requires key parameter" };
              }
              {
                const keyMap: Record<string, string> = {
                  left: "ArrowLeft",
                  right: "ArrowRight",
                  up: "ArrowUp",
                  down: "ArrowDown",
                  jump: " ",
                  action: "Enter",
                };
                const keyCode = keyMap[params.key] || params.key;
                const event = new KeyboardEvent("keydown", {
                  key: keyCode,
                  bubbles: true,
                  cancelable: true,
                });
                window.dispatchEvent(event);
              }
              return { success: true, type: "key_down", key: params.key };

            case "key_up":
              if (!params.key) {
                return { error: "key_up requires key parameter" };
              }
              {
                const keyMap: Record<string, string> = {
                  left: "ArrowLeft",
                  right: "ArrowRight",
                  up: "ArrowUp",
                  down: "ArrowDown",
                  jump: " ",
                  action: "Enter",
                };
                const keyCode = keyMap[params.key] || params.key;
                const event = new KeyboardEvent("keyup", {
                  key: keyCode,
                  bubbles: true,
                  cancelable: true,
                });
                window.dispatchEvent(event);
              }
              return { success: true, type: "key_up", key: params.key };

            default:
              return { error: `Unknown input type: ${params.type}` };
          }
        },
        { type: inputType, worldX, worldY, startWorldX, startWorldY, targetEntityId, velocity, key }
      );

      const timestampBeforeWait = Date.now();
      
      if (waitMs > 0) {
        await new Promise(resolve => setTimeout(resolve, waitMs));
      }

      let screenshotPath: string | undefined;
      if (!skipScreenshot && state.page) {
        try {
          screenshotPath = await takeScreenshot(state.page, `input-${inputType}`);
        } catch (e) {
          // Screenshot failed, continue without it
        }
      }

      let logs: ConsoleLogEntry[] = [];
      if (!skipLogs) {
        logs = getRecentLogs(state, timestampBeforeWait - 1000);
      }

      const response: Record<string, unknown> = { ...result as Record<string, unknown> };
      if (screenshotPath) {
        response.screenshotPath = screenshotPath;
      }
      if (logs.length > 0) {
        response.logs = logs.map(l => ({
          type: l.type,
          text: l.text,
          timestamp: l.timestamp,
        }));
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(response) }],
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

      if (!state.page) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "No game open. Call game_open first." }) }],
        };
      }

      const params = { entityId, timeout, epsilon };
      const result = await state.page.evaluate(async (p: typeof params) => {
        const w = window as any;
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

      if (!state.page) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "No game open. Call game_open first." }) }],
        };
      }

      const params = { entityA, entityB, timeout };
      const result = await state.page.evaluate(async (p: typeof params) => {
        const w = window as any;
        if (!w.GodotDebugBridge) return { error: "GodotDebugBridge not available" };
        return w.GodotDebugBridge.waitForCollision(p.entityA, p.entityB, p.timeout);
      }, params);

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result) }],
      };
    }
  );

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

      if (!state.page) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "No game open. Call game_open first." }) }],
        };
      }

      const result = await state.page.evaluate(async (p: AssertParams) => {
        const w = window as any;
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
}
