import { expect, vi } from "vitest";
import type { PartyRoomDO } from "../PartyRoomDO";

type DurableObjectState =
	import("@cloudflare/workers-types").DurableObjectState;

export interface TrackedWebSocket extends WebSocket {
	sent: string[];
	accept(): void;
}

export function trackWebSocket(ws: WebSocket): TrackedWebSocket {
	const tracked = ws as TrackedWebSocket;
	tracked.sent = [];
	tracked.accept();
	ws.addEventListener("message", (event: MessageEvent) => {
		tracked.sent.push(
			typeof event.data === "string" ? event.data : String(event.data),
		);
	});
	return tracked;
}

export function createMockState(): {
	state: DurableObjectState;
	storage: Map<string, unknown>;
} {
	const storage = new Map<string, unknown>();
	const connectedSockets: WebSocket[] = [];
	const attachments = new WeakMap<WebSocket, unknown>();

	const state = {
		storage: {
			get: vi.fn(async (key: string) => storage.get(key)),
			put: vi.fn(async (key: string, value: unknown) => {
				storage.set(key, value);
			}),
			delete: vi.fn(async (key: string) => storage.delete(key)),
			deleteAll: vi.fn(async () => storage.clear()),
			list: vi.fn(async () => new Map()),
			setAlarm: vi.fn(),
		},
		id: { toString: () => "test-party-room-id" },
		acceptWebSocket(ws: WebSocket) {
			(ws as any).accept();
			connectedSockets.push(ws);
			(ws as any).serializeAttachment = (data: unknown) => {
				attachments.set(ws, JSON.parse(JSON.stringify(data)));
			};
			(ws as any).deserializeAttachment = () => {
				return attachments.get(ws) ?? null;
			};

			const room = (state as any).__partyRoom;
			if (room) {
				ws.addEventListener("message", (event: MessageEvent) => {
					void room.webSocketMessage(ws, event.data);
				});
				ws.addEventListener("close", (event: CloseEvent) => {
					void room.webSocketClose(
						ws,
						event.code,
						event.reason,
						event.wasClean,
					);
				});
				ws.addEventListener("error", () => {
					void room.webSocketError(ws, new Error("socket error"));
				});
			}
		},
		getWebSockets(): WebSocket[] {
			return connectedSockets.filter((ws) => {
				const openState = (WebSocket as any).READY_STATE_OPEN;
				return ws.readyState === openState || ws.readyState === 1;
			});
		},
	} as unknown as DurableObjectState;

	return { state, storage };
}

export function makeRequest(
	method: string,
	path: string,
	body?: unknown,
	headers?: Record<string, string>,
): Request {
	const init: RequestInit = { method, headers: headers ?? {} };
	if (body) {
		init.body = JSON.stringify(body);
		(init.headers as Record<string, string>)["Content-Type"] =
			"application/json";
	}
	return new Request(`https://fake-host${path}`, init);
}

export async function initRoom(
	dobj: PartyRoomDO,
	hostId = "host-1",
	hostToken = "token-abc",
	options?: {
		template?: string;
		minPlayers?: number;
		serverScriptCode?: string;
	},
) {
	const res = await dobj.fetch(
		makeRequest("POST", "/init", {
			hostId,
			hostToken,
			...(options?.template && { template: options.template }),
			...(options?.minPlayers !== undefined && {
				minPlayers: options.minPlayers,
			}),
			...(options?.serverScriptCode && {
				modules: { server: options.serverScriptCode },
			}),
		}),
	);
	expect(res.status).toBe(200);
	return { hostId, hostToken };
}

export async function connectHost(
	dobj: PartyRoomDO,
	token = "token-abc",
): Promise<TrackedWebSocket> {
	const res = await dobj.fetch(
		makeRequest("GET", `/ws?role=host&token=${token}`, undefined, {
			Upgrade: "websocket",
		}),
	);
	expect(res.status).toBe(101);
	return trackWebSocket((res as any).webSocket);
}

export async function connectPlayer(
	dobj: PartyRoomDO,
	name: string,
	token?: string,
): Promise<{ ws: TrackedWebSocket; playerId: string; playerToken: string }> {
	const query = token
		? `/ws?role=player&token=${token}`
		: `/ws?role=player&name=${encodeURIComponent(name)}`;
	const res = await dobj.fetch(
		makeRequest("GET", query, undefined, { Upgrade: "websocket" }),
	);
	expect(res.status).toBe(101);
	const ws = trackWebSocket((res as any).webSocket);
	return { ws, playerId: "", playerToken: "" };
}

export async function connectAudience(
	dobj: PartyRoomDO,
	name: string,
): Promise<TrackedWebSocket> {
	const res = await dobj.fetch(
		makeRequest(
			"GET",
			`/ws?role=audience&name=${encodeURIComponent(name)}`,
			undefined,
			{ Upgrade: "websocket" },
		),
	);
	expect(res.status).toBe(101);
	return trackWebSocket((res as any).webSocket);
}

export function parseSent(ws: TrackedWebSocket): Array<Record<string, any>> {
	return ws.sent.map((s) => JSON.parse(s));
}

export function findMessage(
	ws: TrackedWebSocket,
	type: string,
): Record<string, any> | undefined {
	return parseSent(ws).find((m) => m.type === type);
}

export function findMessages(
	ws: TrackedWebSocket,
	type: string,
): Array<Record<string, any>> {
	return parseSent(ws).filter((m) => m.type === type);
}

export async function extractPlayerCredentials(
	ws: TrackedWebSocket,
	vi: { runAllTimersAsync: () => Promise<void> },
): Promise<{ playerId: string; playerToken: string }> {
	await vi.runAllTimersAsync();
	const tokenMsg = parseSent(ws).find((m) => m.type === "player_token");
	if (!tokenMsg) throw new Error("No player_token message received");
	return { playerId: tokenMsg.playerId, playerToken: tokenMsg.token };
}
