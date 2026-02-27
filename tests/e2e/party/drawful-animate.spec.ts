import { expect, test } from "playwright/test";

const API_BASE = "http://api.slopcade.localhost:1355";

interface CreateRoomResponse {
	code: string;
	hostToken: string;
	hostId: string;
}

interface PartyMessage {
	type: string;
	state?: {
		phase: string;
		players: Array<{
			id: string;
			name: string;
			connected: boolean;
			isHost?: boolean;
			score?: number;
		}>;
		hostId: string;
		sharedData?: Record<string, unknown>;
	};
	player?: { id: string; name: string; connected: boolean };
	playerId?: string;
	phase?: string;
	request?: {
		type: string;
		prompt: string;
		timeLimit?: number;
		options?: string[];
	};
	requestId?: string;
	response?: { playerId: string; value: unknown; timestamp: number };
	code?: string;
	message?: string;
}

async function createRoom(opts?: {
	template?: string;
	minPlayers?: number;
}): Promise<CreateRoomResponse> {
	const response = await fetch(`${API_BASE}/api/party/create`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(opts ?? {}),
	});
	expect(response.status).toBe(201);
	const data = (await response.json()) as CreateRoomResponse;
	expect(data.code).toBeTruthy();
	expect(data.hostToken).toBeTruthy();
	expect(data.hostId).toBeTruthy();
	return data;
}

function connectWebSocket(
	code: string,
	params: Record<string, string>,
): Promise<{ ws: WebSocket; messages: PartyMessage[]; close: () => void }> {
	return new Promise((resolve, reject) => {
		const searchParams = new URLSearchParams(params);
		const wsUrl = `ws://api.slopcade.localhost:1355/api/party/${code}/ws?${searchParams.toString()}`;
		const ws = new WebSocket(wsUrl);
		const messages: PartyMessage[] = [];

		ws.onopen = () => resolve({ ws, messages, close: () => ws.close() });

		ws.onmessage = (event) => {
			try {
				messages.push(JSON.parse(event.data as string) as PartyMessage);
			} catch {
				/* non-JSON frame */
			}
		};

		ws.onerror = () =>
			reject(new Error(`WebSocket connection failed to ${wsUrl}`));

		setTimeout(() => reject(new Error("WebSocket connection timeout")), 10_000);
	});
}

function waitForMessage(
	messages: PartyMessage[],
	predicate: (msg: PartyMessage) => boolean,
	timeoutMs = 30_000,
	startIndex = 0,
): Promise<PartyMessage> {
	return new Promise((resolve, reject) => {
		const startLen = messages.length;
		let checkIndex = startIndex;

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
			reject(
				new Error(
					`Timed out waiting for message (${timeoutMs}ms). Received ${messages.length - startLen} messages since start: ${JSON.stringify(messages.slice(startLen), null, 2)}`,
				),
			);
		}, timeoutMs);
	});
}

