import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';

export interface Env {
  // D1 Database (uncomment when created)
  // DB: D1Database;
  
  // R2 Storage (uncomment when created)
  // ASSETS: R2Bucket;
  
  // Supabase Auth
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY: string;
  
  // App URL for redirects
  APP_URL: string;
}

export interface User {
  id: string;
  email: string;
  displayName?: string;
}

export interface Context {
  env: Env;
  headers: Headers;
  user?: User | null;
  installId?: string;
}

export async function createContext(
  opts: FetchCreateContextFnOptions,
  env: Env
): Promise<Context> {
  const headers = opts.req.headers;
  const installId = headers.get('X-Install-Id') || undefined;
  
  return {
    env,
    headers,
    installId,
  };
}
