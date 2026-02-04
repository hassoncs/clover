import { Hono } from "hono";
import { cors } from "hono/cors";
import { trpcServer } from "@hono/trpc-server";
import { appRouter } from '@/trpc/router'
import { createContext, type Env } from '@/trpc/context'
import revenuecatWebhookRouter from '@/routes/webhooks/revenuecat'
import textGridRouter from '@/routes/text-grid'

const app = new Hono<{ Bindings: Env }>();

app.use(
  "*",
  cors({
    origin: (origin) => origin,
    credentials: true,
  }),
);

app.get("/health", (c) => c.json({ status: "ok", timestamp: Date.now() }));

app.get("/local-assets/*", async (c) => {
  const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  
  if (!isDev) {
    return c.text("Not available in production", 403);
  }

  const assetPath = c.req.path.replace("/local-assets/", "");
  if (!assetPath) return c.text("Asset path required", 400);

  try {
    const response = await fetch(`http://localhost:3847/assets/${assetPath}`);
    if (!response.ok) {
      return c.text(`Asset not found: ${assetPath}`, 404);
    }
    
    return new Response(response.body, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      },
    });
  } catch (e: any) {
    console.error("Local asset proxy error:", e);
    return c.text(`Failed to load asset: ${e.message}`, 500);
  }
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

app.get("/local-games/:gameId", async (c) => {
  const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  if (!isDev) {
    return c.text("Not available in production", 403);
  }

  const gameId = c.req.param('gameId');
  
  try {
    const response = await fetch(`http://localhost:3847/games/${gameId}`);
    if (!response.ok) {
      return c.text(`Game not found: ${gameId}`, 404);
    }
    
    const game = await response.json() as any;
    
    return c.json({
      id: gameId,
      title: game.title,
      description: game.description,
      definition: JSON.stringify(game.definition),
      source: 'template',
    });
  } catch (e: any) {
    console.error("Local game proxy error:", e);
    return c.text(`Failed to load game: ${e.message}`, 500);
  }
});

app.get("/local-games", async (c) => {
  const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  if (!isDev) {
    return c.text("Not available in production", 403);
  }

  try {
    const response = await fetch('http://localhost:3847/games');
    if (!response.ok) {
      return c.text('Failed to fetch games', 500);
    }
    
    const games = await response.json() as any[];
    
    const formattedGames = games.map((game: any) => ({
      id: game.id,
      title: game.title,
      description: game.description,
      source: 'template',
    }));
    
    return c.json({ games: formattedGames });
  } catch (e: any) {
    console.error("Local games list proxy error:", e);
    return c.text(`Failed to load games: ${e.message}`, 500);
  }
});

app.get("/local-packs/:packName", async (c) => {
  const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  if (!isDev) {
    return c.text("Not available in production", 403);
  }

  const packName = c.req.param('packName');
  
  try {
    const response = await fetch(`http://localhost:3847/packs/${packName}`);
    if (!response.ok) {
      return c.text(`Pack not found: ${packName}`, 404);
    }
    
    return c.json(await response.json());
  } catch (e: any) {
    console.error("Local pack proxy error:", e);
    return c.text(`Failed to load pack: ${e.message}`, 500);
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
