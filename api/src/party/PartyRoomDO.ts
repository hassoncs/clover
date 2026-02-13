import type {
	PartyInputRequest,
	PartyInputResponse,
	PartyPlayer,
	PartyRoomPhase,
	PartyRoomState,
} from "@slopcade/shared/types/party";
import {
	decodeMessage,
	encodeMessage,
	errorMessage,
	inputRequestMessage,
	phaseChangeMessage,
	playerJoinedMessage,
	playerLeftMessage,
	playerReconnectMessage,
	stateUpdateMessage,
} from "./protocol";

const CLEANUP_ALARM_MS = 4 * 60 * 60 * 1000;
const RECONNECT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 1000;
const RATE_LIMIT_MAX_MESSAGES = 10;

interface SessionRecord {
	playerId: string;
	role: "host" | "player";
	expiresAt: number;
}

interface RateLimitEntry {
	count: number;
	windowStart: number;
}

interface InputCollector {
	requestId: string;
	request: PartyInputRequest;
	responses: Map<string, PartyInputResponse>;
	timeoutId: ReturnType<typeof setTimeout> | null;
}

export class PartyRoomDO {
	private phase: PartyRoomPhase = "lobby";
	private players: Map<string, PartyPlayer> = new Map();
	private hostId: string | null = null;
	private sharedData: Record<string, unknown> = {};
	private currentRound = 0;
	private maxRounds: number | undefined;
	private rateLimits: Map<string, RateLimitEntry> = new Map();
	private disconnectTimers: Map<string, ReturnType<typeof setTimeout>> =
		new Map();
	private activeInputCollector: InputCollector | null = null;
	private initialized = false;

	constructor(private state: DurableObjectState) {}

	async fetch(request: Request): Promise<Response> {
		if (!this.initialized) {
			await this.loadState();
			this.initialized = true;
		}

		const url = new URL(request.url);

		if (request.headers.get("Upgrade") === "websocket") {
			return this.handleWebSocketUpgrade(url);
		}

		if (request.method === "POST" && url.pathname === "/init") {
			return this.handleInit(request);
		}

		return new Response("Not found", { status: 404 });
	}

	private async handleInit(request: Request): Promise<Response> {
		const body = (await request.json().catch(() => ({}))) as {
			hostId?: string;
			hostToken?: string;
		};

		if (!body.hostId || !body.hostToken) {
			return jsonResponse({ error: "hostId and hostToken required" }, 400);
		}

		this.hostId = body.hostId;
		this.phase = "lobby";

		const session: SessionRecord = {
			playerId: body.hostId,
			role: "host",
			expiresAt: Date.now() + CLEANUP_ALARM_MS,
		};
		await this.state.storage.put(`session:${body.hostToken}`, session);

		const hostPlayer: PartyPlayer = {
			id: body.hostId,
			name: "Host",
			connected: false,
			isHost: true,
		};
		this.players.set(body.hostId, hostPlayer);
		await this.saveState();

		await this.state.storage.setAlarm(Date.now() + CLEANUP_ALARM_MS);

		return jsonResponse({ ok: true }, 200);
	}

	private handleWebSocketUpgrade(url: URL): Response {
		const role = url.searchParams.get("role");
		const token = url.searchParams.get("token");
		const name = url.searchParams.get("name");

		if (role !== "host" && role !== "player") {
			return jsonResponse({ error: "role must be 'host' or 'player'" }, 400);
		}

		if (role === "host" && !token) {
			return jsonResponse({ error: "token required for host" }, 401);
		}

		if (role === "player" && !name) {
			return jsonResponse({ error: "name required for player" }, 400);
		}

		const [client, server] = Object.values(new WebSocketPair()) as [
			WebSocket,
			WebSocket,
		];

		if (role === "host") {
			this.state.acceptWebSocket(server, ["host"]);
		} else {
			const playerId = crypto.randomUUID();
			this.state.acceptWebSocket(server, [`player:${playerId}`]);

			server.serializeAttachment({ playerId, name, role: "player" });
		}

		if (role === "host" && token) {
			server.serializeAttachment({ role: "host", token });
		}

		return new Response(null, { status: 101, webSocket: client });
	}

	async webSocketOpen(ws: WebSocket): Promise<void> {
		const attachment = ws.deserializeAttachment() as {
			role: string;
			playerId?: string;
			name?: string;
			token?: string;
		} | null;

		if (!attachment) return;

		if (attachment.role === "host") {
			await this.handleHostConnect(ws, attachment.token);
		} else if (attachment.role === "player" && attachment.playerId) {
			await this.handlePlayerConnect(
				ws,
				attachment.playerId,
				attachment.name ?? "Player",
			);
		}
	}

