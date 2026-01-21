import type { Context as HonoContext } from "hono";

type D1Database = import("@cloudflare/workers-types").D1Database;
type R2Bucket = import("@cloudflare/workers-types").R2Bucket;

export interface Env {
  DB: D1Database;
  ASSETS: R2Bucket;

  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY: string;

  APP_URL: string;

  AI_PROVIDER?: string;
  OPENAI_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  AI_MODEL?: string;
  AI_BASE_URL?: string;

  SCENARIO_API_KEY?: string;
  SCENARIO_SECRET_API_KEY?: string;
  SCENARIO_API_URL?: string;
}

export interface User {
  id: string;
  email: string;
  displayName?: string;
}

export interface Context {
  env: Env;
  installId: string | null;
  authToken: string | null;
  [key: string]: unknown;
}

export interface AuthenticatedContext extends Context {
  user: User;
  [key: string]: unknown;
}

export async function createContext(
  _opts: { req: Request; resHeaders: Headers },
  honoContext: HonoContext<{ Bindings: Env }>
): Promise<Context> {
  const installId = honoContext.req.header("X-Install-Id") ?? null;
  const authHeader = honoContext.req.header("Authorization");
  const authToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  return {
    env: honoContext.env,
    installId,
    authToken,
  };
}
