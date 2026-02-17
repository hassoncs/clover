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
import { QuickJSServerRunner } from "./QuickJSServerRunner";
import { TEMPLATE_REGISTRY } from "./templates/registry";

// Timeout constants (all in milliseconds)
const CLEANUP_ALARM_MS = 4 * 60 * 60 * 1000; // 4 hours - room lifetime
const RECONNECT_WINDOW_MS = 60 * 1000; // 60 seconds - player reconnect window
const RATE_LIMIT_WINDOW_MS = 1000; // 1 second - rate limit window
const RATE_LIMIT_MAX_MESSAGES = 10; // Max messages per window
const MAX_MESSAGE_SIZE = 16384; // 16KB max message size
const DEFAULT_MIN_PLAYERS = 3;

interface SessionRecord {
	playerId: string;
	role: "host" | "player" | "audience";
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

interface SocketAttachment {
	role: string;
	playerId?: string;
	name?: string;
}

export class PartyRoomDO {
	private phase: PartyRoomPhase = "lobby";
	private players: Map<string, PartyPlayer> = new Map();
	private hostId: string | null = null;
	private roomCode: string | null = null;
	private sharedData: Record<string, unknown> = {};
	private minPlayers = DEFAULT_MIN_PLAYERS;
	private templateId: string | null = null;
	private serverScriptCode: string | null = null;
	private serverScriptConfig: Record<string, unknown> = {};
	private rateLimits: Map<string, RateLimitEntry> = new Map();
	private disconnectTimers: Map<string, ReturnType<typeof setTimeout>> =
		new Map();
	private activeInputCollectors: Map<string, InputCollector> = new Map();
	private stateVersion = 0;
	private initialized = false;

	constructor(private state: DurableObjectState) {}

	private getSocketMeta(ws: WebSocket): SocketAttachment | null {
		try {
			return (ws as any).deserializeAttachment() as SocketAttachment | null;
		} catch {
			return null;
		}
	}

	private setSocketMeta(ws: WebSocket, data: SocketAttachment): void {
		(ws as any).serializeAttachment(data);
	}

	async fetch(request: Request): Promise<Response> {
		if (!this.initialized) {
			await this.loadState();
			this.initialized = true;
		}

		const url = new URL(request.url);

		if (request.headers.get("Upgrade") === "websocket") {
			return this.handleWebSocketUpgrade(url);
		}

		if (request.method === "GET" && url.pathname === "/status") {
			return jsonResponse({
				active: this.hostId !== null && this.phase !== "ended",
				phase: this.phase,
			});
		}

		if (request.method === "POST" && url.pathname === "/init") {
			return this.handleInit(request);
		}

		return new Response("Not found", { status: 404 });
	}

	async webSocketMessage(
		ws: WebSocket,
		message: string | ArrayBuffer,
	): Promise<void> {
		if (!this.initialized) {
			await this.loadState();
			this.initialized = true;
		}
		try {
			await this.handleMessage(ws, message);
		} catch {}
	}

	async webSocketClose(
		ws: WebSocket,
		code: number,
		reason: string,
		wasClean: boolean,
	): Promise<void> {
		if (!this.initialized) {
			await this.loadState();
			this.initialized = true;
		}
		await this.handleClose(ws, code, reason, wasClean);
	}

	async webSocketError(ws: WebSocket, _error: unknown): Promise<void> {
		if (!this.initialized) {
			await this.loadState();
			this.initialized = true;
		}
		await this.handleClose(ws, 1006, "error", false);
	}

	setMinPlayers(min: number): void {
		this.minPlayers = min;
	}

	getRoomCode(): string | null {
		return this.roomCode;
	}

	getPlayers(): string[] {
		return Array.from(this.players.values())
			.filter(
				(player) =>
					player.connected && !player.isHost && player.role !== "audience",
			)
			.map((player) => player.id);
	}

