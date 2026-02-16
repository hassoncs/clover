import { DEFAULT_BRAND_ID, isValidBrandId } from "@slopcade/brands";
import type { Context as HonoContext } from "hono";

type D1Database = import("@cloudflare/workers-types").D1Database;
type R2Bucket = import("@cloudflare/workers-types").R2Bucket;
type DurableObjectNamespace =
	import("@cloudflare/workers-types").DurableObjectNamespace;

export interface Env {
	DB: D1Database;
	ASSETS: R2Bucket;
	REALTIME_RELAY: DurableObjectNamespace;
	GAME_REPO: DurableObjectNamespace;
	PARTY_ROOM: DurableObjectNamespace;

	SUPABASE_URL: string;
	SUPABASE_SERVICE_ROLE_KEY: string;
	SUPABASE_ANON_KEY: string;

	// Brand: amen.games Supabase credentials
	AMEN_SUPABASE_URL?: string;
	AMEN_SUPABASE_SERVICE_ROLE_KEY?: string;
	AMEN_SUPABASE_ANON_KEY?: string;

	APP_URL: string;

	AI_PROVIDER?: string;
	OPENAI_API_KEY?: string;
	OPENROUTER_API_KEY?: string;
	ANTHROPIC_API_KEY?: string;
	AI_MODEL?: string;
	AI_BASE_URL?: string;

	THEME_PLANNER_ENABLED?: string;

	// Image generation provider selection
	IMAGE_GENERATION_PROVIDER?: "modal" | "scenario";

	// Modal ComfyUI endpoint (optional, defaults to deployed endpoint)
	MODAL_ENDPOINT?: string;

	// Scenario.com credentials (only needed if using scenario provider)
	SCENARIO_API_KEY?: string;
	SCENARIO_SECRET_API_KEY?: string;
	SCENARIO_API_URL?: string;

	ASSET_HOST?: string;

	DEBUG_ASSET_GENERATION?: string;

	REVENUECAT_WEBHOOK_SECRET?: string;

	STRIPE_SECRET_KEY?: string;
	STRIPE_WEBHOOK_SECRET?: string;
	STRIPE_PRICE_ID_PRO_MONTHLY?: string;
	STRIPE_PRICE_ID_AMEN_MONTHLY?: string;
	STRIPE_PRICE_ID_AMEN_YEARLY?: string;

	AI_EDITING_ENABLED?: string;
	AI_EDITING_ALLOWED_USERS?: string;
	AI_EDITING_MAX_CONCURRENT_RUNS?: string;
	AI_EDITING_MAX_RUNS_PER_DAY?: string;

	AI_CHAT_MODEL?: string;

	ELEVENLABS_API_KEY?: string;

	// Admin access control (comma-separated emails)
	ADMIN_EMAILS?: string;

	// Invite requirement enforcement
	REQUIRE_INVITE?: string;
}

export interface User {
	id: string;
	email: string;
	displayName?: string;
}

export interface Context {
	env: Env;
	authToken: string | null;
	brandId: string;
	req?: Request;
	rawBody?: string;
	[key: string]: unknown;
}

export interface AuthenticatedContext extends Context {
	user: User;
	[key: string]: unknown;
}

export async function createContext(
	opts: { req: Request; resHeaders: Headers },
	honoContext: HonoContext<{ Bindings: Env }>,
): Promise<Context> {
	const shouldCaptureRawBody = opts.req.url.includes(
		"/trpc/billing.stripeOrgWebhook",
	);
	const rawBody = shouldCaptureRawBody
		? await opts.req.clone().text()
		: undefined;
	const authHeader = honoContext.req.header("Authorization");
	const authToken = authHeader?.startsWith("Bearer ")
		? authHeader.slice(7)
		: null;

	const requestedBrandId =
		honoContext.req.header("x-brand-id") || DEFAULT_BRAND_ID;
	const brandId = isValidBrandId(requestedBrandId)
		? requestedBrandId
		: DEFAULT_BRAND_ID;

	return {
		env: honoContext.env,
		authToken,
		brandId,
		req: opts.req,
		rawBody,
	};
}