	private async handleHostConnect(
		ws: WebSocket,
		token?: string,
	): Promise<void> {
		if (token) {
			const session = await this.state.storage.get<SessionRecord>(
				`session:${token}`,
			);
			if (!session || session.role !== "host") {
				ws.send(
					encodeMessage(errorMessage("AUTH_FAILED", "Invalid host token")),
				);
				ws.close(4001, "Invalid host token");
				return;
			}
		}

		if (this.hostId) {
			const host = this.players.get(this.hostId);
			if (host) {
				host.connected = true;
				this.players.set(this.hostId, host);
			}

			const timer = this.disconnectTimers.get(this.hostId);
			if (timer) {
				clearTimeout(timer);
				this.disconnectTimers.delete(this.hostId);
			}
		}

		ws.send(encodeMessage(stateUpdateMessage(this.buildRoomState())));
		await this.saveState();
	}

	private async handlePlayerConnect(
		ws: WebSocket,
		playerId: string,
		name: string,
	): Promise<void> {
		const existing = this.players.get(playerId);
		if (existing) {
			existing.connected = true;
			this.players.set(playerId, existing);

			const timer = this.disconnectTimers.get(playerId);
			if (timer) {
				clearTimeout(timer);
				this.disconnectTimers.delete(playerId);
			}

			this.broadcastToAll(encodeMessage(playerReconnectMessage(playerId)));
			ws.send(encodeMessage(stateUpdateMessage(this.buildRoomState())));
		} else {
			const player: PartyPlayer = {
				id: playerId,
				name,
				connected: true,
			};
			this.players.set(playerId, player);

			const sessionToken = crypto.randomUUID();
			const session: SessionRecord = {
				playerId,
				role: "player",
				expiresAt: Date.now() + CLEANUP_ALARM_MS,
			};
			await this.state.storage.put(`session:${sessionToken}`, session);

			ws.serializeAttachment({
				role: "player",
				playerId,
				name,
				sessionToken,
			});

			ws.send(encodeMessage(stateUpdateMessage(this.buildRoomState())));
			this.broadcastToAll(encodeMessage(playerJoinedMessage(player)));
		}

		await this.saveState();
	}

	async webSocketMessage(
		ws: WebSocket,
		message: string | ArrayBuffer,
	): Promise<void> {
		const attachment = ws.deserializeAttachment() as {
			role: string;
			playerId?: string;
		} | null;
		if (!attachment) return;

		const senderId =
			attachment.role === "host" ? this.hostId : attachment.playerId;
		if (!senderId) return;

		if (!this.checkRateLimit(senderId)) {
			ws.send(encodeMessage(errorMessage("RATE_LIMITED", "Too many messages")));
			return;
		}

		const parsed = decodeMessage(message);
		if (!parsed) {
			ws.send(encodeMessage(errorMessage("INVALID_MESSAGE", "Parse error")));
			return;
		}

		switch (parsed.type) {
			case "input_response":
				await this.handleInputResponse(
					senderId,
					parsed.requestId,
					parsed.response,
				);
				break;
			case "phase_change":
				if (attachment.role === "host") {
					await this.setPhase(parsed.phase, parsed.metadata);
				}
				break;
			case "state_update":
				if (attachment.role === "host") {
					this.sharedData = parsed.state.sharedData ?? {};
					this.broadcastToAll(
						encodeMessage(stateUpdateMessage(this.buildRoomState())),
					);
					await this.saveState();
				}
				break;
			default:
				break;
		}
	}

	async webSocketClose(
		ws: WebSocket,
		_code: number,
		_reason: string,
		_wasClean: boolean,
	): Promise<void> {
		const attachment = ws.deserializeAttachment() as {
			role: string;
			playerId?: string;
		} | null;
		if (!attachment) return;

		if (attachment.role === "host" && this.hostId) {
			await this.handleDisconnect(this.hostId);
		} else if (attachment.role === "player" && attachment.playerId) {
			await this.handleDisconnect(attachment.playerId);
		}
	}

	async webSocketError(ws: WebSocket): Promise<void> {
		await this.webSocketClose(ws, 1006, "error", false);
	}

	private async handleDisconnect(playerId: string): Promise<void> {
		const player = this.players.get(playerId);
		if (!player) return;

		player.connected = false;
		this.players.set(playerId, player);

		const timer = setTimeout(async () => {
			this.disconnectTimers.delete(playerId);
			this.players.delete(playerId);
			this.broadcastToAll(encodeMessage(playerLeftMessage(playerId)));
			await this.saveState();
			await this.checkEmpty();
		}, RECONNECT_WINDOW_MS);

		this.disconnectTimers.set(playerId, timer);
		await this.saveState();
	}

	private async checkEmpty(): Promise<void> {
		const connected = Array.from(this.players.values()).some(
			(p) => p.connected,
		);
		if (!connected && this.disconnectTimers.size === 0) {
			await this.cleanup();
		}
	}

