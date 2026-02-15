import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {
	ErrorCode,
	isInitializeRequest,
} from "@modelcontextprotocol/sdk/types.js";

import type { Env } from "@/trpc/context";
import { appRouter } from "@/trpc/router";

import { registerTrpcRouterAsMcpTools } from "./trpc-mcp-bridge";

type SessionState = {
	transport: WebStandardStreamableHTTPServerTransport;
	server: McpServer;
};

const sessions = new Map<string, SessionState>();

type JsonRpcId = string | number | null;

function jsonRpcErrorResponse(
	status: number,
	code: number,
	message: string,
	id: JsonRpcId = null,
): Response {
	return Response.json(
		{
			jsonrpc: "2.0",
			error: {
				code,
				message,
			},
			id,
		},
		{ status },
	);
}

function createMcpServer(env: Env): McpServer {
	const server = new McpServer({
		name: "slopcade-trpc-mcp",
		version: "1.0.0",
	});

	registerTrpcRouterAsMcpTools(server, appRouter, env);

	return server;
}

async function handlePost(request: Request, env: Env): Promise<Response> {
	const sessionId = request.headers.get("mcp-session-id");

	let parsedBody: unknown;
	try {
		parsedBody = await request.clone().json();
	} catch {
		return jsonRpcErrorResponse(
			400,
			ErrorCode.ParseError,
			"Invalid JSON request body",
		);
	}

	if (sessionId) {
		const state = sessions.get(sessionId);
		if (!state) {
			return jsonRpcErrorResponse(
				404,
				ErrorCode.InvalidRequest,
				`Unknown MCP session: ${sessionId}`,
			);
		}

		return state.transport.handleRequest(request, { parsedBody });
	}

	if (!isInitializeRequest(parsedBody)) {
		return jsonRpcErrorResponse(
			400,
			ErrorCode.InvalidRequest,
			"Missing MCP session. Send initialize request first.",
		);
	}

	const server = createMcpServer(env);
	let transport: WebStandardStreamableHTTPServerTransport;

	transport = new WebStandardStreamableHTTPServerTransport({
		sessionIdGenerator: () => crypto.randomUUID(),
		enableJsonResponse: true,
		onsessioninitialized: (initializedSessionId) => {
			sessions.set(initializedSessionId, {
				transport,
				server,
			});
		},
		onsessionclosed: (closedSessionId) => {
			sessions.delete(closedSessionId);
		},
	});

	await server.connect(transport);

	transport.onclose = () => {
		const id = transport.sessionId;
		if (id) {
			sessions.delete(id);
		}
		void server.close();
	};

	return transport.handleRequest(request, { parsedBody });
}

async function handleGet(request: Request): Promise<Response> {
	const sessionId = request.headers.get("mcp-session-id");
	if (!sessionId) {
		return new Response("Missing mcp-session-id header", {
			status: 400,
			headers: { "Content-Type": "text/plain" },
		});
	}

	const state = sessions.get(sessionId);
	if (!state) {
		return new Response("Unknown MCP session", {
			status: 404,
			headers: { "Content-Type": "text/plain" },
		});
	}

	return state.transport.handleRequest(request);
}

async function handleDelete(request: Request): Promise<Response> {
	const sessionId = request.headers.get("mcp-session-id");
	if (!sessionId) {
		return new Response("Missing mcp-session-id header", {
			status: 400,
			headers: { "Content-Type": "text/plain" },
		});
	}

	const state = sessions.get(sessionId);
	if (!state) {
		return new Response("Unknown MCP session", {
			status: 404,
			headers: { "Content-Type": "text/plain" },
		});
	}

	const response = await state.transport.handleRequest(request);
	sessions.delete(sessionId);
	await state.server.close();
	return response;
}

export async function handleMcpRequest(
	request: Request,
	env: Env,
): Promise<Response> {
	if (request.method === "POST") {
		return handlePost(request, env);
	}

	if (request.method === "GET") {
		return handleGet(request);
	}

	if (request.method === "DELETE") {
		return handleDelete(request);
	}

	return new Response("Method Not Allowed", {
		status: 405,
		headers: { Allow: "GET, POST, DELETE" },
	});
}
