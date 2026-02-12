import { trpcServer } from "@hono/trpc-server";
import { createClient } from "@supabase/supabase-js";
import type { ModelMessage } from "ai";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { ArtifactService } from "@/agent/artifact-service";
import { RealtimeRelayDO } from "@/agent/RealtimeRelayDO";
import { resolveChatModel } from "@/ai/chat-model-config";
import { createModel } from "@/ai/model-factory";
import type { MessageRow } from "@/chat/chat-handler";
import { handleChatStream } from "@/chat/stream-handler";
import { GameRepoDO } from "@/durable-objects/GameRepoDO";
import { WalletService } from "@/economy/wallet-service";
import textGridRouter from "@/routes/text-grid";
import revenuecatWebhookRouter from "@/routes/webhooks/revenuecat";
import { GitService } from "@/services/git/GitService";
import { createContext, type Env } from "@/trpc/context";
import { appRouter } from "@/trpc/router";

const app = new Hono<{ Bindings: Env }>();

const ALLOWED_ORIGINS = [
	"http://localhost:8081",
	"http://localhost:8085",
	"http://localhost:19006",
	"https://slopcade.app",
	"https://www.slopcade.app",
	"https://slopcade-api.hassoncs.workers.dev",
];

app.use(
	"*",
	cors({
		origin: (origin) => {
			if (!origin) return origin;
			if (ALLOWED_ORIGINS.includes(origin)) return origin;
			if (origin.endsWith(".slopcade.app")) return origin;
			return undefined;
		},
		credentials: true,
	}),
);

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
	const artifactService = new ArtifactService(c.env.ASSETS, c.env.DB);
	const walletService = new WalletService(c.env.DB);
	const gitService = c.env.GAME_REPO
		? new GitService(c.env.GAME_REPO)
		: undefined;

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

	if (modelMessages.length === 1) {
		const fileMetas = await artifactService.listWorkspaceFileMeta(
			thread.game_id,
		);
		const filenames = fileMetas
			.map((file) => file.filename)
			.sort((a, b) => a.localeCompare(b));

		if (filenames.length > 0) {
			const contentMap = await artifactService.readWorkspaceFiles(
				thread.game_id,
				filenames,
			);
			const fileSections = filenames.map((filename) => {
				const content = contentMap.get(filename) ?? "(empty)";
				return `### ${filename}\n\`\`\`\n${content}\n\`\`\``;
			});

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
			artifactService,
			walletService,
			gitService,
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
app.route("/api/text-grid", textGridRouter);

app.use(
	"/trpc/*",
	trpcServer({
		router: appRouter,
		endpoint: "/trpc",
		createContext,
	}),
);

export default app;
export { RealtimeRelayDO, GameRepoDO };
