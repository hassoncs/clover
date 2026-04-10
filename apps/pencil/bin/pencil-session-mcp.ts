#!/usr/bin/env node

import { resolve } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	buildPencilRuntimeRoute,
	NodePencilRuntimeLauncher,
	PencilSessionManager,
	PencilSessionRegistry,
} from "@slopcade/pencil-core";
import { z } from "zod";

const repoRoot = resolve(__dirname, "../../..");
const registry = new PencilSessionRegistry();
const manager = new PencilSessionManager(
	registry,
	new NodePencilRuntimeLauncher({ repoRoot }),
);

const server = new McpServer({
	name: "pencil-session-manager",
	version: "1.0.0",
});

server.tool(
	"pencil_list_sessions",
	"List all Pencil sessions.",
	{},
	async () => ({
		content: [
			{ type: "text", text: JSON.stringify(await manager.listSessions()) },
		],
	}),
);

server.tool(
	"pencil_start_session",
	"Start a Pencil session for a project file.",
	{
		projectRoot: z.string(),
		filePath: z.string(),
	},
	async ({ projectRoot, filePath }) => ({
		content: [
			{
				type: "text",
				text: JSON.stringify(
					await manager.startSession({
						projectRoot: resolve(projectRoot),
						filePath,
					}),
				),
			},
		],
	}),
);

server.tool(
	"pencil_stop_session",
	"Stop a Pencil session.",
	{ sessionId: z.string() },
	async ({ sessionId }) => ({
		content: [
			{
				type: "text",
				text: JSON.stringify(await manager.stopSession(sessionId)),
			},
		],
	}),
);

server.tool(
	"pencil_attach_session",
	"Get runtime details for a Pencil session.",
	{ sessionId: z.string() },
	async ({ sessionId }) => ({
		content: [
			{
				type: "text",
				text: JSON.stringify(await manager.attachSession(sessionId)),
			},
		],
	}),
);

server.tool(
	"pencil_discover_files",
	"Discover .pen files under a project root.",
	{ projectRoot: z.string() },
	async ({ projectRoot }) => ({
		content: [
			{
				type: "text",
				text: JSON.stringify({
					projectRoot: resolve(projectRoot),
					files: await manager.discoverFiles(projectRoot),
				}),
			},
		],
	}),
);

server.tool(
	"pencil_render_session_file",
	"Build the runtime or embed URL for a Pencil session/file target.",
	{
		sessionId: z.string(),
		filePath: z.string(),
		mode: z.enum(["editor", "embed", "prism"]).default("prism"),
		targetId: z.string().optional(),
	},
	async ({ sessionId, filePath, mode, targetId }) => {
		const session = await manager.attachSession(sessionId);
		if (!session) {
			throw new Error(`Unknown session: ${sessionId}`);
		}
		return {
			content: [
				{
					type: "text",
					text: JSON.stringify({
						sessionId,
						url: buildPencilRuntimeRoute({
							baseUrl: session.runtimeUrl,
							sessionId,
							projectRoot: session.projectRoot,
							filePath,
							mode,
							targetId: targetId ?? null,
						}),
					}),
				},
			],
		};
	},
);

async function main() {
	const transport = new StdioServerTransport();
	await server.connect(transport);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
