#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { GameInspectorState } from "./types.js";
import { registerGameManagementTools } from "./tools/game-management.js";
import { registerSnapshotTools } from "./tools/snapshot.js";
import { registerInteractionTools } from "./tools/interaction.js";
import { registerQueryTools } from "./tools/query.js";
import { registerPropertiesTools } from "./tools/properties.js";
import { registerLifecycleTools } from "./tools/lifecycle.js";
import { registerTimeControlTools } from "./tools/time-control.js";
import { registerEventsTools } from "./tools/events.js";
import { registerPhysicsTools } from "./tools/physics.js";

const state: GameInspectorState = {
  browser: null,
  page: null,
  currentGameId: null,
  consoleLogs: [],
  maxLogEntries: 500,
};

const server = new McpServer({
  name: "game-inspector",
  version: "1.0.0",
});

registerGameManagementTools(server, state);
registerSnapshotTools(server, state);
registerInteractionTools(server, state);
registerQueryTools(server, state);
registerPropertiesTools(server, state);
registerLifecycleTools(server, state);
registerTimeControlTools(server, state);
registerEventsTools(server, state);
registerPhysicsTools(server, state);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

process.on("SIGINT", async () => {
  if (state.browser) {
    await state.browser.close();
  }
  process.exit(0);
});

process.on("SIGTERM", async () => {
  if (state.browser) {
    await state.browser.close();
  }
  process.exit(0);
});

main().catch((error) => {
  console.error("[game-inspector] Fatal error:", error);
  process.exit(1);
});
