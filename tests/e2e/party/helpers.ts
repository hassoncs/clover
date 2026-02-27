const API_BASE = "http://api.slopcade.localhost:1355";

export interface CreateRoomResponse {
	code: string;
	hostToken: string;
	hostId: string;
}

export interface PartyMessage {
	type: string;
	state?: {
		phase: string;
		players: Array<{
			id: string;
			name: string;
			connected: boolean;
			isHost?: boolean;
			score?: number;
			role?: string;
		}>;
		hostId: string;
		roomCode?: string;
		sharedData?: Record<string, unknown>;
		stateVersion?: number;
	};
	player?: { id: string; name: string; connected: boolean };
	playerId?: string;
	phase?: string;
	request?: {
		type: string;
		prompt: string;
		timeLimit?: number;
		options?: string[];
		choices?: string[];
		assignments?: Record<string, unknown>;
		metadata?: Record<string, unknown>;
	};
	requestId?: string;
	response?: { playerId: string; value: unknown; timestamp: number };
	token?: string;
	code?: string;
	message?: string;
}

export interface Connection {
	ws: WebSocket;
	messages: PartyMessage[];
	close: () => void;
}

export interface PlayerInfo {
	name: string;
	id: string;
	conn: Connection;
}

// ── Room creation ──────────────────────────────────────────────

export async function createRoom(opts?: {
	template?: string;
	minPlayers?: number;
}): Promise<CreateRoomResponse> {
	const response = await fetch(`${API_BASE}/api/party/create`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(opts ?? {}),
	});
	if (response.status !== 201) {
		const text = await response.text();
		throw new Error(`Room creation failed (${response.status}): ${text}`);
	}
	return response.json() as Promise<CreateRoomResponse>;
}

// ── WebSocket connection ───────────────────────────────────────

export function connectWebSocket(
	code: string,
	params: Record<string, string>,
): Promise<Connection> {
	return new Promise((resolve, reject) => {
		const searchParams = new URLSearchParams(params);
		const wsUrl = `ws://api.slopcade.localhost:1355/api/party/${code}/ws?${searchParams.toString()}`;
		const ws = new WebSocket(wsUrl);
		const messages: PartyMessage[] = [];

		ws.addEventListener("open", () =>
			resolve({ ws, messages, close: () => ws.close() }),
		);

		ws.addEventListener("message", (event) => {
			try {
				messages.push(JSON.parse(event.data as string) as PartyMessage);
			} catch {}
		});

		ws.addEventListener("error", () =>
			reject(new Error(`WebSocket connection failed to ${wsUrl}`)),
		);

		setTimeout(() => reject(new Error("WebSocket connection timeout")), 10_000);
	});
}

// ── Message waiting ────────────────────────────────────────────

export function waitForMessage(
	messages: PartyMessage[],
	predicate: (msg: PartyMessage) => boolean,
	timeoutMs = 30_000,
): Promise<PartyMessage> {
	return new Promise((resolve, reject) => {
		let checkIndex = 0;

		const interval = setInterval(() => {
			for (; checkIndex < messages.length; checkIndex++) {
				if (predicate(messages[checkIndex])) {
					clearInterval(interval);
					clearTimeout(timeout);
					resolve(messages[checkIndex]);
					return;
				}
			}
		}, 50);

		const timeout = setTimeout(() => {
			clearInterval(interval);
			const recentMsgs = messages.slice(-10).map((m) => ({
				type: m.type,
				requestId: m.requestId,
				phase: m.phase ?? m.state?.sharedData?.phase,
			}));
			reject(
				new Error(
					`Timed out waiting for message (${timeoutMs}ms). Total messages: ${messages.length}. Recent: ${JSON.stringify(recentMsgs)}`,
				),
			);
		}, timeoutMs);
	});
}

export function waitForMessageFrom(
	messages: PartyMessage[],
	fromIndex: number,
	predicate: (msg: PartyMessage) => boolean,
	timeoutMs = 30_000,
): Promise<PartyMessage> {
	return new Promise((resolve, reject) => {
		let checkIndex = fromIndex;

		const interval = setInterval(() => {
			for (; checkIndex < messages.length; checkIndex++) {
				if (predicate(messages[checkIndex])) {
					clearInterval(interval);
					clearTimeout(timeout);
					resolve(messages[checkIndex]);
					return;
				}
			}
		}, 50);

		const timeout = setTimeout(() => {
			clearInterval(interval);
			const recentMsgs = messages.slice(fromIndex).map((m) => ({
				type: m.type,
				requestId: m.requestId,
				phase: m.phase ?? m.state?.sharedData?.phase,
			}));
			reject(
				new Error(
					`Timed out waiting for message from index ${fromIndex} (${timeoutMs}ms). Messages since: ${JSON.stringify(recentMsgs)}`,
				),
			);
		}, timeoutMs);
	});
}

// ── Player helpers ─────────────────────────────────────────────

export function getPlayerIdFromMessages(
	messages: PartyMessage[],
	playerName: string,
): string | null {
	for (const msg of messages) {
		if (msg.type === "state_update" && msg.state?.players) {
			const player = msg.state.players.find((p) => p.name === playerName);
			if (player) return player.id;
		}
	}
	return null;
}

export function sendInputResponse(
	ws: WebSocket,
	requestId: string,
	value: unknown,
	playerName = "",
): void {
	ws.send(
		JSON.stringify({
			type: "input_response",
			requestId,
			response: {
				playerId: playerName,
				value,
				timestamp: Date.now(),
			},
		}),
	);
}

// ── Setup helpers ──────────────────────────────────────────────

export async function setupGameRoom(
	template: string,
	playerNames: string[],
	minPlayers = 3,
): Promise<{
	room: CreateRoomResponse;
	host: Connection;
	players: PlayerInfo[];
	cleanup: () => void;
}> {
	const room = await createRoom({ template, minPlayers });

	const host = await connectWebSocket(room.code, {
		role: "host",
		token: room.hostToken,
	});

	await waitForMessage(host.messages, (msg) => msg.type === "state_update");

	const players: PlayerInfo[] = [];
	for (const name of playerNames) {
		const conn = await connectWebSocket(room.code, {
			role: "player",
			name,
		});
		await waitForMessage(conn.messages, (msg) => msg.type === "state_update");

		const id = getPlayerIdFromMessages(conn.messages, name);
		if (!id) throw new Error(`Could not find player ID for ${name}`);

		players.push({ name, id, conn });
	}

	await new Promise((r) => setTimeout(r, 300));

	const cleanup = () => {
		host.close();
		for (const p of players) p.conn.close();
	};

	return { room, host, players, cleanup };
}

export async function startGameAndReady(
	host: Connection,
	players: PlayerInfo[],
): Promise<void> {
	host.ws.send(JSON.stringify({ type: "start_game" }));

	await Promise.all(
		players.map(async (p) => {
			await waitForMessage(
				p.conn.messages,
				(msg) =>
					msg.type === "input_request" && msg.requestId === "ready-check",
			);
			sendInputResponse(p.conn.ws, "ready-check", true, p.name);
		}),
	);
}

export function delay(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}
