import { Hono } from "hono";
import { cors } from "hono/cors";
import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "./trpc/router";
import { createContext, type Env } from "./trpc/context";
import revenuecatWebhookRouter from "./routes/webhooks/revenuecat";

const app = new Hono<{ Bindings: Env }>();

app.use(
  "*",
  cors({
    origin: (origin) => origin,
    credentials: true,
  }),
);

app.get("/health", (c) => c.json({ status: "ok", timestamp: Date.now() }));

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
    
    return new Response(object.body, { headers });
  } catch (e) {
    console.error("Asset fetch error:", e);
    return c.text("Internal Server Error", 500);
  }
});

app.route("/webhooks/revenuecat", revenuecatWebhookRouter);

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    endpoint: "/trpc",
    createContext,
  }),
);

export default app;
