import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../index'
import { TRPCError } from '@trpc/server';

export const invitesRouter = router({
  /**
   * Create an invite for an email address
   * Protected - any authenticated user can invite others
   */
  create: protectedProcedure
    .input(z.object({
      email: z.string().email(),
    }))
    .mutation(async ({ ctx, input }) => {
      const now = Date.now();
      const normalizedEmail = input.email.toLowerCase();

      // Check if invite already exists
      const existing = await ctx.env.DB
        .prepare('SELECT id, status FROM email_invites WHERE invitee_email = ?')
        .bind(normalizedEmail)
        .first();

      if (existing) {
        if (existing.status === 'redeemed') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'This email has already been invited and redeemed',
          });
        }
        if (existing.status === 'revoked') {
          // Allow re-inviting a revoked email - update the existing row
          await ctx.env.DB
            .prepare(`
              UPDATE email_invites
              SET inviter_user_id = ?, status = 'pending', created_at = ?, updated_at = ?
              WHERE id = ?
            `)
            .bind(ctx.user.id, now, now, existing.id)
            .run();
          return { success: true, message: 'Invite re-sent successfully' };
        }
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'An invite for this email already exists',
        });
      }

      // Create new invite
      await ctx.env.DB
        .prepare(`
          INSERT INTO email_invites (invitee_email, inviter_user_id, status, created_at, updated_at)
          VALUES (?, ?, 'pending', ?, ?)
        `)
        .bind(normalizedEmail, ctx.user.id, now, now)
        .run();

      return { success: true, message: 'Invite created successfully' };
    }),

  /**
   * Check if an email has been invited
   * Public - used before login to check invitation status
   */
  isEmailInvited: publicProcedure
    .input(z.object({
      email: z.string().email(),
    }))
    .query(async ({ ctx, input }) => {
      const normalizedEmail = input.email.toLowerCase();

      const invite = await ctx.env.DB
        .prepare(`
          SELECT id, status, created_at
          FROM email_invites
          WHERE invitee_email = ? AND status != 'revoked'
        `)
        .bind(normalizedEmail)
        .first();

      if (!invite) {
        return { invited: false };
      }

      return {
        invited: true,
        status: invite.status,
        createdAt: invite.created_at,
      };
    }),

  /**
   * Redeem an invite when a user logs in
   * Protected - called during auth sync
   * Idempotent - safe to call multiple times
   */
  redeem: protectedProcedure.mutation(async ({ ctx }) => {
    const now = Date.now();

    // Find the invite for this user's email
    const invite = await ctx.env.DB
      .prepare('SELECT id, status FROM email_invites WHERE invitee_email = ?')
      .bind(ctx.user.email.toLowerCase())
      .first();

    if (!invite) {
      // No invite exists - this is fine, user can still use the app
      return { success: true, alreadyRedeemed: false, message: 'No invite found for this email' };
    }

    if (invite.status === 'redeemed') {
      // Already redeemed - idempotent response
      return { success: true, alreadyRedeemed: true, message: 'Invite already redeemed' };
    }

    if (invite.status === 'revoked') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'This invitation has been revoked',
      });
    }

    // Mark as redeemed
    await ctx.env.DB
      .prepare(`
        UPDATE email_invites
        SET status = 'redeemed', redeemed_user_id = ?, redeemed_at = ?, updated_at = ?
        WHERE id = ?
      `)
      .bind(ctx.user.id, now, now, invite.id)
      .run();

    return { success: true, alreadyRedeemed: false, message: 'Invite redeemed successfully' };
  }),
});
