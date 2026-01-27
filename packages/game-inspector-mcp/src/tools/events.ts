import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GameInspectorState } from "../types.js";
import { queryGodot } from "../utils.js";

export function registerEventsTools(server: McpServer, state: GameInspectorState) {
  server.tool(
    "subscribe",
    "Subscribe to entity events (spawn, destroy, collision, property changes)",
    {
      eventType: z.enum(["spawn", "destroy", "collision", "propertyChange"]).describe("Event type to monitor"),
      selector: z.string().optional().describe("Entity selector (e.g., '.peg', '#ball')"),
      properties: z.array(z.string()).optional().describe("Properties to watch (for propertyChange events)"),
    },
    async (args) => {
      const request = {
        eventType: args.eventType as string,
        selector: args.selector as string | undefined,
        properties: args.properties as string[] | undefined,
      };
      const result = await queryGodot(state.page, "subscribe", [request]);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "unsubscribe",
    "Unsubscribe from events",
    {
      subscriptionId: z.string().describe("Subscription ID returned from subscribe"),
    },
    async (args) => {
      const subId = args.subscriptionId as string;
      const result = await queryGodot(state.page, "unsubscribe", [subId]);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "poll_events",
    "Poll for new events since last poll",
    {
      subscriptionId: z.string().optional().describe("Subscription ID (omit to get all events)"),
      limit: z.number().optional().describe("Max events to return (default: 100)"),
    },
    async (args) => {
      const options = {
        subscriptionId: args.subscriptionId as string | undefined,
        limit: args.limit as number | undefined,
      };
      const result = await queryGodot(state.page, "pollEvents", [options]);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );
}
