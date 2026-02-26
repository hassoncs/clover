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
		}>;
		hostId: string;
		sharedData?: Record<string, unknown>;
	};
	player?: { id: string; name: string; connected: boolean };
	playerId?: string;
	phase?: string;
	request?: { type: string; prompt: string; timeLimit?: number };
	requestId?: string;
	response?: { playerId: string; value: unknown; timestamp: number };
	code?: string;
	message?: string;
}

async function createRoom(): Promise<CreateRoomResponse> {
	const response = await fetch(`${API_BASE}/api/party/create`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
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

		ws.onopen = () => {
			console.log("WS OPEN");
			ws.send(JSON.stringify({ type: "ping" }));
			resolve({ ws, messages, close: () => ws.close() });
		};

		ws.onmessage = (event) => {
			console.log("WS MESSAGE:", event.data);
			try {
				messages.push(JSON.parse(event.data as string) as PartyMessage);
			} catch (e) {
				console.error("WS PARSE ERROR:", e);
			}
		};

		ws.onerror = (e) => {
			console.error("WS ERROR:", e);
			reject(new Error(`WebSocket connection failed to ${wsUrl}`));
		};

		ws.onclose = (e) => {
			console.log("WS CLOSED:", e.code, e.reason);
		};

		setTimeout(() => reject(new Error("WebSocket connection timeout")), 30_000);
	});
}

function waitForMessage(
	messages: PartyMessage[],
	predicate: (msg: PartyMessage) => boolean,
	timeoutMs = 30000,
): Promise<PartyMessage> {
	return new Promise((resolve, reject) => {
		const startLen = messages.length;
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
			reject(
				new Error(
					`Timed out waiting for message. Received ${messages.length - startLen} messages: ${JSON.stringify(messages.slice(startLen), null, 2)}`,
				),
			);
		}, timeoutMs);
	});
}

test.describe("Party Quick Poll E2E", () => {
	test("full game flow: create room → join → start poll → vote → reveal", async () => {
		// Given: a room is created via API
		const room = await createRoom();

		// When: host connects via WebSocket
		const host = await connectWebSocket(room.code, {
			role: "host",
			token: room.hostToken,
		});

		// Then: host receives lobby state
		const hostState = await waitForMessage(
			host.messages,
			(msg) => msg.type === "state_update",
		);
		expect(hostState.state?.phase).toBe("lobby");

		// When: player Bob joins
		const player = await connectWebSocket(room.code, {
			role: "player",
			name: "Bob",
		});

		// Then: player sees lobby
		const playerState = await waitForMessage(
			player.messages,
			(msg) => msg.type === "state_update",
		);
		expect(playerState.state?.phase).toBe("lobby");

		// When: host starts the poll (phase change to 'voting')
		host.ws.send(JSON.stringify({ type: "phase_change", phase: "voting" }));

		// Then: both receive phase_change to voting
		await waitForMessage(
			host.messages,
			(msg) => msg.type === "phase_change" && msg.phase === "voting",
		);
		await waitForMessage(
			player.messages,
			(msg) => msg.type === "phase_change" && msg.phase === "voting",
		);

		// When: host sets the poll prompt AND requests input
		host.ws.send(
			JSON.stringify({
				type: "state_update",
				state: {
					phase: "voting",
					players: hostState.state?.players ?? [],
					hostId: room.hostId,
					sharedData: {
						pollPrompt: "Best JS framework?",
						voteCount: 0,
					},
				},
			}),
		);

		host.ws.send(
			JSON.stringify({
				type: "input_request",
				requestId: "vote-1",
				request: {
					type: "text",
					prompt: "Best JS framework?",
					timeLimit: 60,
				},
			}),
		);

		// Then: player sees the prompt
		const promptMsg = await waitForMessage(
			player.messages,
			(msg) =>
				msg.type === "state_update" &&
				msg.state?.sharedData?.pollPrompt === "Best JS framework?",
		);
		expect(promptMsg.state?.sharedData?.pollPrompt).toBe("Best JS framework?");

		// Then: player receives input_request
		const inputReq = await waitForMessage(
			player.messages,
			(msg) => msg.type === "input_request",
		);
		expect(inputReq.request?.prompt).toBe("Best JS framework?");

		// When: player submits a vote
		player.ws.send(
			JSON.stringify({
				type: "input_response",
				requestId: "vote-1",
				response: {
					playerId: "",
					value: "Svelte",
					timestamp: Date.now(),
				},
			}),
		);

		// Then: host receives the vote
		const vote = await waitForMessage(
			host.messages,
			(msg) => msg.type === "input_response",
		);
		expect(vote.response?.value).toBe("Svelte");

		// When: host reveals results (phase change to 'results')
		host.ws.send(JSON.stringify({ type: "phase_change", phase: "results" }));

		// Then: both receive phase_change to results
		await waitForMessage(
			host.messages,
			(msg) => msg.type === "phase_change" && msg.phase === "results",
		);

		host.close();
		player.close();
	});
});
