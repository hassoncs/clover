import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

interface MockStub {
	fetch: ReturnType<typeof vi.fn>;
}

interface MockDONamespace {
	idFromName: ReturnType<typeof vi.fn>;
	get: ReturnType<typeof vi.fn>;
}

function createMockEnv(): { PARTY_ROOM: MockDONamespace } {
	const stubs = new Map<string, MockStub>();

	const namespace: MockDONamespace = {
		idFromName: vi.fn((name: string) => ({ name })),
		get: vi.fn((id: { name: string }) => {
			if (!stubs.has(id.name)) {
				stubs.set(id.name, {
					fetch: vi.fn(async (req: Request) => {
						const url = new URL(req.url);
						if (url.pathname === "/status") {
							return new Response(JSON.stringify({ active: false }), {
								headers: { "Content-Type": "application/json" },
							});
						}
						if (url.pathname === "/init") {
							return new Response(JSON.stringify({ ok: true }), {
								headers: { "Content-Type": "application/json" },
							});
						}
						return new Response("Not found", { status: 404 });
					}),
				});
			}
			return stubs.get(id.name)!;
		}),
	};

	return { PARTY_ROOM: namespace };
}

const CREATE_RATE_LIMIT_WINDOW_MS = 60_000;
const CREATE_RATE_LIMIT_MAX = 5;
const MAX_CODE_RETRIES = 5;

function generateRoomCode(): string {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
	let code = "";
	for (let i = 0; i < 4; i++) {
		code += chars[Math.floor(Math.random() * chars.length)];
	}
	return code;
}

function createPartyApp() {
	const createRateLimits = new Map<
		string,
		{ count: number; windowStart: number }
	>();

	const app = new Hono<{
		Bindings: { PARTY_ROOM: MockDONamespace };
	}>();

	app.post("/api/party/create", async (c) => {
		const ip =
			c.req.header("cf-connecting-ip") ??
			c.req.header("x-forwarded-for") ??
			"unknown";
		const now = Date.now();
		const entry = createRateLimits.get(ip);
		if (entry && now - entry.windowStart < CREATE_RATE_LIMIT_WINDOW_MS) {
			entry.count++;
			if (entry.count > CREATE_RATE_LIMIT_MAX) {
				return c.json(
					{ error: "Too many rooms created. Try again later." },
					429,
				);
			}
		} else {
			createRateLimits.set(ip, { count: 1, windowStart: now });
		}

		let code: string | null = null;

		for (let i = 0; i < MAX_CODE_RETRIES; i++) {
			const candidate = generateRoomCode();
			const doId = c.env.PARTY_ROOM.idFromName(candidate);
			const stub = c.env.PARTY_ROOM.get(doId);

			try {
				const statusRes = await stub.fetch(
					new Request("https://party/status"),
				);
				const status = (await statusRes.json()) as { active: boolean };

				if (!status.active) {
					code = candidate;
					break;
				}
			} catch {
				code = candidate;
				break;
			}
		}

		if (!code) {
			return c.json(
				{ error: "Could not generate unique room code. Try again." },
				503,
			);
		}

		const hostId = crypto.randomUUID();
		const hostToken = crypto.randomUUID();

		const body = (await c.req.json().catch(() => ({}))) as {
			template?: string;
			minPlayers?: number;
		};

		const doId = c.env.PARTY_ROOM.idFromName(code);
		const stub = c.env.PARTY_ROOM.get(doId);

		const initBody: Record<string, unknown> = {
			hostId,
			hostToken,
			roomCode: code,
		};
		if (body.template) {
			initBody.template = body.template;
		}
		if (body.minPlayers !== undefined) {
			initBody.minPlayers = body.minPlayers;
		}

		const initResponse = await stub.fetch(
			new Request("https://party/init", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(initBody),
			}),
		);

		if (!initResponse.ok) {
			return c.json({ error: "Failed to create room" }, 500);
		}

		return c.json({ code, hostToken, hostId }, 201);
	});

	app.get("/api/party/:code/ws", async (c) => {
		const upgrade = c.req.header("Upgrade");
		if (!upgrade || upgrade.toLowerCase() !== "websocket") {
			return c.text("Expected websocket upgrade", 426);
		}

		const code = c.req.param("code");
		if (!code) {
			return c.text("Room code is required", 400);
		}

		const doId = c.env.PARTY_ROOM.idFromName(code);
		const stub = c.env.PARTY_ROOM.get(doId);

		return stub.fetch(c.req.raw);
	});

	return { app, createRateLimits };
}

