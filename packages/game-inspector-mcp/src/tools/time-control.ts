import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GameInspectorState } from "../types.js";
import { queryGodot, takeScreenshot, getScreenshotsDir } from "../utils.js";
import { createFilmstrip, type FilmstripFrame } from "../filmstrip.js";

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
      screenshot: z.boolean().optional().describe("Take a screenshot after stepping (default: false)"),
      screenshotFilename: z.string().optional().describe("Custom filename for screenshot (without extension)"),
    },
    async (args) => {
      const frames = (args.frames as number | undefined) ?? 1;
      const shouldScreenshot = (args.screenshot as boolean | undefined) ?? false;
      const screenshotFilename = args.screenshotFilename as string | undefined;
      
      const result = await queryGodot(state.page, "step", [frames]);
      
      const response: Record<string, unknown> = { ...result as object };
      
      if (shouldScreenshot && state.page) {
        const prefix = screenshotFilename ?? `step-${frames}`;
        const screenshotResult = await takeScreenshot(state.page, { prefix });
        response.screenshot = screenshotResult.filepath;
      }
      
      return { content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }] };
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

  server.tool(
    "step_sequence",
    "Step forward multiple frames, capturing screenshots at intervals, and assemble into a horizontal filmstrip image",
    {
      totalFrames: z.number().describe("Total number of physics frames to step through"),
      captureEvery: z.number().optional().describe("Capture a screenshot every N frames (default: 1)"),
      showLabels: z.boolean().optional().describe("Show frame number labels on filmstrip (default: true)"),
      maxWidth: z.number().optional().describe("Maximum width of filmstrip in pixels (default: 4000)"),
      includeStart: z.boolean().optional().describe("Include a screenshot before stepping begins (default: true)"),
    },
    async (args) => {
      const totalFrames = args.totalFrames as number;
      const captureEvery = (args.captureEvery as number | undefined) ?? 1;
      const showLabels = (args.showLabels as boolean | undefined) ?? true;
      const maxWidth = (args.maxWidth as number | undefined) ?? 4000;
      const includeStart = (args.includeStart as boolean | undefined) ?? true;

      if (!state.page) {
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ error: "No game open. Call open first." }),
          }],
        };
      }

      const frames: FilmstripFrame[] = [];
      const screenshotsDir = getScreenshotsDir();
      const sessionId = Date.now();
      let currentFrame = 0;

      if (includeStart) {
        const startPath = `${screenshotsDir}/seq-${sessionId}-frame-0.png`;
        await takeScreenshot(state.page, { filepath: startPath });
        frames.push({ imagePath: startPath, frameNumber: 0 });
      }

      for (let stepped = 0; stepped < totalFrames; stepped += captureEvery) {
        const framesToStep = Math.min(captureEvery, totalFrames - stepped);
        await queryGodot(state.page, "step", [framesToStep]);
        currentFrame += framesToStep;

        const framePath = `${screenshotsDir}/seq-${sessionId}-frame-${currentFrame}.png`;
        await takeScreenshot(state.page, { filepath: framePath });
        frames.push({ imagePath: framePath, frameNumber: currentFrame });
      }

      const filmstripPath = `${screenshotsDir}/filmstrip-${sessionId}.png`;
      const result = await createFilmstrip({
        frames,
        outputPath: filmstripPath,
        showLabels,
        maxWidth,
      });

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: true,
            filmstrip: result.path,
            dimensions: { width: result.width, height: result.height },
            frameCount: result.frameCount,
            framesSteppedThrough: totalFrames,
            capturedEvery: captureEvery,
          }, null, 2),
        }],
      };
    }
  );
}
