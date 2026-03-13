import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { type PenDocument, parsePenDocument } from "@slopcade/shared/types/pen";
import express from "express";
import fs from "fs/promises";
import { WebSocket, WebSocketServer } from "ws";
import { z } from "zod";
import { resolvePencilServerConfig } from "./config.js";
import { applyDesignChatOpsToDocument } from "./designChatOps.js";

const config = resolvePencilServerConfig();

function createEmptyDocument(): PenDocument {
	return { version: 1, children: [] };
}

async function loadDocument(): Promise<PenDocument> {
	try {
		const data = await fs.readFile(config.canvasFile, "utf-8");
		return parsePenDocument(JSON.parse(data));
	} catch {
		return createEmptyDocument();
	}
}

async function saveDocument(doc: PenDocument) {
	await fs.writeFile(config.canvasFile, JSON.stringify(doc, null, 2));
}

async function main() {
	let document = await loadDocument();

	let activeTransport: SSEServerTransport | null = null;

	const server = new McpServer({
		name: "pencil-server",
		version: "1.0.0",
	});

	const wss = new WebSocketServer({ noServer: true });

	function broadcastState() {
		const state = JSON.stringify({ type: "state_update", payload: document });
		for (const client of wss.clients) {
			if (client.readyState === WebSocket.OPEN) {
				client.send(state);
			}
		}
	}

	function calculateCenter(opsArray: any[]): { x?: number; y?: number } {
		for (const op of opsArray) {
			if (op.type === "addFrame" || op.type === "addElement") {
				const target = op.type === "addFrame" ? op : op.element;
				if (
					target &&
					typeof target.x === "number" &&
					typeof target.y === "number"
				) {
					// Just pick the first sensible coord
					return {
						x: target.x + (target.width || 100) / 2,
						y: target.y + (target.height || 100) / 2,
					};
				}
			} else if (op.type === "updateElement" && op.patch) {
				if (typeof op.patch.x === "number" && typeof op.patch.y === "number") {
					return { x: op.patch.x, y: op.patch.y };
				}
			}
		}
		return { x: 500, y: 500 }; // Fallback
	}

	function broadcastAgentCursor(opsArray: any[]) {
		const { x, y } = calculateCenter(opsArray);
		const cursor = JSON.stringify({
			type: "agent_cursor_moved",
			payload: {
				agentId: "radbot",
				x,
				y,
				action: `Applying ${opsArray.length} operation(s)...`,
				timestamp: Date.now(),
			},
		});

		for (const client of wss.clients) {
			if (client.readyState === WebSocket.OPEN) {
				client.send(cursor);
			}
		}
	}

	server.tool(
		"pencil_batch_design",
		"Apply batch operations to document. Pass operations as a serialized JSON array representing the ops.",
		{
			filePath: z.string().optional(),
			operations: z.string(),
		},
		async ({ operations }) => {
			try {
				console.log("Applying operations:", operations);

				const opsArray = JSON.parse(operations);

				broadcastAgentCursor(opsArray);

				const result = applyDesignChatOpsToDocument(document, opsArray);
				document = result.nextDocument;

				await saveDocument(document);
				broadcastState();

				return {
					content: [
						{
							type: "text",
							text: `Applied ${
								result.appliedOps
							} operations. Errors: ${result.errors.join(", ")}`,
						},
					],
				};
			} catch (err) {
				return {
					content: [{ type: "text", text: `Error: ${err}` }],
				};
			}
		},
	);

	const app = express();

	app.get("/mcp", async (req, res) => {
		const transport = new SSEServerTransport("/mcp/messages", res);
		activeTransport = transport;
		await server.connect(transport);
	});

	app.post("/mcp/messages", async (req, res) => {
		if (!activeTransport) {
			res.status(400).send("No active MCP session");
			return;
		}
		await activeTransport.handlePostMessage(req, res);
	});

	app.get("/health", (_req, res) => {
		res.json({
			status: "ok",
			port: config.port,
			sessionId: config.sessionId,
			projectRoot: config.projectRoot,
			canvasFile: config.canvasFile,
		});
	});

	const httpServer = app.listen(config.port, config.host, () => {
		console.log(`🔌 Pencil Server running on port ${config.port}`);
	});

	httpServer.on("upgrade", (request, socket, head) => {
		if (request.url === "/ws") {
			wss.handleUpgrade(request, socket, head, (ws) => {
				wss.emit("connection", ws, request);
			});
		} else {
			socket.destroy();
		}
	});

	wss.on("connection", (ws) => {
		ws.send(JSON.stringify({ type: "state_update", payload: document }));

		ws.on("message", async (data) => {
			try {
				const msg = JSON.parse(data.toString());
				if (msg.type === "delta") {
					const result = applyDesignChatOpsToDocument(
						document,
						msg.payload.ops,
					);
					document = result.nextDocument;
					await saveDocument(document);
					broadcastState();
				} else if (msg.type === "chat_op") {
					const result = applyDesignChatOpsToDocument(document, msg.ops);
					document = result.nextDocument;
					await saveDocument(document);
					broadcastState();
				}
			} catch (e) {
				console.error("Failed to process socket message", e);
			}
		});
	});
}

main().catch(console.error);
