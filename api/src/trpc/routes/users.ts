import {
  router,
  protectedProcedure,
} from '../index';

export const usersRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    return {
      id: ctx.user.id,
      email: ctx.user.email,
      displayName: ctx.user.displayName,
    };
  }),

  syncFromAuth: protectedProcedure.mutation(async ({ ctx }) => {
    const now = Date.now();

    await ctx.env.DB.prepare(
      `INSERT INTO users (id, email, display_name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         email = excluded.email,
         display_name = excluded.display_name,
         updated_at = excluded.updated_at`
    )
      .bind(
        ctx.user.id,
        ctx.user.email,
        ctx.user.displayName ?? null,
        now,
        now
      )
      .run();

    return { synced: true };
  }),
});
