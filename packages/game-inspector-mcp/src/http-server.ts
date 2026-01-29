#!/usr/bin/env node
import express from "express";
import { randomUUID } from "node:crypto";
import { watch } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import type { GameInspectorState } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.MCP_PORT || "3100", 10);

const state: GameInspectorState = {
  browser: null,
  page: null,
  currentGameId: null,
  consoleLogs: [],
  maxLogEntries: 500,
};

let importCounter = 0;

type ToolHandler = (args: Record<string, unknown>) => Promise<{ content: Array<{ type: "text"; text: string }> }>;
type ToolRegistrar = (server: McpServer, state: GameInspectorState) => void;

interface ToolDefinition {
  description: string;
  schema: Record<string, unknown>;
  handler: ToolHandler;
}

interface ToolModule {
  registerGameManagementTools?: ToolRegistrar;
  registerSnapshotTools?: ToolRegistrar;
  registerInteractionTools?: ToolRegistrar;
  registerQueryTools?: ToolRegistrar;
  registerPropertiesTools?: ToolRegistrar;
  registerLifecycleTools?: ToolRegistrar;
  registerTimeControlTools?: ToolRegistrar;
  registerEventsTools?: ToolRegistrar;
  registerPhysicsTools?: ToolRegistrar;
}

const toolDefinitions: Map<string, ToolDefinition> = new Map();

async function loadAndRegisterTools() {
  const suffix = `?v=${importCounter++}`;
  
  const tempServer = {
    tool: (name: string, description: string, schema: Record<string, unknown>, handler: ToolHandler) => {
      toolDefinitions.set(name, { description, schema, handler });
    },
  } as unknown as McpServer;

  const modules = await Promise.all([
    import(`./tools/game-management.js${suffix}`) as Promise<ToolModule>,
    import(`./tools/snapshot.js${suffix}`) as Promise<ToolModule>,
    import(`./tools/interaction.js${suffix}`) as Promise<ToolModule>,
    import(`./tools/query.js${suffix}`) as Promise<ToolModule>,
    import(`./tools/properties.js${suffix}`) as Promise<ToolModule>,
    import(`./tools/lifecycle.js${suffix}`) as Promise<ToolModule>,
    import(`./tools/time-control.js${suffix}`) as Promise<ToolModule>,
    import(`./tools/events.js${suffix}`) as Promise<ToolModule>,
    import(`./tools/physics.js${suffix}`) as Promise<ToolModule>,
  ]);

  modules[0].registerGameManagementTools?.(tempServer, state);
  modules[1].registerSnapshotTools?.(tempServer, state);
  modules[2].registerInteractionTools?.(tempServer, state);
  modules[3].registerQueryTools?.(tempServer, state);
  modules[4].registerPropertiesTools?.(tempServer, state);
  modules[5].registerLifecycleTools?.(tempServer, state);
  modules[6].registerTimeControlTools?.(tempServer, state);
  modules[7].registerEventsTools?.(tempServer, state);
  modules[8].registerPhysicsTools?.(tempServer, state);

  console.error(`[game-inspector] Loaded ${toolDefinitions.size} tool handlers`);
}

await loadAndRegisterTools();

async function reloadTools() {
  console.error("[game-inspector] Reloading tools...");
  try {
    toolDefinitions.clear();
    await loadAndRegisterTools();
    console.error("[game-inspector] Tools reloaded successfully");
  } catch (err) {
    console.error("[game-inspector] Failed to reload tools:", err);
  }
}

const toolsDir = path.join(__dirname, "tools");
let reloadTimeout: ReturnType<typeof setTimeout> | null = null;

watch(toolsDir, { recursive: true }, (eventType, filename) => {
  if (filename?.endsWith(".js")) {
    if (reloadTimeout) clearTimeout(reloadTimeout);
    reloadTimeout = setTimeout(reloadTools, 100);
  }
});

function createServer(): McpServer {
  const server = new McpServer({
    name: "game-inspector",
    version: "1.0.0",
  });

  for (const [name, def] of toolDefinitions) {
    server.tool(
      name,
      def.description,
      def.schema,
      async (args) => {
        const currentDef = toolDefinitions.get(name);
        if (!currentDef) {
          return { content: [{ type: "text" as const, text: JSON.stringify({ error: `Tool ${name} not found` }) }] };
        }
        return currentDef.handler(args as Record<string, unknown>);
      }
    );
  }

  return server;
}

const app = express();
app.use(express.json());

const transports: Record<string, { transport: StreamableHTTPServerTransport; server: McpServer }> = {};

app.post("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports[sessionId]) {
    transport = transports[sessionId].transport;
  } else if (!sessionId && isInitializeRequest(req.body)) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        transports[id] = { transport, server };
        console.error(`[game-inspector] Session initialized: ${id}`);
      },
    });

    transport.onclose = () => {
      if (transport.sessionId) {
        delete transports[transport.sessionId];
        console.error(`[game-inspector] Session closed: ${transport.sessionId}`);
      }
    };

    const server = createServer();
    await server.connect(transport);
  } else {
    res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Invalid session" },
      id: null,
    });
    return;
  }

  await transport.handleRequest(req, res, req.body);
});

app.get("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string;
  const session = transports[sessionId];
  if (session) {
    await session.transport.handleRequest(req, res);
  } else {
    res.status(400).send("Invalid session");
  }
});

app.delete("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string;
  const session = transports[sessionId];
  if (session) {
    await session.transport.handleRequest(req, res);
  } else {
    res.status(400).send("Invalid session");
  }
});

app.post("/reload", async (_req, res) => {
  await reloadTools();
  res.json({ success: true, message: "Tools reloaded" });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", sessions: Object.keys(transports).length });
});

async function cleanup() {
  console.error("[game-inspector] Shutting down...");
  if (state.browser) {
    await state.browser.close();
  }
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

app.listen(PORT, () => {
  console.error(`[game-inspector] HTTP server running on http://localhost:${PORT}/mcp`);
  console.error(`[game-inspector] Watching ${toolsDir} for changes`);
});
