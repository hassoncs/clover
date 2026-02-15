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
	playerTokenMessage,
	privateStateMessage,
	stateUpdateMessage,
} from "./protocol";
import { ServerScriptRunner } from "./ServerScriptRunner";

// Timeout constants (all in milliseconds)
const CLEANUP_ALARM_MS = 4 * 60 * 60 * 1000; // 4 hours - room lifetime
const RECONNECT_WINDOW_MS = 60 * 1000; // 60 seconds - player reconnect window
const RATE_LIMIT_WINDOW_MS = 1000; // 1 second - rate limit window
const RATE_LIMIT_MAX_MESSAGES = 10; // Max messages per window
const DEFAULT_MIN_PLAYERS = 3;

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
	expectedPlayerIds: Set<string> | null;
	responses: Map<string, PartyInputResponse>;
	timeoutId: ReturnType<typeof setTimeout> | null;
	resolve: ((responses: Map<string, PartyInputResponse>) => void) | null;
}

export class PartyRoomDO {
	private phase: PartyRoomPhase = "lobby";
	private players: Map<string, PartyPlayer> = new Map();
	private hostId: string | null = null;
	private roomCode: string | null = null;
	private sharedData: Record<string, unknown> = {};
	private minPlayers = DEFAULT_MIN_PLAYERS;
	private serverScriptCode: string | null = null;
	private serverScriptConfig: Record<string, unknown> = {};
	private rateLimits: Map<string, RateLimitEntry> = new Map();
	private disconnectTimers: Map<string, ReturnType<typeof setTimeout>> =
		new Map();
	private activeInputCollector: InputCollector | null = null;
	private stateVersion = 0;
	private initialized = false;
	private sockets: Set<WebSocket> = new Set();
	private socketMetadata: WeakMap<
		WebSocket,
		{ role: string; playerId?: string; name?: string }
	> = new WeakMap();

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

	setMinPlayers(min: number): void {
		this.minPlayers = min;
	}

	getRoomCode(): string | null {
		return this.roomCode;
	}

	getPlayers(): string[] {
		return Array.from(this.players.values())
			.filter((player) => player.connected && !player.isHost)
			.map((player) => player.id);
	}

	private async handleInit(request: Request): Promise<Response> {
		const body = (await request.json().catch(() => ({}))) as {
			hostId?: string;
			hostToken?: string;
			roomCode?: string;
			minPlayers?: number;
			modules?: Record<string, string>;
			scriptConfig?: Record<string, unknown>;
			gameDefinition?: {
				modules?: Record<string, string>;
			};
		};

		if (!body.hostId || !body.hostToken) {
			return jsonResponse({ error: "hostId and hostToken required" }, 400);
		}

		this.hostId = body.hostId;
		this.phase = "lobby";
		if (body.roomCode) {
			this.roomCode = body.roomCode;
		}
		if (body.minPlayers !== undefined) {
			this.minPlayers = body.minPlayers;
		}

		const serverScript =
			body.modules?.server ?? body.gameDefinition?.modules?.server;
		if (typeof serverScript === "string" && serverScript.length > 0) {
			this.serverScriptCode = serverScript;
			this.serverScriptConfig = body.scriptConfig ?? {};
		} else {
			this.serverScriptCode = null;
			this.serverScriptConfig = {};
		}

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

		if (role === "player" && !name && !token) {
			return jsonResponse({ error: "name required for new player" }, 400);
		}

		const pair = new WebSocketPair();
		const client = pair[0];
		const server = pair[1];

		server.accept();
		this.sockets.add(server);

		const meta = {
			role,
			playerId: undefined as string | undefined,
			name: name ?? undefined,
		};
		this.socketMetadata.set(server, meta);

		(async () => {
			try {
				if (role === "host") {
					await this.handleHostConnect(server, token ?? undefined);
				} else {
					await this.handlePlayerConnectWithToken(
						server,
						token ?? undefined,
						name ?? "Player",
					);
				}
			} catch (e) {
				server.close(1011, "Internal Error");
			}
		})();

		server.addEventListener("message", async (event) => {
			try {
				await this.handleMessage(server, event.data);
			} catch {}
		});

		server.addEventListener("close", async (event) => {
			this.sockets.delete(server);
			await this.handleClose(server, event.code, event.reason, event.wasClean);
		});

		server.addEventListener("error", async () => {
			this.sockets.delete(server);
			await this.handleClose(server, 1006, "error", false);
		});

		return new Response(null, { status: 101, webSocket: client });
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

	private async handlePlayerConnectWithToken(
		ws: WebSocket,
		token: string | undefined,
		name: string,
	): Promise<void> {
		let playerId: string | undefined;

		if (token) {
			const session = await this.state.storage.get<SessionRecord>(
				`session:${token}`,
			);
			if (session?.role === "player") {
				playerId = session.playerId;
			}
		}

		if (!playerId) {
			playerId = crypto.randomUUID();
		}

		const meta = this.socketMetadata.get(ws);
		if (meta) {
			meta.playerId = playerId;
		}

		await this.handlePlayerConnect(ws, playerId, name);
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

			if (this.activeInputCollector) {
				const { requestId, request, expectedPlayerIds, responses } =
					this.activeInputCollector;
				const isExpected =
					expectedPlayerIds === null || expectedPlayerIds.has(playerId);
				const hasNotResponded = !responses.has(playerId);
				if (isExpected && hasNotResponded) {
					ws.send(encodeMessage(inputRequestMessage(requestId, request)));
				}
			}
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

			ws.send(encodeMessage(playerTokenMessage(sessionToken, playerId)));
			ws.send(encodeMessage(stateUpdateMessage(this.buildRoomState())));
			this.broadcastToAll(encodeMessage(playerJoinedMessage(player)));
		}

		await this.saveState();
	}