function getPlayerIdFromState(
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

function sendInputResponse(
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

test.describe("Drawful Animate E2E", () => {
	test("full drawful animate game flow: create → join → start → draw → bluff → vote → winner", async () => {
		test.setTimeout(180_000);
		const room = await createRoom({
			template: "drawful-animate",
			minPlayers: 3,
		});

		const host = await connectWebSocket(room.code, {
			role: "host",
			token: room.hostToken,
		});

		const hostState = await waitForMessage(
			host.messages,
			(msg) => msg.type === "state_update",
		);
		expect(hostState.state?.phase).toBe("lobby");

		const alice = await connectWebSocket(room.code, {
			role: "player",
			name: "Alice",
		});
		const bob = await connectWebSocket(room.code, {
			role: "player",
			name: "Bob",
		});
		const charlie = await connectWebSocket(room.code, {
			role: "player",
			name: "Charlie",
		});

		await waitForMessage(alice.messages, (msg) => msg.type === "state_update");
		await waitForMessage(bob.messages, (msg) => msg.type === "state_update");
		await waitForMessage(
			charlie.messages,
			(msg) => msg.type === "state_update",
		);

		await new Promise((r) => setTimeout(r, 500));

		const aliceId = getPlayerIdFromState(alice.messages, "Alice");
		const bobId = getPlayerIdFromState(bob.messages, "Bob");
		const charlieId = getPlayerIdFromState(charlie.messages, "Charlie");
		expect(aliceId).toBeTruthy();
		expect(bobId).toBeTruthy();
		expect(charlieId).toBeTruthy();

		const players: Array<{
			name: string;
			id: string;
			conn: { ws: WebSocket; messages: PartyMessage[]; close: () => void };
		}> = [
			{ name: "Alice", id: aliceId!, conn: alice },
			{ name: "Bob", id: bobId!, conn: bob },
			{ name: "Charlie", id: charlieId!, conn: charlie },
		];

		host.ws.send(JSON.stringify({ type: "start_game" }));

		for (const p of players) {
			const readyReq = await waitForMessage(
				p.conn.messages,
				(msg) =>
					msg.type === "input_request" && msg.requestId === "ready-check",
			);
			expect(readyReq.request?.type).toBe("buzzer");
			sendInputResponse(p.conn.ws, "ready-check", true, p.name);
		}

		const ROUND_COUNT = 2;

		for (let round = 1; round <= ROUND_COUNT; round++) {
			const drawingF1State = await waitForMessage(
				host.messages,
				(msg) =>
					msg.type === "state_update" &&
					msg.state?.sharedData?.phase === "drawing_f1" &&
					msg.state?.sharedData?.round === round,
			);
			expect(drawingF1State.state?.sharedData?.phase).toBe("drawing_f1");

			for (const p of players) {
				const reqStart = p.conn.messages.length;
				const frame1Req = await waitForMessage(
					p.conn.messages,
					(msg) =>
						msg.type === "input_request" && msg.requestId === "drawing-frame1",
					30_000,
					reqStart,
				);
				expect(frame1Req.request?.type).toBe("drawing");
				sendInputResponse(
					p.conn.ws,
					"drawing-frame1",
					`{"frame":1,"artist":"${p.name}","round":${round}}`,
					p.name,
				);
			}

			const drawingF2Start = host.messages.length;
			const drawingF2State = await waitForMessage(
				host.messages,
				(msg) =>
					msg.type === "state_update" &&
					msg.state?.sharedData?.phase === "drawing_f2" &&
					msg.state?.sharedData?.round === round,
				30_000,
				drawingF2Start,
			);
			expect(drawingF2State.state?.sharedData?.phase).toBe("drawing_f2");

			for (const p of players) {
				const reqStart = p.conn.messages.length;
				const frame2Req = await waitForMessage(
					p.conn.messages,
					(msg) =>
						msg.type === "input_request" && msg.requestId === "drawing-frame2",
					30_000,
					reqStart,
				);
				expect(frame2Req.request?.type).toBe("drawing");
				sendInputResponse(
					p.conn.ws,
					"drawing-frame2",
					`{"frame":2,"artist":"${p.name}","round":${round}}`,
					p.name,
				);
			}

			const bluffingStart = host.messages.length;
			const bluffingState = await waitForMessage(
				host.messages,
				(msg) =>
					msg.type === "state_update" &&
					msg.state?.sharedData?.phase === "bluffing" &&
					msg.state?.sharedData?.round === round,
				30_000,
				bluffingStart,
			);
			expect(bluffingState.state?.sharedData?.phase).toBe("bluffing");

			for (const p of players) {
				const reqStart = p.conn.messages.length;
				const bluffReq = await waitForMessage(
					p.conn.messages,
					(msg) => msg.type === "input_request" && msg.requestId === "bluff",
					30_000,
					reqStart,
				);
				expect(bluffReq.request?.type).toBe("text");
				sendInputResponse(
					p.conn.ws,
					"bluff",
					`${p.name} bluff for round ${round}`,
					p.name,
				);
			}

			const ANIMATIONS_PER_ROUND = players.length;

			for (
				let animationIndex = 0;
				animationIndex < ANIMATIONS_PER_ROUND;
				animationIndex++
			) {
				const votingStart = host.messages.length;
				const votingState = await waitForMessage(
					host.messages,
					(msg) =>
						msg.type === "state_update" &&
						msg.state?.sharedData?.phase === "voting" &&
						msg.state?.sharedData?.round === round,
					30_000,
					votingStart,
				);
				expect(votingState.state?.sharedData?.currentAnimation).toBeTruthy();

				const currentAnimation = votingState.state?.sharedData
					?.currentAnimation as {
					artistName: string;
					titles: string[];
				};

				for (const p of players) {
					if (p.name === currentAnimation.artistName) {
						continue;
					}
					const reqStart = p.conn.messages.length;
					const voteReq = await waitForMessage(
						p.conn.messages,
						(msg) => msg.type === "input_request" && msg.requestId === "vote",
						30_000,
						reqStart,
					);
					expect(voteReq.request?.type).toBe("choice");
					sendInputResponse(p.conn.ws, "vote", 0, p.name);
				}

				const revealStart = host.messages.length;
				const revealState = await waitForMessage(
					host.messages,
					(msg) =>
						msg.type === "state_update" &&
						msg.state?.sharedData?.phase === "reveal",
					30_000,
					revealStart,
				);
				expect(revealState.state?.sharedData?.results).toBeTruthy();
			}

			const scoresStart = host.messages.length;
			const scoresState = await waitForMessage(
				host.messages,
				(msg) =>
					msg.type === "state_update" &&
					msg.state?.sharedData?.phase === "scores" &&
					msg.state?.sharedData?.round === round,
				30_000,
				scoresStart,
			);
			expect(scoresState.state?.sharedData?.scoreboard).toBeTruthy();
		}

		const winnerState = await waitForMessage(
			host.messages,
			(msg) =>
				msg.type === "state_update" &&
				msg.state?.sharedData?.phase === "winner",
			60_000,
		);

		expect(winnerState.state?.sharedData?.winner).toBeTruthy();
		expect(winnerState.state?.sharedData?.scoreboard).toBeTruthy();

		const winner = winnerState.state?.sharedData?.winner as {
			id: string;
			name: string;
			score: number;
		};
		const scoreboard = winnerState.state?.sharedData?.scoreboard as Array<{
			id: string;
			name: string;
			score: number;
		}>;

		expect(winner.name).toBeTruthy();
		expect(scoreboard.length).toBe(3);
		expect(["Alice", "Bob", "Charlie"]).toContain(winner.name);
		expect(scoreboard[0].name).toBe(winner.name);

		host.close();
		alice.close();
		bob.close();
		charlie.close();
	});
});
