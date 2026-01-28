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

  // Image generation provider selection
  // 'comfyui' = Modal ComfyUI serverless (DEFAULT)
  // 'modal' = Alias for 'comfyui'
  // 'scenario' = Scenario.com (DEPRECATED - maintained for backwards compatibility)
  IMAGE_GENERATION_PROVIDER?: 'scenario' | 'comfyui' | 'modal';

  // Modal ComfyUI endpoint (optional, defaults to deployed endpoint)
  MODAL_ENDPOINT?: string;

  // Scenario credentials (only needed if using deprecated 'scenario' provider)
  SCENARIO_API_KEY?: string;
  SCENARIO_SECRET_API_KEY?: string;
  SCENARIO_API_URL?: string;

  ASSET_HOST?: string;

  DEBUG_ASSET_GENERATION?: string;

  REVENUECAT_WEBHOOK_SECRET?: string;
}

export interface User {
  id: string;
  email: string;
  displayName?: string;
}

export interface Context {
  env: Env;
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
  const authHeader = honoContext.req.header("Authorization");
  const authToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  return {
    env: honoContext.env,
    authToken,
  };
}