	async handleMessage(
		ws: WebSocket,
		message: string | ArrayBuffer,
	): Promise<void> {
		const meta = this.socketMetadata.get(ws);
		if (!meta) return;

		const senderId = meta.role === "host" ? this.hostId : meta.playerId;
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
				if (meta.role === "host") {
					await this.setPhase(parsed.phase, parsed.metadata);
				}
				break;
			case "state_update":
				if (meta.role === "host") {
					this.sharedData = parsed.state.sharedData ?? {};
					this.broadcastToAll(
						encodeMessage(stateUpdateMessage(this.buildRoomState())),
					);
					await this.saveState();
				}
				break;
			case "input_request":
				if (meta.role === "host") {
					this.requestInput(parsed.requestId, parsed.request).catch(() => {});
				}
				break;
			case "start_game":
				if (meta.role === "host") {
					await this.handleStartGame(ws);
				}
				break;
			default:
				break;
		}
	}

	async handleClose(
		ws: WebSocket,
		_code: number,
		_reason: string,
		_wasClean: boolean,
	): Promise<void> {
		const meta = this.socketMetadata.get(ws);
		if (!meta) return;

		if (meta.role === "host" && this.hostId) {
			await this.handleDisconnect(this.hostId);
		} else if (meta.role === "player" && meta.playerId) {
			await this.handleDisconnect(meta.playerId);
		}
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

		for (const ws of this.sockets) {
			try {
				ws.close(1000, "Room expired");
			} catch {}
		}
		this.sockets.clear();

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

	async updatePlayerScore(playerId: string, delta: number): Promise<void> {
		const player = this.players.get(playerId);
		if (!player) return;

		player.score = (player.score ?? 0) + delta;
		this.players.set(playerId, player);
		this.broadcastToAll(
			encodeMessage(stateUpdateMessage(this.buildRoomState())),
		);
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
			expectedPlayerIds: null,
			responses: new Map(),
			timeoutId: null,
			resolve: null,
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

			collector.resolve = resolve;

			collector.timeoutId = setTimeout(() => {
				const responses = collector.responses;
				this.activeInputCollector = null;
				resolve(responses);
			}, timeLimit * 1000);
		});
	}

	async requestInputFromSubset(
		requestId: string,
		request: PartyInputRequest,
		targetPlayerIds: string[],
	): Promise<Map<string, PartyInputResponse>> {
		const expectedPlayerIds = new Set(targetPlayerIds);
		if (expectedPlayerIds.size === 0) {
			return new Map();
		}

		this.activeInputCollector = {
			requestId,
			request,
			expectedPlayerIds,
			responses: new Map(),
			timeoutId: null,
			resolve: null,
		};

		const message = encodeMessage(inputRequestMessage(requestId, request));
		for (const ws of this.sockets) {
			const meta = this.socketMetadata.get(ws);
			if (
				meta?.role === "player" &&
				meta.playerId &&
				expectedPlayerIds.has(meta.playerId) &&
				ws.readyState === WebSocket.OPEN
			) {
				try {
					ws.send(message);
				} catch {}
			}
		}

		return new Promise((resolve) => {
			const timeLimit = request.timeLimit ?? 30;
			const collector = this.activeInputCollector;
			if (!collector) {
				resolve(new Map());
				return;
			}

			collector.resolve = resolve;

			collector.timeoutId = setTimeout(() => {
				const responses = collector.responses;
				this.activeInputCollector = null;
				resolve(responses);
			}, timeLimit * 1000);
		});
	}

	async sendToPlayer(
		playerId: string,
		data: Record<string, unknown>,
	): Promise<void> {
		const message = encodeMessage(privateStateMessage(data));

		for (const ws of this.sockets) {
			const meta = this.socketMetadata.get(ws);
			if (
				meta?.role === "player" &&
				meta.playerId === playerId &&
				ws.readyState === WebSocket.OPEN
			) {
				try {
					ws.send(message);
				} catch {}
			}
		}
	}

	private async handleStartGame(ws: WebSocket): Promise<void> {
		if (this.phase !== "lobby") {
			ws.send(
				encodeMessage(
					errorMessage("ALREADY_STARTED", "Game has already started"),
				),
			);
			return;
		}

		const playerCount = Array.from(this.players.values()).filter(
			(p) => p.connected && !p.isHost,
		).length;

		if (playerCount < this.minPlayers) {
			ws.send(
				encodeMessage(
					errorMessage(
						"MIN_PLAYERS",
						`Need at least ${this.minPlayers} players`,
					),
				),
			);
			return;
		}

		if (this.serverScriptCode) {
			const runner = new ServerScriptRunner(this);
			runner
				.execute(this.serverScriptCode, this.serverScriptConfig)
				.catch(async (error) => {
					const message =
						error instanceof Error ? error.message : String(error);
					console.error("[PartyRoomDO] Server script failed:", error);
					ws.send(encodeMessage(errorMessage("SCRIPT_ERROR", message)));
					await this.updateSharedData({ scriptError: message });
					await this.setPhase("ended");
				});
			return;
		}

		await this.setPhase("playing");
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

		const expectedPlayerIds = this.activeInputCollector.expectedPlayerIds;
		if (expectedPlayerIds && !expectedPlayerIds.has(playerId)) {
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

		const playerCount = expectedPlayerIds
			? expectedPlayerIds.size
			: Array.from(this.players.values()).filter(
					(p) => p.connected && !p.isHost,
				).length;

		if (this.activeInputCollector.responses.size >= playerCount) {
			if (this.activeInputCollector.timeoutId) {
				clearTimeout(this.activeInputCollector.timeoutId);
			}
			const resolveFn = this.activeInputCollector.resolve;
			const responses = this.activeInputCollector.responses;
			this.activeInputCollector = null;
			if (resolveFn) {
				resolveFn(responses);
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
			roomCode: this.roomCode ?? undefined,
			sharedData: this.sharedData,
			stateVersion: this.stateVersion,
		};
	}

	private broadcastToAll(message: string): void {
		for (const ws of this.sockets) {
			if (ws.readyState === WebSocket.OPEN) {
				try {
					ws.send(message);
				} catch {}
			}
		}
	}

	private broadcastToPlayers(message: string): void {
		for (const ws of this.sockets) {
			const meta = this.socketMetadata.get(ws);
			if (meta?.role === "player" && ws.readyState === WebSocket.OPEN) {
				try {
					ws.send(message);
				} catch {}
			}
		}
	}

	private broadcastToHost(message: string): void {
		for (const ws of this.sockets) {
			const meta = this.socketMetadata.get(ws);
			if (meta?.role === "host" && ws.readyState === WebSocket.OPEN) {
				try {
					ws.send(message);
				} catch {}
			}
		}
	}

	private async saveState(): Promise<void> {
		this.stateVersion++;
		await this.state.storage.put("room", {
			phase: this.phase,
			hostId: this.hostId,
			roomCode: this.roomCode,
			players: Array.from(this.players.entries()),
			sharedData: this.sharedData,
			minPlayers: this.minPlayers,
			serverScriptCode: this.serverScriptCode,
			serverScriptConfig: this.serverScriptConfig,
			stateVersion: this.stateVersion,
		});
	}

	private async loadState(): Promise<void> {
		const saved = await this.state.storage.get<{
			phase: PartyRoomPhase;
			hostId: string | null;
			roomCode: string | null;
			players: Array<[string, PartyPlayer]>;
			sharedData: Record<string, unknown>;
			minPlayers: number | undefined;
			serverScriptCode: string | null;
			serverScriptConfig: Record<string, unknown> | undefined;
			stateVersion: number | undefined;
		}>("room");

		if (saved) {
			this.phase = saved.phase;
			this.hostId = saved.hostId;
			this.roomCode = saved.roomCode ?? null;
			this.players = new Map(saved.players);
			this.sharedData = saved.sharedData;
			this.stateVersion = saved.stateVersion ?? 0;
			if (saved.minPlayers !== undefined) {
				this.minPlayers = saved.minPlayers;
			}
			if (typeof saved.serverScriptCode === "string") {
				this.serverScriptCode = saved.serverScriptCode;
			}
			if (saved.serverScriptConfig) {
				this.serverScriptConfig = saved.serverScriptConfig;
			}
		}
	}
}

function jsonResponse(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}
