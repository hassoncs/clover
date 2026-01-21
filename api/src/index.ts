import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { trpcServer } from '@hono/trpc-server';
import { appRouter } from './trpc/router';
import { createContext, type Env } from './trpc/context';

const app = new Hono<{ Bindings: Env }>();

// CORS configuration
app.use('*', cors({
  origin: [
    'http://localhost:8081',
    'http://localhost:19006',
    // TODO: Add production URLs
    // 'https://app.clover.app',
  ],
  credentials: true,
}));

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }));

// tRPC handler
app.use(
  '/trpc/*',
  trpcServer({
    router: appRouter,
    endpoint: '/trpc',
    createContext,
  })
);

export default app;
