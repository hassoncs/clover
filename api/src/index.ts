import { Hono } from "hono";
import { cors } from "hono/cors";
import { trpcServer } from "@hono/trpc-server";
import { createClient } from '@supabase/supabase-js';
import { appRouter } from '@/trpc/router'
import { createContext, type Env } from '@/trpc/context'
import revenuecatWebhookRouter from '@/routes/webhooks/revenuecat'
import textGridRouter from '@/routes/text-grid'
import { RunCoordinatorDO } from '@/agent/RunCoordinatorDO'
import { RunStepWorkerDO } from '@/agent/RunStepWorkerDO'
import { RealtimeRelayDO } from '@/agent/RealtimeRelayDO'

const app = new Hono<{ Bindings: Env }>();

const ALLOWED_ORIGINS = [
  'http://localhost:8081',
  'http://localhost:8085',
  'http://localhost:19006',
  'https://slopcade.app',
  'https://www.slopcade.app',
  'https://slopcade-api.hassoncs.workers.dev',
];

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return origin;
      if (ALLOWED_ORIGINS.includes(origin)) return origin;
      if (origin.endsWith('.slopcade.app')) return origin;
      return undefined;
    },
    credentials: true,
  }),
);

app.get("/health", (c) => c.json({ status: "ok", timestamp: Date.now() }));

app.get('/ws/agent-run/:runId', async (c) => {
  const runId = c.req.param('runId');
  const upgrade = c.req.header('Upgrade');
  if (!upgrade || upgrade.toLowerCase() !== 'websocket') {
    return c.text('Expected websocket upgrade', 426);
  }

  const token = new URL(c.req.url).searchParams.get('token');
  if (!token) {
    return c.text('Authentication required', 401);
  }

  if (!c.env.SUPABASE_URL || !c.env.SUPABASE_SERVICE_ROLE_KEY) {
    return c.text('Auth not configured', 500);
  }

  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return c.text('Invalid or expired token', 401);
  }

  const run = await c.env.DB
    .prepare('SELECT user_id FROM agent_runs WHERE id = ?')
    .bind(runId)
    .first<{ user_id: string }>();
  if (!run || run.user_id !== user.id) {
    return c.text('Access denied', 403);
  }

  const id = c.env.RUN_COORDINATOR.idFromName(runId);
  const stub = c.env.RUN_COORDINATOR.get(id);
  return stub.fetch(c.req.raw);
});

app.get('/ws/speech-to-text', async (c) => {
  const upgrade = c.req.header('Upgrade');
  if (!upgrade || upgrade.toLowerCase() !== 'websocket') {
    return c.text('Expected websocket upgrade', 426);
  }

  const token = new URL(c.req.url).searchParams.get('token');
  if (!token) {
    return c.text('Authentication required', 401);
  }

  if (!c.env.SUPABASE_URL || !c.env.SUPABASE_SERVICE_ROLE_KEY) {
    return c.text('Auth not configured', 500);
  }

  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return c.text('Invalid or expired token', 401);
  }

  const id = c.env.REALTIME_RELAY.idFromName(user.id + '-' + Date.now());
  const stub = c.env.REALTIME_RELAY.get(id);
  return stub.fetch(c.req.raw);
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
export { RunCoordinatorDO, RunStepWorkerDO, RealtimeRelayDO };
