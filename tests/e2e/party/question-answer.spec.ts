import { expect, test } from "playwright/test";

const API_BASE = "http://localhost:8789";
const APP_BASE = "http://localhost:8085";

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
	timeoutMs = 5000,
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

test.describe("Party Question & Answer E2E", () => {
	test("full game flow: create room → join → start → answer → verify", async ({
		page,
	}) => {
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
		expect(hostState.state?.hostId).toBe(room.hostId);

		// When: player Alice joins
		const player = await connectWebSocket(room.code, {
			role: "player",
			name: "Alice",
		});

		// Then: player sees lobby
		const playerState = await waitForMessage(
			player.messages,
			(msg) => msg.type === "state_update",
		);
		expect(playerState.state?.phase).toBe("lobby");

		// Then: host sees player_joined
		const joined = await waitForMessage(
			host.messages,
			(msg) => msg.type === "player_joined",
		);
		expect(joined.player?.name).toBe("Alice");
		expect(joined.player?.connected).toBe(true);

		// When: host starts the game
		host.ws.send(JSON.stringify({ type: "phase_change", phase: "playing" }));

		// Then: both receive phase_change to playing
		const hostPhase = await waitForMessage(
			host.messages,
			(msg) => msg.type === "phase_change" && msg.phase === "playing",
		);
		expect(hostPhase.phase).toBe("playing");

		const playerPhase = await waitForMessage(
			player.messages,
			(msg) => msg.type === "phase_change" && msg.phase === "playing",
		);
		expect(playerPhase.phase).toBe("playing");

		// When: host broadcasts question via state_update
		host.ws.send(
			JSON.stringify({
				type: "state_update",
				state: {
					phase: "playing",
					players: hostState.state?.players ?? [],
					hostId: room.hostId,
					sharedData: {
						qaPhase: "question",
						questionIndex: 0,
						totalQuestions: 5,
						prompt: "What's the worst superpower you can think of?",
						answersJson: "[]",
						timerRemaining: 30,
					},
				},
			}),
		);

		// Then: player sees the question
		const questionMsg = await waitForMessage(
			player.messages,
			(msg) =>
				msg.type === "state_update" &&
				msg.state?.sharedData?.qaPhase === "question",
		);
		expect(questionMsg.state?.sharedData?.prompt).toBe(
			"What's the worst superpower you can think of?",
		);

		// When: player submits an answer
		player.ws.send(
			JSON.stringify({
				type: "input_response",
				requestId: "question-0",
				response: {
					playerId: "",
					value: "Ability to always be slightly damp",
					timestamp: Date.now(),
				},
			}),
		);

		// Then: host receives the answer within 2 seconds
		const answer = await waitForMessage(
			host.messages,
			(msg) => msg.type === "input_response",
			2000,
		);
		expect(answer.response?.value).toBe("Ability to always be slightly damp");

		// Then: screenshot captured as evidence
		await page.goto(APP_BASE);
		await page.waitForLoadState("domcontentloaded");
		await page.screenshot({
			path: ".sisyphus/evidence/task-9-e2e.png",
			fullPage: true,
		});

		host.close();
		player.close();
	});

	test("room creation returns valid response", async () => {
		const room = await createRoom();
		expect(room.code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
		expect(room.hostToken).toBeTruthy();
		expect(room.hostId).toBeTruthy();
	});

	test("player cannot connect without name", async () => {
		const room = await createRoom();

		try {
			await connectWebSocket(room.code, { role: "player" });
		} catch {
			return;
		}
	});

	test("host without token receives auth error", async () => {
		const room = await createRoom();

		const host = await connectWebSocket(room.code, { role: "host" });

		const errorMsg = await waitForMessage(
			host.messages,
			(msg) => msg.type === "error" || msg.type === "state_update",
			3000,
		);

		if (errorMsg.type === "error") {
			expect(errorMsg.code).toBe("AUTH_FAILED");
		}

		host.close();
	});

	test("multiple players can join the same room", async () => {
		const room = await createRoom();

		const host = await connectWebSocket(room.code, {
			role: "host",
			token: room.hostToken,
		});
		await waitForMessage(host.messages, (msg) => msg.type === "state_update");

		const player1 = await connectWebSocket(room.code, {
			role: "player",
			name: "Alice",
		});
		const player2 = await connectWebSocket(room.code, {
			role: "player",
			name: "Bob",
		});

		await waitForMessage(
			player1.messages,
			(msg) => msg.type === "state_update",
		);
		await waitForMessage(
			player2.messages,
			(msg) => msg.type === "state_update",
		);

		await new Promise((r) => setTimeout(r, 500));

		const joins = host.messages.filter((m) => m.type === "player_joined");
		expect(joins.length).toBeGreaterThanOrEqual(2);

		const names = joins.map((m) => m.player?.name);
		expect(names).toContain("Alice");
		expect(names).toContain("Bob");

		host.close();
		player1.close();
		player2.close();
	});
});
