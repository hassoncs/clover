import { trpcServer } from "@hono/trpc-server";
import type { ContentType } from "@slopcade/shared/schema/party-content";
import { createClient } from "@supabase/supabase-js";
import type { ModelMessage } from "ai";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { RealtimeRelayDO } from "@/agent/RealtimeRelayDO";
import { resolveChatModel } from "@/ai/chat-model-config";
import { createModel } from "@/ai/model-factory";
import type { MessageRow } from "@/chat/chat-handler";
import { handleChatStream } from "@/chat/stream-handler";
import { resolveCorsOrigin } from "@/cors";
import { GameRepoDO } from "@/durable-objects/GameRepoDO";
import { USER_COSTS } from "@/economy/pricing";
import { WalletService } from "@/economy/wallet-service";
import { autoSeedGamesFromR2 } from "@/lib/auto-seed";
import { handleMcpRequest } from "@/mcp/server";
import { loadContentPackFromDB } from "@/party/content/prompt-loader";
import { PartyRoomDO } from "@/party/PartyRoomDO";
import { DEFINITION_BY_TEMPLATE_ID } from "@/party/templates/registry";
import audioRouter from "@/routes/audio";
import textGridRouter from "@/routes/text-grid";
import revenuecatWebhookRouter from "@/routes/webhooks/revenuecat";
import stripeWebhookRouter from "@/routes/webhooks/stripe";
import { GitService } from "@/services/git/GitService";
import { createContext, type Env } from "@/trpc/context";
import { appRouter } from "@/trpc/router";

const app = new Hono<{ Bindings: Env }>();

app.use(
	"*",
	cors({
		origin: resolveCorsOrigin,
		credentials: true,
	}),
);

app.use("*", async (c, next) => {
	if (__DEV__) {
		c.executionCtx.waitUntil(autoSeedGamesFromR2(c.env));
	}
	await next();
});

app.get("/health", (c) => c.json({ status: "ok", timestamp: Date.now() }));

app.get("/ws/speech-to-text", async (c) => {
	const upgrade = c.req.header("Upgrade");
	if (!upgrade || upgrade.toLowerCase() !== "websocket") {
		return c.text("Expected websocket upgrade", 426);
	}

	const token = new URL(c.req.url).searchParams.get("token");
	if (!token) {
		return c.text("Authentication required", 401);
	}

	let userId: string;

	if (__DEV__ && token === "dev-token") {
		userId = "00000000-0000-0000-0000-000000000000";
	} else {
		if (!c.env.SUPABASE_URL || !c.env.SUPABASE_SERVICE_ROLE_KEY) {
			return c.text("Auth not configured", 500);
		}

		const supabase = createClient(
			c.env.SUPABASE_URL,
			c.env.SUPABASE_SERVICE_ROLE_KEY,
		);
		const {
			data: { user },
			error,
		} = await supabase.auth.getUser(token);
		if (error || !user) {
			return c.text("Invalid or expired token", 401);
		}
		userId = user.id;
	}

	const id = c.env.REALTIME_RELAY.idFromName(userId + "-" + Date.now());
	const stub = c.env.REALTIME_RELAY.get(id);
	return stub.fetch(c.req.raw);
});

const createRateLimits = new Map<
	string,
	{ count: number; windowStart: number }
>();
const CREATE_RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const CREATE_RATE_LIMIT_MAX = 5; // 5 rooms per minute per IP