	async alarm(): Promise<void> {
		await this.cleanup();
	}

	private async cleanup(): Promise<void> {
		this.phase = "ended";

		for (const ws of this.state.getWebSockets()) {
			try {
				ws.close(1000, "Room expired");
			} catch {}
		}

		for (const timer of this.disconnectTimers.values()) {
			clearTimeout(timer);
		}
		this.disconnectTimers.clear();

		if (this.activeInputCollector?.timeoutId) {
			clearTimeout(this.activeInputCollector.timeoutId);
			this.activeInputCollector = null;
		}

		await this.state.storage.deleteAll();
	}

	async setPhase(
		phase: PartyRoomPhase,
		metadata?: Record<string, unknown>,
	): Promise<void> {
		this.phase = phase;
		this.broadcastToAll(encodeMessage(phaseChangeMessage(phase, metadata)));
		await this.saveState();
	}

	async updateSharedData(data: Record<string, unknown>): Promise<void> {
		this.sharedData = { ...this.sharedData, ...data };
		this.broadcastToAll(
			encodeMessage(stateUpdateMessage(this.buildRoomState())),
		);
		await this.saveState();
	}

	async requestInput(
		requestId: string,
		request: PartyInputRequest,
	): Promise<Map<string, PartyInputResponse>> {
		this.activeInputCollector = {
			requestId,
			request,
			responses: new Map(),
			timeoutId: null,
		};

		this.broadcastToPlayers(
			encodeMessage(inputRequestMessage(requestId, request)),
		);

		return new Promise((resolve) => {
			const timeLimit = request.timeLimit ?? 30;
			const collector = this.activeInputCollector;
			if (!collector) {
				resolve(new Map());
				return;
			}

			collector.timeoutId = setTimeout(() => {
				const responses = collector.responses;
				this.activeInputCollector = null;
				resolve(responses);
			}, timeLimit * 1000);
		});
	}

	private async handleInputResponse(
		playerId: string,
		requestId: string,
		response: PartyInputResponse,
	): Promise<void> {
		if (
			!this.activeInputCollector ||
			this.activeInputCollector.requestId !== requestId
		) {
			return;
		}

		this.activeInputCollector.responses.set(playerId, response);

		this.broadcastToHost(
			encodeMessage({
				type: "input_response",
				requestId,
				response: { ...response, playerId },
			}),
		);

		const playerCount = Array.from(this.players.values()).filter(
			(p) => p.connected && !p.isHost,
		).length;

		if (this.activeInputCollector.responses.size >= playerCount) {
			if (this.activeInputCollector.timeoutId) {
				clearTimeout(this.activeInputCollector.timeoutId);
			}
		}
	}

	private checkRateLimit(senderId: string): boolean {
		const now = Date.now();
		const entry = this.rateLimits.get(senderId);

		if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
			this.rateLimits.set(senderId, { count: 1, windowStart: now });
			return true;
		}

		entry.count++;
		if (entry.count > RATE_LIMIT_MAX_MESSAGES) {
			return false;
		}
		return true;
	}

	private buildRoomState(): PartyRoomState {
		return {
			phase: this.phase,
			players: Array.from(this.players.values()),
			hostId: this.hostId ?? "",
			sharedData: this.sharedData,
			currentRound: this.currentRound,
			maxRounds: this.maxRounds,
		};
	}

	private broadcastToAll(message: string): void {
		for (const ws of this.state.getWebSockets()) {
			try {
				ws.send(message);
			} catch {}
		}
	}

	private broadcastToPlayers(message: string): void {
		for (const ws of this.state.getWebSockets()) {
			const tags = this.state.getTags(ws);
			if (tags.some((t) => t.startsWith("player:"))) {
				try {
					ws.send(message);
				} catch {}
			}
		}
	}

	private broadcastToHost(message: string): void {
		for (const ws of this.state.getWebSockets("host")) {
			try {
				ws.send(message);
			} catch {}
		}
	}

	private async saveState(): Promise<void> {
		await this.state.storage.put("room", {
			phase: this.phase,
			hostId: this.hostId,
			players: Array.from(this.players.entries()),
			sharedData: this.sharedData,
			currentRound: this.currentRound,
			maxRounds: this.maxRounds,
		});
	}

	private async loadState(): Promise<void> {
		const saved = await this.state.storage.get<{
			phase: PartyRoomPhase;
			hostId: string | null;
			players: Array<[string, PartyPlayer]>;
			sharedData: Record<string, unknown>;
			currentRound: number;
			maxRounds: number | undefined;
		}>("room");

		if (saved) {
			this.phase = saved.phase;
			this.hostId = saved.hostId;
			this.players = new Map(saved.players);
			this.sharedData = saved.sharedData;
			this.currentRound = saved.currentRound;
			this.maxRounds = saved.maxRounds;
		}
	}
}

function jsonResponse(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}
