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
	data?: { type: string; row?: number; col?: number; positionLabel?: string };
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

test.describe("Chroma Clues E2E", () => {
	test("full chroma clues game flow: create → join → start → clue → guess → reveal → winner", async () => {
		test.setTimeout(180_000);
		const room = await createRoom({
			template: "chroma-clues",
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

		// Ready check
		for (const p of players) {
			const readyReq = await waitForMessage(
				p.conn.messages,
				(msg) =>
					msg.type === "input_request" && msg.requestId === "ready-check",
			);
			expect(readyReq.request?.type).toBe("buzzer");
			sendInputResponse(p.conn.ws, "ready-check", true, p.name);
		}

		const ROUND_COUNT = 3;

		for (let round = 1; round <= ROUND_COUNT; round++) {
			// Wait for clue_giving phase
			const clueGivingState = await waitForMessage(
				host.messages,
				(msg) =>
					msg.type === "state_update" &&
					msg.state?.sharedData?.phase === "clue_giving" &&
					msg.state?.sharedData?.round === round,
			);
			expect(clueGivingState.state?.sharedData?.phase).toBe("clue_giving");

			const cueGiverId = clueGivingState.state?.sharedData
				?.cueGiverId as string;
			const cueGiver = players.find((p) => p.id === cueGiverId)!;
			const guessers = players.filter((p) => p.id !== cueGiverId);

			const targetMsg = await waitForMessage(
				cueGiver.conn.messages,
				(msg) =>
					msg.type === "private_state" && msg.data?.type === "target_position",
				30_000,
				0,
			).then(
				(msg) =>
					msg.data as { row: number; col: number; positionLabel: string },
			);
			expect(targetMsg.row).toBeGreaterThanOrEqual(0);
			expect(targetMsg.col).toBeGreaterThanOrEqual(0);
			expect(targetMsg.positionLabel).toBeTruthy();

			// Cue giver submits clue
			const clueReq = await waitForMessage(
				cueGiver.conn.messages,
				(msg) => msg.type === "input_request" && msg.requestId === "clue",
			);
			expect(clueReq.request?.type).toBe("text");
			sendInputResponse(cueGiver.conn.ws, "clue", "sunset", cueGiver.name);

			// Wait for first_guess phase
			const firstGuessState = await waitForMessage(
				host.messages,
				(msg) =>
					msg.type === "state_update" &&
					msg.state?.sharedData?.phase === "first_guess" &&
					msg.state?.sharedData?.round === round,
			);
			expect(firstGuessState.state?.sharedData?.phase).toBe("first_guess");
			expect(firstGuessState.state?.sharedData?.clue).toBe("sunset");

			// Guessers place first marker
			for (const guesser of guessers) {
				const guessReq = await waitForMessage(
					guesser.conn.messages,
					(msg) =>
						msg.type === "input_request" && msg.requestId === "first_guess",
				);
				expect(guessReq.request?.type).toBe("choice");
				// Pick a position near the middle (index 210 = row 10, col 10)
				sendInputResponse(guesser.conn.ws, "first_guess", "210", guesser.name);
			}

			// Wait for second_guess phase
			const secondGuessState = await waitForMessage(
				host.messages,
				(msg) =>
					msg.type === "state_update" &&
					msg.state?.sharedData?.phase === "second_guess" &&
					msg.state?.sharedData?.round === round,
			);
			expect(secondGuessState.state?.sharedData?.phase).toBe("second_guess");

			// Guessers place second marker
			for (const guesser of guessers) {
				const guessReq = await waitForMessage(
					guesser.conn.messages,
					(msg) =>
						msg.type === "input_request" && msg.requestId === "second_guess",
				);
				expect(guessReq.request?.type).toBe("choice");
				// Pick a different position (index 195 = row 9, col 15)
				sendInputResponse(guesser.conn.ws, "second_guess", "195", guesser.name);
			}

			// Wait for reveal phase
			const revealState = await waitForMessage(
				host.messages,
				(msg) =>
					msg.type === "state_update" &&
					msg.state?.sharedData?.phase === "reveal" &&
					msg.state?.sharedData?.round === round,
				60_000, // Longer timeout since game uses delays
			);
			expect(revealState.state?.sharedData?.phase).toBe("reveal");

			const results = revealState.state?.sharedData?.results as {
				targetPosition: { row: number; col: number };
				targetLabel: string;
				markers: Array<{
					playerId: string;
					position: { row: number; col: number };
				}>;
				markerResults: Array<{
					playerId: string;
					distance: number;
					points: number;
				}>;
				pointsEarned: Record<string, number>;
				cueGiverBonus: number;
			};
			expect(results).toBeTruthy();
			expect(results.targetLabel).toBeTruthy();
			expect(results.markerResults.length).toBeGreaterThan(0);

			// Wait for scores phase
			const scoresState = await waitForMessage(
				host.messages,
				(msg) =>
					msg.type === "state_update" &&
					msg.state?.sharedData?.phase === "scores" &&
					msg.state?.sharedData?.round === round,
				60_000,
			);
			expect(scoresState.state?.sharedData?.phase).toBe("scores");

			const scoreboard = scoresState.state?.sharedData?.scoreboard as Array<{
				id: string;
				name: string;
				score: number;
			}>;
			expect(scoreboard).toBeTruthy();
			expect(scoreboard.length).toBe(3);
		}

		// Wait for winner phase
		const winnerState = await waitForMessage(
			host.messages,
			(msg) =>
				msg.type === "state_update" &&
				msg.state?.sharedData?.phase === "winner",
			60_000,
		);

		expect(winnerState.state?.sharedData?.winner).toBeTruthy();
		expect(winnerState.state?.sharedData?.scoreboard).toBeTruthy();

		const finalScoreboard = winnerState.state?.sharedData?.scoreboard as Array<{
			id: string;
			name: string;
			score: number;
		}>;
		expect(finalScoreboard.length).toBe(3);
		expect(finalScoreboard[0].score).toBeGreaterThanOrEqual(0);

		const winner = winnerState.state?.sharedData?.winner as {
			id: string;
			name: string;
			score: number;
		};
		expect(["Alice", "Bob", "Charlie"]).toContain(winner.name);

		host.close();
		alice.close();
		bob.close();
		charlie.close();
	});
});
