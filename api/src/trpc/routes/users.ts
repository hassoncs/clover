import { z } from 'zod';
import {
  router,
  publicProcedure,
  protectedProcedure,
} from '../index'

export const usersRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    return {
      id: ctx.user.id,
      email: ctx.user.email,
      displayName: ctx.user.displayName,
    };
  }),

  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const result = await ctx.env.DB.prepare(
      `SELECT id, email, display_name, avatar_url, bio, created_at FROM users WHERE id = ?`
    )
      .bind(ctx.user.id)
      .first<{
        id: string;
        email: string;
        display_name: string | null;
        avatar_url: string | null;
        bio: string | null;
        created_at: number;
      }>();

    if (!result) {
      return {
        id: ctx.user.id,
        email: ctx.user.email,
        displayName: ctx.user.displayName ?? null,
        avatarUrl: null,
        bio: null,
        createdAt: Date.now(),
      };
    }

    return {
      id: result.id,
      email: result.email,
      displayName: result.display_name,
      avatarUrl: result.avatar_url,
      bio: result.bio,
      createdAt: result.created_at,
    };
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        displayName: z.string().max(50).optional(),
        bio: z.string().max(160).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const now = Date.now();
      const sets: string[] = [];
      const values: (string | number)[] = [];

      if (input.displayName !== undefined) {
        sets.push('display_name = ?');
        values.push(input.displayName);
      }

      if (input.bio !== undefined) {
        sets.push('bio = ?');
        values.push(input.bio);
      }

      if (sets.length === 0) {
        return { updated: true };
      }

      sets.push('updated_at = ?');
      values.push(now);
      values.push(ctx.user.id);

      await ctx.env.DB.prepare(
        `UPDATE users SET ${sets.join(', ')} WHERE id = ?`
      )
        .bind(...values)
        .run();

      return { updated: true };
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
