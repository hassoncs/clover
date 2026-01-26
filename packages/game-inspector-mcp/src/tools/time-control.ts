import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GameInspectorState } from "../types.js";
import { queryGodot } from "../utils.js";

export function registerTimeControlTools(server: McpServer, state: GameInspectorState) {
  server.tool(
    "get_time_state",
    "Get current time control state (paused, timeScale, frame, etc.)",
    {},
    async () => {
      const result = await queryGodot(state.page, "getTimeState", []);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "pause",
    "Pause game simulation",
    {},
    async () => {
      const result = await queryGodot(state.page, "pause", []);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "resume",
    "Resume game simulation",
    {},
    async () => {
      const result = await queryGodot(state.page, "resume", []);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "step",
    "Step forward N physics frames while paused",
    {
      frames: z.number().describe("Number of frames to step (default: 1)"),
    },
    async (args) => {
      const frames = (args.frames as number | undefined) ?? 1;
      const result = await queryGodot(state.page, "step", [frames]);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "set_time_scale",
    "Set time scale (e.g., 0.5 for slow-motion, 2.0 for fast-forward)",
    {
      scale: z.number().describe("Time scale multiplier (0.1 to 10.0)"),
    },
    async (args) => {
      const scale = args.scale as number;
      const result = await queryGodot(state.page, "setTimeScale", [scale]);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "set_seed",
    "Set random seed for deterministic playback",
    {
      seed: z.number().describe("Random seed value"),
      enableDeterministic: z.boolean().optional().describe("Enable deterministic mode (default: true)"),
    },
    async (args) => {
      const seed = args.seed as number;
      const options = { enableDeterministic: args.enableDeterministic as boolean | undefined };
      const result = await queryGodot(state.page, "setSeed", [seed, options]);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );
}