describe("Party routes", () => {
	let app: ReturnType<typeof createPartyApp>["app"];
	let env: ReturnType<typeof createMockEnv>;

	beforeEach(() => {
		vi.useFakeTimers();
		const created = createPartyApp();
		app = created.app;
		env = createMockEnv();
	});

	function request(
		method: string,
		path: string,
		options?: {
			body?: unknown;
			headers?: Record<string, string>;
		},
	): Request {
		const init: RequestInit = {
			method,
			headers: options?.headers ?? {},
		};
		if (options?.body) {
			init.body = JSON.stringify(options.body);
			(init.headers as Record<string, string>)["Content-Type"] =
				"application/json";
		}
		return new Request(`https://test${path}`, init);
	}

	async function fetch(req: Request) {
		return app.fetch(req, env);
	}

	describe("POST /api/party/create", () => {
		it("returns 201 with code, hostToken, and hostId", async () => {
			const res = await fetch(request("POST", "/api/party/create"));
			expect(res.status).toBe(201);

			const data = (await res.json()) as {
				code: string;
				hostToken: string;
				hostId: string;
			};
			expect(data.code).toBeDefined();
			expect(data.code).toHaveLength(4);
			expect(data.hostToken).toBeDefined();
			expect(data.hostId).toBeDefined();
		});

		it("generates a 4-character alphanumeric room code", async () => {
			const res = await fetch(request("POST", "/api/party/create"));
			const data = (await res.json()) as { code: string };
			expect(data.code).toMatch(/^[A-Z0-9]{4}$/);
		});

		it("calls DO init with hostId, hostToken, and roomCode", async () => {
			const res = await fetch(request("POST", "/api/party/create"));
			const data = (await res.json()) as { code: string };

			const doId = env.PARTY_ROOM.idFromName(data.code);
			const stub = env.PARTY_ROOM.get(doId) as MockStub;

			const initCall = stub.fetch.mock.calls.find((call: unknown[]) => {
				const req = call[0] as Request;
				return new URL(req.url).pathname === "/init";
			});
			expect(initCall).toBeDefined();

			const initReq = initCall![0] as Request;
			const initBody = (await initReq.json()) as Record<string, unknown>;
			expect(initBody.hostId).toBeDefined();
			expect(initBody.hostToken).toBeDefined();
			expect(initBody.roomCode).toBe(data.code);
		});

		it("passes template and minPlayers to DO init", async () => {
			const res = await fetch(
				request("POST", "/api/party/create", {
					body: { template: "trivia", minPlayers: 4 },
				}),
			);
			expect(res.status).toBe(201);

			const data = (await res.json()) as { code: string };
			const doId = env.PARTY_ROOM.idFromName(data.code);
			const stub = env.PARTY_ROOM.get(doId) as MockStub;

			const initCall = stub.fetch.mock.calls.find((call: unknown[]) => {
				const req = call[0] as Request;
				return new URL(req.url).pathname === "/init";
			});
			const initBody = (await initCall![0].json()) as Record<
				string,
				unknown
			>;
			expect(initBody.template).toBe("trivia");
			expect(initBody.minPlayers).toBe(4);
		});

		it("rate limits after 5 creates from same IP", async () => {
			for (let i = 0; i < 5; i++) {
				const res = await fetch(
					request("POST", "/api/party/create", {
						headers: { "cf-connecting-ip": "1.2.3.4" },
					}),
				);
				expect(res.status).toBe(201);
			}

			const rateLimited = await fetch(
				request("POST", "/api/party/create", {
					headers: { "cf-connecting-ip": "1.2.3.4" },
				}),
			);
			expect(rateLimited.status).toBe(429);
			const data = (await rateLimited.json()) as { error: string };
			expect(data.error).toContain("Too many");
		});

		it("allows creates from different IPs independently", async () => {
			for (let i = 0; i < 5; i++) {
				await fetch(
					request("POST", "/api/party/create", {
						headers: { "cf-connecting-ip": "1.1.1.1" },
					}),
				);
			}

			const res = await fetch(
				request("POST", "/api/party/create", {
					headers: { "cf-connecting-ip": "2.2.2.2" },
				}),
			);
			expect(res.status).toBe(201);
		});

		it("returns 503 when all code candidates are active rooms", async () => {
			env.PARTY_ROOM.get = vi.fn(() => ({
				fetch: vi.fn(async () =>
					new Response(JSON.stringify({ active: true }), {
						headers: { "Content-Type": "application/json" },
					}),
				),
			}));

			const res = await fetch(request("POST", "/api/party/create"));
			expect(res.status).toBe(503);
			const data = (await res.json()) as { error: string };
			expect(data.error).toContain("unique room code");
		});

		it("returns 500 when DO init fails", async () => {
			env.PARTY_ROOM.get = vi.fn(() => ({
				fetch: vi.fn(async (req: Request) => {
					const url = new URL(req.url);
					if (url.pathname === "/status") {
						return new Response(JSON.stringify({ active: false }));
					}
					return new Response("Internal error", { status: 500 });
				}),
			}));

			const res = await fetch(request("POST", "/api/party/create"));
			expect(res.status).toBe(500);
		});
	});

	describe("GET /api/party/:code/ws", () => {
		it("returns 426 without websocket upgrade header", async () => {
			const res = await fetch(request("GET", "/api/party/ABCD/ws"));
			expect(res.status).toBe(426);
			const text = await res.text();
			expect(text).toContain("websocket");
		});

		it("forwards request to DO stub with correct room code", async () => {
			const mockResponse = new Response("ws response", { status: 200 });
			const stubFetch = vi.fn(async () => mockResponse);
			env.PARTY_ROOM.get = vi.fn(() => ({ fetch: stubFetch }));

			await fetch(
				request("GET", "/api/party/XYZW/ws", {
					headers: { Upgrade: "websocket" },
				}),
			);

			expect(env.PARTY_ROOM.idFromName).toHaveBeenCalledWith("XYZW");
			expect(stubFetch).toHaveBeenCalledTimes(1);
		});

		it("uses room code from URL path", async () => {
			const stubFetch = vi.fn(async () => new Response(null, { status: 200 }));
			env.PARTY_ROOM.get = vi.fn(() => ({ fetch: stubFetch }));

			await fetch(
				request("GET", "/api/party/TEST/ws", {
					headers: { Upgrade: "websocket" },
				}),
			);

			expect(env.PARTY_ROOM.idFromName).toHaveBeenCalledWith("TEST");
		});
	});
});