	private async handleInit(request: Request): Promise<Response> {
		const body = (await request.json().catch(() => ({}))) as {
			hostId?: string;
			hostToken?: string;
			roomCode?: string;
			minPlayers?: number;
			template?: string;
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
		if (body.template) {
			this.templateId = body.template;
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

		if (role !== "host" && role !== "player" && role !== "audience") {
			return jsonResponse(
				{ error: "role must be 'host', 'player', or 'audience'" },
				400,
			);
		}

		if (role === "host" && !token) {
			return jsonResponse({ error: "token required for host" }, 401);
		}

		if ((role === "player" || role === "audience") && !name && !token) {
			return jsonResponse({ error: "name required for new participant" }, 400);
		}

		const pair = new WebSocketPair();
		const client = pair[0];
		const server = pair[1];

		this.state.acceptWebSocket(server);

		const attachment = {
			role,
			playerId: undefined as string | undefined,
			name: name ?? undefined,
		};
		this.setSocketMeta(server, attachment);

		(async () => {
			try {
				if (role === "host") {
					await this.handleHostConnect(server, token!);
				} else {
					await this.handlePlayerConnectWithToken(
						server,
						token ?? undefined,
						name ?? "Player",
						role as "player" | "audience",
					);
				}
			} catch (e) {
				server.close(1011, "Internal Error");
			}
		})();

		return new Response(null, { status: 101, webSocket: client });
	}

	private async handleHostConnect(ws: WebSocket, token: string): Promise<void> {
		const session = await this.state.storage.get<SessionRecord>(
			`session:${token}`,
		);
		if (!session || session.role !== "host") {
			ws.send(encodeMessage(errorMessage("AUTH_FAILED", "Invalid host token")));
			ws.close(4001, "Invalid host token");
			return;
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
		role: "player" | "audience" = "player",
	): Promise<void> {
		let playerId: string | undefined;

		if (token) {
			const session = await this.state.storage.get<SessionRecord>(
				`session:${token}`,
			);
			if (session?.role === role) {
				playerId = session.playerId;
			}
		}

		if (!playerId) {
			playerId = crypto.randomUUID();
		}

		const meta = this.getSocketMeta(ws);
		if (meta) {
			meta.playerId = playerId;
			this.setSocketMeta(ws, meta);
		}

		await this.handlePlayerConnect(ws, playerId, name, role);
	}

	private async handlePlayerConnect(
		ws: WebSocket,
		playerId: string,
		name: string,
		role: "player" | "audience",
	): Promise<void> {
		const existing = this.players.get(playerId);
		if (existing) {
			existing.connected = true;
			existing.role = role;
			this.players.set(playerId, existing);

			const timer = this.disconnectTimers.get(playerId);
			if (timer) {
				clearTimeout(timer);
				this.disconnectTimers.delete(playerId);
			}

			this.broadcastToAll(encodeMessage(playerReconnectMessage(playerId)));
			ws.send(encodeMessage(stateUpdateMessage(this.buildRoomState())));

			if (role === "player") {
				for (const collector of this.activeInputCollectors.values()) {
					const isExpected =
						collector.expectedPlayerIds === null ||
						collector.expectedPlayerIds.has(playerId);
					const hasNotResponded = !collector.responses.has(playerId);
					if (isExpected && hasNotResponded) {
						ws.send(
							encodeMessage(
								inputRequestMessage(collector.requestId, collector.request),
							),
						);
					}
				}
			}
		} else {
			const player: PartyPlayer = {
				id: playerId,
				name,
				connected: true,
				role,
			};
			this.players.set(playerId, player);

			const sessionToken = crypto.randomUUID();
			const session: SessionRecord = {
				playerId,
				role,
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
		const messageSize =
			typeof message === "string"
				? message.length
				: (message as ArrayBuffer).byteLength;
		if (messageSize > MAX_MESSAGE_SIZE) {
			ws.send(
				encodeMessage(
					errorMessage("MESSAGE_TOO_LARGE", "Message exceeds size limit"),
				),
			);
			return;
		}

		const meta = this.getSocketMeta(ws);
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
					if (this.serverScriptCode || this.templateId) {
						ws.send(
							encodeMessage(
								errorMessage("SCRIPT_ACTIVE", "Server script controls state"),
							),
						);
						break;
					}
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
		const meta = this.getSocketMeta(ws);
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

		for (const ws of this.state.getWebSockets()) {
			try {
				ws.close(1000, "Room expired");
			} catch {}
		}

		for (const timer of this.disconnectTimers.values()) {
			clearTimeout(timer);
		}
		this.disconnectTimers.clear();

		for (const collector of this.activeInputCollectors.values()) {
			if (collector.timeoutId) {
				clearTimeout(collector.timeoutId);
			}
		}
		this.activeInputCollectors.clear();

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
		const collector: InputCollector = {
			requestId,
			request,
			expectedPlayerIds: null,
			responses: new Map(),
			timeoutId: null,
			resolve: null,
		};
		this.activeInputCollectors.set(requestId, collector);

		this.broadcastToPlayers(
			encodeMessage(inputRequestMessage(requestId, request)),
		);

		return new Promise((resolve) => {
			const timeLimit = request.timeLimit ?? 30;

			collector.resolve = resolve;

			collector.timeoutId = setTimeout(() => {
				const responses = collector.responses;
				this.activeInputCollectors.delete(requestId);
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

		const collector: InputCollector = {
			requestId,
			request,
			expectedPlayerIds,
			responses: new Map(),
			timeoutId: null,
			resolve: null,
		};
		this.activeInputCollectors.set(requestId, collector);

		const message = encodeMessage(inputRequestMessage(requestId, request));
		for (const ws of this.state.getWebSockets()) {
			const meta = this.getSocketMeta(ws);
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

			collector.resolve = resolve;

			collector.timeoutId = setTimeout(() => {
				const responses = collector.responses;
				this.activeInputCollectors.delete(requestId);
				resolve(responses);
			}, timeLimit * 1000);
		});
	}

	async assignTeams(
		teamCount: number,
		mode: "random" | "balanced" | "manual" = "random",
	): Promise<void> {
		if (mode === "manual") return;

		const players = Array.from(this.players.values()).filter(
			(p) => !p.isHost && p.role !== "audience",
		);

		for (let i = players.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[players[i], players[j]] = [players[j], players[i]];
		}

		players.forEach((player, index) => {
			const teamIndex = index % teamCount;
			player.team = `Team ${teamIndex + 1}`;
			this.players.set(player.id, player);
		});

		this.broadcastToAll(
			encodeMessage(stateUpdateMessage(this.buildRoomState())),
		);
		await this.saveState();
	}

	getTeamPlayers(team: string): PartyPlayer[] {
		return Array.from(this.players.values()).filter((p) => p.team === team);
	}

	async updateTeamScore(team: string, delta: number): Promise<void> {
		const teamPlayers = this.getTeamPlayers(team);
		for (const player of teamPlayers) {
			player.score = (player.score ?? 0) + delta;
			this.players.set(player.id, player);
		}
		this.broadcastToAll(
			encodeMessage(stateUpdateMessage(this.buildRoomState())),
		);
		await this.saveState();
	}

	broadcastToTeam(team: string, message: string): void {
		for (const ws of this.state.getWebSockets()) {
			const meta = this.getSocketMeta(ws);
			if (
				meta?.role === "player" &&
				meta.playerId &&
				ws.readyState === WebSocket.OPEN
			) {
				const player = this.players.get(meta.playerId);
				if (player && player.team === team) {
					try {
						ws.send(message);
					} catch {}
				}
			}
		}
	}

	async sendToPlayer(
		playerId: string,
		data: Record<string, unknown>,
	): Promise<void> {
		const message = encodeMessage(privateStateMessage(data));

		for (const ws of this.state.getWebSockets()) {
			const meta = this.getSocketMeta(ws);
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
			(p) => p.connected && !p.isHost && p.role !== "audience",
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

		if (this.templateId && TEMPLATE_REGISTRY[this.templateId]) {
			const runner = TEMPLATE_REGISTRY[this.templateId];
			runner(this).catch(async (error) => {
				const message = error instanceof Error ? error.message : String(error);
				console.error("[PartyRoomDO] Template runner failed:", error);
				ws.send(encodeMessage(errorMessage("SCRIPT_ERROR", message)));
				await this.updateSharedData({ scriptError: message });
				await this.setPhase("ended");
			});
			return;
		}

		if (this.serverScriptCode) {
			const runner = new QuickJSServerRunner(this);
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
		const collector = this.activeInputCollectors.get(requestId);
		if (!collector) {
			return;
		}

		const player = this.players.get(playerId);
		if (!player || player.role === "audience") {
			return;
		}

		const expectedPlayerIds = collector.expectedPlayerIds;
		if (expectedPlayerIds && !expectedPlayerIds.has(playerId)) {
			return;
		}
		const enrichedResponse = {
			...response,
			playerId,
			playerName: player?.name ?? playerId.slice(0, 6),
		};

		collector.responses.set(playerId, enrichedResponse);

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
					(p) => p.connected && !p.isHost && p.role !== "audience",
				).length;

		if (collector.responses.size >= playerCount) {
			if (collector.timeoutId) {
				clearTimeout(collector.timeoutId);
			}
			const resolveFn = collector.resolve;
			const responses = collector.responses;
			this.activeInputCollectors.delete(requestId);
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
		for (const ws of this.state.getWebSockets()) {
			if (ws.readyState === WebSocket.OPEN) {
				try {
					ws.send(message);
				} catch {}
			}
		}
	}

	private broadcastToPlayers(message: string): void {
		for (const ws of this.state.getWebSockets()) {
			const meta = this.getSocketMeta(ws);
			if (meta?.role === "player" && ws.readyState === WebSocket.OPEN) {
				try {
					ws.send(message);
				} catch {}
			}
		}
	}

	private broadcastToHost(message: string): void {
		for (const ws of this.state.getWebSockets()) {
			const meta = this.getSocketMeta(ws);
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
			templateId: this.templateId,
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
			templateId: string | null;
			serverScriptCode: string | null;
			serverScriptConfig: Record<string, unknown> | undefined;
			stateVersion: number | undefined;
		}>("room");

		if (saved) {
			this.hostId = saved.hostId;
			this.roomCode = saved.roomCode ?? null;
			this.players = new Map(saved.players);
			this.sharedData = saved.sharedData;
			this.stateVersion = saved.stateVersion ?? 0;
			if (saved.minPlayers !== undefined) {
				this.minPlayers = saved.minPlayers;
			}
			if (saved.templateId) {
				this.templateId = saved.templateId;
			}
			if (typeof saved.serverScriptCode === "string") {
				this.serverScriptCode = saved.serverScriptCode;
			}
			if (saved.serverScriptConfig) {
				this.serverScriptConfig = saved.serverScriptConfig;
			}

			if (
				saved.phase === "playing" &&
				(saved.serverScriptCode || saved.templateId)
			) {
				this.phase = "ended";
				this.sharedData = {
					...this.sharedData,
					crashRecovery: true,
					message: "Game interrupted, please start a new room",
				};
			} else {
				this.phase = saved.phase;
			}

			for (const [id, player] of this.players) {
				player.connected = false;
				this.players.set(id, player);
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
