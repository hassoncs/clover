import { expect, test } from "playwright/test";

const API_BASE = "http://localhost:8789";

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

interface PlayerConnection {
	ws: WebSocket;
	messages: PartyMessage[];
	close: () => void;
	playerId: string | null;
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
		const wsUrl = `ws://localhost:8789/api/party/${code}/ws?${searchParams.toString()}`;
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

test.describe("Quiplash E2E", () => {
	test("full quiplash game flow: create → join → start → answer → vote → winner", async () => {
		test.setTimeout(180_000);
		const room = await createRoom({
			template: "quiplash",
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

		const ROUND_COUNT = 3;

		for (let round = 1; round <= ROUND_COUNT; round++) {
			const answeringState = await waitForMessage(
				host.messages,
				(msg) =>
					msg.type === "state_update" &&
					msg.state?.sharedData?.phase === "answering" &&
					msg.state?.sharedData?.roundNumber === round,
			);
			expect(answeringState.state?.sharedData?.phase).toBe("answering");

			const assignmentsJson = answeringState.state?.sharedData
				?.assignmentsJson as string;
			expect(assignmentsJson).toBeTruthy();
			const assignments = JSON.parse(assignmentsJson) as Record<
				string,
				Array<{ matchupIndex: number; promptText: string }>
			>;

			for (const p of players) {
				await waitForMessage(
					p.conn.messages,
					(msg) =>
						msg.type === "input_request" &&
						msg.requestId === `answers-r${round}`,
				);
			}

			for (const p of players) {
				const playerAssignments = assignments[p.id] ?? [];
				const answers: Record<number, string> = {};
				for (const a of playerAssignments) {
					answers[a.matchupIndex] =
						`${p.name}'s answer to: ${a.promptText.slice(0, 20)}`;
				}
				sendInputResponse(
					p.conn.ws,
					`answers-r${round}`,
					JSON.stringify(answers),
				);
			}

			const totalMatchups = answeringState.state?.sharedData
				?.totalMatchups as number;
			expect(totalMatchups).toBe(3);

			for (let mi = 0; mi < totalMatchups; mi++) {
				const votingState = await waitForMessage(
					host.messages,
					(msg) =>
						msg.type === "state_update" &&
						msg.state?.sharedData?.phase === "voting" &&
						msg.state?.sharedData?.roundNumber === round &&
						msg.state?.sharedData?.matchupIndex === mi + 1,
				);
				expect(votingState.state?.sharedData?.phase).toBe("voting");

				const votersJson = votingState.state?.sharedData?.votersJson as string;
				const voters = JSON.parse(votersJson) as string[];

				for (const p of players) {
					if (voters.includes(p.id)) {
						await waitForMessage(
							p.conn.messages,
							(msg) =>
								msg.type === "input_request" &&
								msg.requestId === `vote-r${round}-m${mi}`,
						);
						sendInputResponse(p.conn.ws, `vote-r${round}-m${mi}`, "0");
					}
				}

				await waitForMessage(
					host.messages,
					(msg) =>
						msg.type === "state_update" &&
						msg.state?.sharedData?.phase === "reveal" &&
						msg.state?.sharedData?.roundNumber === round &&
						msg.state?.sharedData?.matchupIndex === mi + 1,
				);
			}

			await waitForMessage(
				host.messages,
				(msg) =>
					msg.type === "state_update" &&
					msg.state?.sharedData?.phase === "scores" &&
					msg.state?.sharedData?.roundNumber === round,
			);

			const scoresState = host.messages
				.filter(
					(msg) =>
						msg.type === "state_update" &&
						msg.state?.sharedData?.phase === "scores" &&
						msg.state?.sharedData?.roundNumber === round,
				)
				.pop();
			expect(scoresState?.state?.sharedData?.scoreboardJson).toBeTruthy();
		}

		const winnerState = await waitForMessage(
			host.messages,
			(msg) =>
				msg.type === "state_update" &&
				msg.state?.sharedData?.phase === "winner",
			60_000,
		);

		expect(winnerState.state?.sharedData?.winnerName).toBeTruthy();
		expect(winnerState.state?.sharedData?.scoreboardJson).toBeTruthy();

		const finalScoreboard = JSON.parse(
			winnerState.state?.sharedData?.scoreboardJson as string,
		) as Array<{ playerId: string; playerName: string; score: number }>;
		expect(finalScoreboard.length).toBe(3);
		expect(finalScoreboard[0].score).toBeGreaterThanOrEqual(0);

		const winnerName = winnerState.state?.sharedData?.winnerName as string;
		expect(["Alice", "Bob", "Charlie"]).toContain(
			finalScoreboard[0].playerName,
		);
		expect(winnerName).toBe(finalScoreboard[0].playerName);

		host.close();
		alice.close();
		bob.close();
		charlie.close();
	});
});
