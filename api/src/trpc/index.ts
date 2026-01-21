import { initTRPC, TRPCError } from '@trpc/server';
import { createClient } from '@supabase/supabase-js';
import superjson from 'superjson';
import type { Context, User } from './context';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Requires X-Install-Id header (for anonymous tracking)
export const installedProcedure = publicProcedure.use(async ({ ctx, next }) => {
  if (!ctx.installId) {
    throw new TRPCError({ 
      code: 'BAD_REQUEST', 
      message: 'X-Install-Id header is required' 
    });
  }
  return next({ ctx });
});

// Requires valid Supabase JWT
export const protectedProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const token = ctx.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Missing auth token' });
  }
  
  const supabase = createClient(
    ctx.env.SUPABASE_URL,
    ctx.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);
  
  if (error || !supabaseUser) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid auth token' });
  }
  
  // TODO: Sync user to D1 database when DB is configured
  const user: User = {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    displayName: supabaseUser.user_metadata?.full_name,
  };
  
  return next({ ctx: { ...ctx, user } });
});