function generateRoomCode(): string {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
	let code = "";
	for (let i = 0; i < 4; i++) {
		code += chars[Math.floor(Math.random() * chars.length)];
	}
	return code;
}

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
			return c.json({ error: "Too many rooms created. Try again later." }, 429);
		}
	} else {
		createRateLimits.set(ip, { count: 1, windowStart: now });
	}

	const MAX_CODE_RETRIES = 5;
	let code: string | null = null;

	for (let i = 0; i < MAX_CODE_RETRIES; i++) {
		const candidate = generateRoomCode();
		const doId = c.env.PARTY_ROOM.idFromName(candidate);
		const stub = c.env.PARTY_ROOM.get(doId);

		try {
			const statusRes = await stub.fetch(new Request("https://party/status"));
			const status = (await statusRes.json()) as { active: boolean };

			if (!status.active) {
				code = candidate;
				break;
			}
		} catch (e) {
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
		const definition = DEFINITION_BY_TEMPLATE_ID[body.template];
		const contentPackIds = definition?.party?.contentPacks ?? [];
		if (contentPackIds.length > 0) {
			try {
				const packs = await Promise.all(
					contentPackIds.map((packId) =>
						loadContentPackFromDB(
							packId as ContentType,
							c.req.header("x-brand-id") ?? "slopbox",
							c.env.DB,
						),
					),
				);
				initBody.contentPack = packs.flat();
			} catch (err) {
				console.error(
					`[party/create] Failed to load content for ${body.template}:`,
					err,
				);
				return c.json(
					{
						error: "Content not available. Run importPacks and publish first.",
					},
					503,
				);
			}
		}
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

app.get("/api/games/:gameId/ws", async (c) => {
	const upgrade = c.req.header("Upgrade");
	if (!upgrade || upgrade.toLowerCase() !== "websocket") {
		return c.text("Expected websocket upgrade", 426);
	}

	const token = new URL(c.req.url).searchParams.get("token");
	if (!token) {
		return c.text("Authentication required", 401);
	}

	const gameId = c.req.param("gameId");
	if (!gameId) {
		return c.text("gameId is required", 400);
	}

	let userId: string;

	if (__DEV__ && token === "dev-token") {
		userId = "00000000-0000-0000-0000-000000000000";
	} else {
		if (!c.env.SUPABASE_URL || !c.env.SUPABASE_SERVICE_ROLE_KEY) {
			return c.text("Auth not configured", 500);
		}

		const supabase = createClient(
			c.env.SUPABASE_URL,
			c.env.SUPABASE_SERVICE_ROLE_KEY,
		);
		const {
			data: { user },
			error,
		} = await supabase.auth.getUser(token);
		if (error || !user) {
			return c.text("Invalid or expired token", 401);
		}
		userId = user.id;
	}

	const game = await c.env.DB.prepare(
		"SELECT id FROM games WHERE id = ? AND user_id = ?",
	)
		.bind(gameId, userId)
		.first<{ id: string }>();

	if (!game) {
		return c.text("Game not found or access denied", 404);
	}

	const doId = c.env.GAME_REPO.idFromName(gameId);
	const stub = c.env.GAME_REPO.get(doId);

	const newRequest = new Request(c.req.raw);
	newRequest.headers.set("X-Game-Id", gameId);

	return stub.fetch(newRequest);
});

app.get("/api/chat/stream", async (c) => {
	const token = new URL(c.req.url).searchParams.get("token");
	if (!token) {
		return c.text("Authentication required", 401);
	}

	const threadId = new URL(c.req.url).searchParams.get("threadId");
	if (!threadId) {
		return c.text("threadId query param is required", 400);
	}

	let userId: string;

	if (__DEV__ && token === "dev-token") {
		userId = "00000000-0000-0000-0000-000000000000";
	} else {
		if (!c.env.SUPABASE_URL || !c.env.SUPABASE_SERVICE_ROLE_KEY) {
			return c.text("Auth not configured", 500);
		}

		const supabase = createClient(
			c.env.SUPABASE_URL,
			c.env.SUPABASE_SERVICE_ROLE_KEY,
		);
		const {
			data: { user },
			error,
		} = await supabase.auth.getUser(token);
		if (error || !user) {
			return c.text("Invalid or expired token", 401);
		}

		userId = user.id;
	}

	const thread = await c.env.DB.prepare(
		"SELECT id, user_id, game_id FROM threads WHERE id = ? AND user_id = ?",
	)
		.bind(threadId, userId)
		.first<{ id: string; user_id: string; game_id: string | null }>();

	if (!thread) {
		return c.text("Thread not found", 404);
	}

	if (!thread.game_id) {
		return c.text("Thread has no associated game", 412);
	}

	const apiKey = c.env.OPENROUTER_API_KEY;
	if (!apiKey) {
		return c.text("AI provider not configured", 500);
	}

	const chatModel = resolveChatModel(c.env.AI_CHAT_MODEL ?? c.env.AI_MODEL);
	const model = createModel({ apiKey, model: chatModel.id });
	const walletService = new WalletService(c.env.DB);
	const gitService = new GitService(c.env.GAME_REPO);

	// Pre-flight balance check - require minimum balance to start generation
	const minBalanceMicros = USER_COSTS.GAME_GENERATION_BASE;
	const hasBalance = await walletService.hasSufficientBalance(
		userId,
		minBalanceMicros,
	);
	if (!hasBalance) {
		return c.text("Insufficient balance. Please add Sparks to continue.", 402);
	}

	const history = await c.env.DB.prepare(
		"SELECT * FROM messages WHERE thread_id = ? ORDER BY seq ASC",
	)
		.bind(threadId)
		.all<MessageRow>();

	let modelMessages = (history.results ?? [])
		.filter(
			(row) =>
				row.role === "user" || row.role === "assistant" || row.role === "tool",
		)
		.map(
			(row) =>
				({
					role: row.role,
					content: JSON.parse(row.content_json),
				}) as unknown as ModelMessage,
		);

	const lastUserRow = [...(history.results ?? [])]
		.reverse()
		.find((r) => r.role === "user");
	let designContext:
		| { selectedFrameId: string | null; selectedElementId: string | null }
		| undefined;
	if (lastUserRow?.metadata_json) {
		try {
			const meta = JSON.parse(lastUserRow.metadata_json) as Record<
				string,
				unknown
			>;
			if ("selectedFrameId" in meta || "selectedElementId" in meta) {
				designContext = {
					selectedFrameId:
						typeof meta.selectedFrameId === "string"
							? meta.selectedFrameId
							: null,
					selectedElementId:
						typeof meta.selectedElementId === "string"
							? meta.selectedElementId
							: null,
				};
			}
		} catch {
			// ignore malformed metadata
		}
	}

	if (modelMessages.length === 1) {
		const filenames = await gitService
			.listFiles(thread.game_id)
			.catch(() => [] as string[]);

		if (filenames.length > 0) {
			const decoder = new TextDecoder();
			const fileSections: string[] = [];
			for (const filename of filenames.sort()) {
				const bytes = await gitService.readFile(thread.game_id, filename);
				const content = bytes ? decoder.decode(bytes) : "(empty)";
				fileSections.push(`### ${filename}\n\`\`\`\n${content}\n\`\`\``);
			}

			const workspaceContextMessage: ModelMessage = {
				role: "user",
				content: [
					{
						type: "text",
						text: [
							"Here are the current workspace files for this game:",
							"",
							fileSections.join("\n\n"),
							"",
							"You don't need to read these files with tools. Use them as current context and proceed with the user's request.",
						].join("\n"),
					},
				],
			};

			modelMessages = [workspaceContextMessage, ...modelMessages];
		}
	}

	return handleChatStream(
		{
			db: c.env.DB,
			model,
			modelName: chatModel.id,
			userId,
			gameId: thread.game_id,
			walletService,
			gitService,
			env: c.env,
			designContext,
		},
		threadId,
		modelMessages,
		(p) => c.executionCtx.waitUntil(p),
	);
});

app.get("/assets/*", async (c) => {
	const key = c.req.path.replace("/assets/", "");
	if (!key) return c.text("Asset key required", 400);

	try {
		const object = await c.env.ASSETS.get(key);
		if (!object) return c.text("Asset not found", 404);

		const headers = new Headers();
		object.writeHttpMetadata(headers);
		headers.set("etag", object.httpEtag);
		headers.set("Cache-Control", "public, max-age=31536000, immutable");
		headers.set("Cross-Origin-Resource-Policy", "cross-origin");
		headers.set("Access-Control-Allow-Origin", "*");

		return new Response(object.body, { headers });
	} catch (e) {
		console.error("Asset fetch error:", e);
		return c.text("Internal Server Error", 500);
	}
});

app.route("/webhooks/revenuecat", revenuecatWebhookRouter);
app.route("/webhooks/stripe", stripeWebhookRouter);
app.route("/api/audio", audioRouter);
app.route("/api/text-grid", textGridRouter);

app.all("/mcp", async (c) => {
	return handleMcpRequest(c.req.raw, c.env);
});

app.use(
	"/trpc/*",
	trpcServer({
		router: appRouter,
		endpoint: "/trpc",
		createContext,
	}),
);

export default app;
export { RealtimeRelayDO, GameRepoDO, PartyRoomDO };
