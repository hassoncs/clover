import { createClient } from "@supabase/supabase-js";
import { initTRPC, TRPCError } from "@trpc/server";
import type { AuthenticatedContext, Context, User } from "./context";

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const mergeRouters = t.mergeRouters;

// Public procedures - no auth required (for browsing/playing public games)
export const publicProcedure = t.procedure;

const DEV_USER: User = {
	id: "00000000-0000-0000-0000-000000000000",
	email: "dev@localhost",
	displayName: "Dev",
};

// Helper to validate and extract user from auth token
async function validateAuthToken(ctx: Context): Promise<User> {
	if (__DEV__ && ctx.authToken === "dev-token") {
		return DEV_USER;
	}

	if (!ctx.authToken) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Authentication required. Please sign in to continue.",
		});
	}

	if (!ctx.env.SUPABASE_URL || !ctx.env.SUPABASE_SERVICE_ROLE_KEY) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Supabase client not initialized - check credentials",
		});
	}

	const supabase = createClient(
		ctx.env.SUPABASE_URL,
		ctx.env.SUPABASE_SERVICE_ROLE_KEY,
	);

	const {
		data: { user: supabaseUser },
		error,
	} = await supabase.auth.getUser(ctx.authToken);

	if (error || !supabaseUser || !supabaseUser.email) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Invalid or expired session. Please sign in again.",
		});
	}

	return {
		id: supabaseUser.id,
		email: supabaseUser.email,
		displayName: supabaseUser.user_metadata?.full_name,
	};
}

// Protected procedure - requires valid Supabase JWT
// Use this for ALL mutations and user-specific queries
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
	// If user already validated (e.g., from middleware), skip re-validation
	if ((ctx as AuthenticatedContext).user) {
		return next({ ctx: ctx as AuthenticatedContext });
	}

	const user = await validateAuthToken(ctx);

	return next({
		ctx: { ...ctx, user } as AuthenticatedContext,
	});
});

// Admin procedure - requires valid auth AND admin email
export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
	let user: User;
	if ((ctx as AuthenticatedContext).user) {
		user = (ctx as AuthenticatedContext).user;
	} else {
		user = await validateAuthToken(ctx);
	}

	// Check admin status
	const adminEmails = ctx.env.ADMIN_EMAILS
		? ctx.env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase())
		: [];

	if (adminEmails.length === 0) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "No admin emails configured",
		});
	}

	if (!adminEmails.includes(user.email.toLowerCase())) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Admin access required",
		});
	}

	return next({
		ctx: { ...ctx, user } as AuthenticatedContext,
	});
});
