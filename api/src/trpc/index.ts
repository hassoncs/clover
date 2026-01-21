import { initTRPC, TRPCError } from '@trpc/server';
import { createClient } from '@supabase/supabase-js';
import type { Context, AuthenticatedContext, User } from './context';

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// Requires X-Install-Id header (for anonymous tracking)
export const installedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.installId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'X-Install-Id header is required',
    });
  }
  return next({ ctx: { ...ctx, installId: ctx.installId } });
});

// Requires valid Supabase JWT
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if ((ctx as any).user) {
    return next({ ctx: ctx as AuthenticatedContext });
  }

  if (!ctx.authToken) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }

  const supabase = createClient(
    ctx.env.SUPABASE_URL,
    ctx.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const {
    data: { user: supabaseUser },
    error,
  } = await supabase.auth.getUser(ctx.authToken);

  if (error || !supabaseUser || !supabaseUser.email) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid token' });
  }

  // TODO: Sync user to D1 database when DB is configured
  const user: User = {
    id: supabaseUser.id,
    email: supabaseUser.email,
    displayName: supabaseUser.user_metadata?.full_name,
  };

  return next({
    ctx: { ...ctx, user } as AuthenticatedContext,
  });
});
