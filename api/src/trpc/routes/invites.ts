import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../index";

type D1Database = import("@cloudflare/workers-types").D1Database;

type InviteRow = {
	id: string;
	status: "pending" | "redeemed" | "revoked";
	created_at?: number;
};

async function getInviteForBrand(
	db: D1Database,
	inviteeEmail: string,
	brandId: string,
): Promise<InviteRow | null> {
	return db
		.prepare(`
      SELECT ei.id, ei.status, ei.created_at
      FROM email_invites ei
      LEFT JOIN users inviter ON inviter.id = ei.inviter_user_id
      LEFT JOIN users redeemed ON redeemed.id = ei.redeemed_user_id
      WHERE ei.invitee_email = ?
        AND (
          (ei.inviter_user_id IS NOT NULL AND inviter.brand_id = ?)
          OR (ei.redeemed_user_id IS NOT NULL AND redeemed.brand_id = ?)
        )
      ORDER BY ei.updated_at DESC
      LIMIT 1
    `)
		.bind(inviteeEmail, brandId, brandId)
		.first<InviteRow>();
}

export const invitesRouter = router({
	/**
	 * Create an invite for an email address
	 * Protected - any authenticated user can invite others
	 */
	create: protectedProcedure
		.input(
			z.object({
				email: z.string().email(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const now = Date.now();
			const normalizedEmail = input.email.toLowerCase();

			// Check if invite already exists
			const existing = await getInviteForBrand(
				ctx.env.DB,
				normalizedEmail,
				ctx.brandId,
			);

			if (existing) {
				if (existing.status === "redeemed") {
					throw new TRPCError({
						code: "CONFLICT",
						message: "This email has already been invited and redeemed",
					});
				}
				if (existing.status === "revoked") {
					// Allow re-inviting a revoked email - update the existing row
					await ctx.env.DB.prepare(`
              UPDATE email_invites
              SET inviter_user_id = ?, status = 'pending', created_at = ?, updated_at = ?
              WHERE id = ?
            `)
						.bind(ctx.user.id, now, now, existing.id)
						.run();
					return { success: true, message: "Invite re-sent successfully" };
				}
				throw new TRPCError({
					code: "CONFLICT",
					message: "An invite for this email already exists",
				});
			}

			// Create new invite
			try {
				await ctx.env.DB.prepare(`
            INSERT INTO email_invites (id, invitee_email, inviter_user_id, status, created_at, updated_at)
            VALUES (?, ?, ?, 'pending', ?, ?)
          `)
					.bind(crypto.randomUUID(), normalizedEmail, ctx.user.id, now, now)
					.run();
			} catch {
				return { success: true, message: "Invite request recorded" };
			}

			return { success: true, message: "Invite created successfully" };
		}),

	/**
	 * Check if an email has been invited
	 * Public - used before login to check invitation status
	 */
	isEmailInvited: publicProcedure
		.input(
			z.object({
				email: z.string().email(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const normalizedEmail = input.email.toLowerCase();

			const invite = await getInviteForBrand(
				ctx.env.DB,
				normalizedEmail,
				ctx.brandId,
			);

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
		const invite = await getInviteForBrand(
			ctx.env.DB,
			ctx.user.email.toLowerCase(),
			ctx.brandId,
		);

		if (!invite) {
			// No invite exists - this is fine, user can still use the app
			return {
				success: true,
				alreadyRedeemed: false,
				message: "No invite found for this email",
			};
		}

		if (invite.status === "redeemed") {
			// Already redeemed - idempotent response
			return {
				success: true,
				alreadyRedeemed: true,
				message: "Invite already redeemed",
			};
		}

		if (invite.status === "revoked") {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "This invitation has been revoked",
			});
		}

		// Mark as redeemed
		await ctx.env.DB.prepare(`
        UPDATE email_invites
        SET status = 'redeemed', redeemed_user_id = ?, redeemed_at = ?, updated_at = ?
        WHERE id = ?
      `)
			.bind(ctx.user.id, now, now, invite.id)
			.run();

		return {
			success: true,
			alreadyRedeemed: false,
			message: "Invite redeemed successfully",
		};
	}),
});
