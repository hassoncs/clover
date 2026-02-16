import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../index";

const orgRoleSchema = z.enum(["admin", "leader", "member"]);

const createOrgInputSchema = z.object({
	name: z.string().min(1).max(120),
	slug: z.string().min(1).max(80).optional(),
	sizeTier: z.enum(["small", "medium", "large", "mega"]).default("small"),
	reportedAttendance: z.number().int().min(0).nullable().optional(),
	joinLinkEnabled: z.boolean().default(true),
	denomination: z.string().max(120).nullable().optional(),
	city: z.string().max(120).nullable().optional(),
	state: z.string().max(120).nullable().optional(),
});

const updateOrgInputSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1).max(120).optional(),
	slug: z.string().min(1).max(80).optional(),
	sizeTier: z.enum(["small", "medium", "large", "mega"]).optional(),
	reportedAttendance: z.number().int().min(0).nullable().optional(),
	joinLinkEnabled: z.boolean().optional(),
	denomination: z.string().max(120).nullable().optional(),
	city: z.string().max(120).nullable().optional(),
	state: z.string().max(120).nullable().optional(),
});

interface OrganizationRow {
	id: string;
	brand_id: string;
	name: string;
	slug: string;
	admin_user_id: string;
	size_tier: "small" | "medium" | "large" | "mega";
	reported_attendance: number | null;
	join_code: string | null;
	join_link_enabled: number;
	denomination: string | null;
	city: string | null;
	state: string | null;
	status: "active" | "trial" | "suspended" | "cancelled";
	trial_ends_at: number | null;
	created_at: number;
	updated_at: number;
}

interface OrganizationMembershipRow {
	org_id: string;
	user_id: string;
	role: "admin" | "leader" | "member";
	joined_at: number;
	invited_by: string | null;
}

interface OrganizationWithMembershipRow extends OrganizationRow {
	member_role: "admin" | "leader" | "member";
	member_joined_at: number;
}

function toClientOrganization(row: OrganizationRow) {
	return {
		id: row.id,
		brandId: row.brand_id,
		name: row.name,
		slug: row.slug,
		adminUserId: row.admin_user_id,
		sizeTier: row.size_tier,
		reportedAttendance: row.reported_attendance,
		joinCode: row.join_code,
		joinLinkEnabled: row.join_link_enabled === 1,
		denomination: row.denomination,
		city: row.city,
		state: row.state,
		status: row.status,
		trialEndsAt: row.trial_ends_at,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function slugify(value: string): string {
	const normalized = value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 80);

	return normalized.length > 0 ? normalized : "organization";
}

function generateJoinCode(): string {
	return Array.from(crypto.getRandomValues(new Uint8Array(6)))
		.map((b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32])
		.join("");
}

async function generateUniqueJoinCode(db: D1Database): Promise<string> {
	for (let i = 0; i < 25; i += 1) {
		const joinCode = generateJoinCode();
		const existing = await db
			.prepare(`SELECT id FROM organizations WHERE join_code = ?`)
			.bind(joinCode)
			.first<{ id: string }>();
		if (!existing) {
			return joinCode;
		}
	}

	throw new TRPCError({
		code: "INTERNAL_SERVER_ERROR",
		message: "Failed to generate unique join code",
	});
}

async function ensureUniqueSlug(
	db: D1Database,
	brandId: string,
	baseSlug: string,
	excludeOrgId?: string,
): Promise<string> {
	for (let i = 0; i < 50; i += 1) {
		const candidate = i === 0 ? baseSlug : `${baseSlug}-${i + 1}`;
		const query = excludeOrgId
			? `SELECT id FROM organizations WHERE brand_id = ? AND slug = ? AND id != ?`
			: `SELECT id FROM organizations WHERE brand_id = ? AND slug = ?`;
		const bindings = excludeOrgId
			? [brandId, candidate, excludeOrgId]
			: [brandId, candidate];

		const existing = await db
			.prepare(query)
			.bind(...bindings)
			.first<{ id: string }>();

		if (!existing) {
			return candidate;
		}
	}

	throw new TRPCError({
		code: "BAD_REQUEST",
		message: "Unable to generate unique slug for organization",
	});
}

async function getOrgById(
	db: D1Database,
	orgId: string,
	brandId: string,
): Promise<OrganizationRow | null> {
	return db
		.prepare(`SELECT * FROM organizations WHERE id = ? AND brand_id = ?`)
		.bind(orgId, brandId)
		.first<OrganizationRow>();
}

async function requireOrgMembership(
	db: D1Database,
	orgId: string,
	brandId: string,
	userId: string,
): Promise<{ org: OrganizationRow; membership: OrganizationMembershipRow }> {
	const membership = await db
		.prepare(
			`SELECT om.org_id, om.user_id, om.role, om.joined_at, om.invited_by
			 FROM organization_members om
			 INNER JOIN organizations o ON o.id = om.org_id
			 WHERE om.org_id = ? AND om.user_id = ? AND o.brand_id = ?`,
		)
		.bind(orgId, userId, brandId)
		.first<OrganizationMembershipRow>();

	if (!membership) {
		const org = await getOrgById(db, orgId, brandId);
		if (!org) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Organization not found",
			});
		}
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "You must be a member of this organization",
		});
	}

	const org = await getOrgById(db, orgId, brandId);
	if (!org) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Organization not found",
		});
	}

	return { org, membership };
}

async function countAdminMembers(
	db: D1Database,
	orgId: string,
): Promise<number> {
	const result = await db
		.prepare(
			`SELECT COUNT(*) as count FROM organization_members WHERE org_id = ? AND role = 'admin'`,
		)
		.bind(orgId)
		.first<{ count: number | string }>();

	return Number(result?.count ?? 0);
}

type D1Database = import("@cloudflare/workers-types").D1Database;

export const organizationsRouter = router({
	create: protectedProcedure
		.input(createOrgInputSchema)
		.mutation(async ({ ctx, input }) => {
			const now = Date.now();
			const orgId = crypto.randomUUID();
			const baseSlug = slugify(input.slug ?? input.name);
			const slug = await ensureUniqueSlug(ctx.env.DB, ctx.brandId, baseSlug);
			const joinCode = await generateUniqueJoinCode(ctx.env.DB);

			await ctx.env.DB.batch([
				ctx.env.DB.prepare(
					`INSERT INTO organizations (
							id, brand_id, name, slug, admin_user_id, size_tier,
							reported_attendance, join_code, join_link_enabled,
							denomination, city, state, status,
							created_at, updated_at
						) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
				).bind(
					orgId,
					ctx.brandId,
					input.name,
					slug,
					ctx.user.id,
					input.sizeTier,
					input.reportedAttendance ?? null,
					joinCode,
					input.joinLinkEnabled ? 1 : 0,
					input.denomination ?? null,
					input.city ?? null,
					input.state ?? null,
					now,
					now,
				),
				ctx.env.DB.prepare(
					`INSERT INTO organization_members (org_id, user_id, role, joined_at, invited_by)
						 VALUES (?, ?, 'admin', ?, ?)`,
				).bind(orgId, ctx.user.id, now, ctx.user.id),
			]);

			const created = await getOrgById(ctx.env.DB, orgId, ctx.brandId);
			if (!created) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to create organization",
				});
			}

			return {
				...toClientOrganization(created),
				memberRole: "admin" as const,
			};
		}),

	get: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const { org, membership } = await requireOrgMembership(
				ctx.env.DB,
				input.id,
				ctx.brandId,
				ctx.user.id,
			);

			return {
				...toClientOrganization(org),
				memberRole: membership.role,
				memberJoinedAt: membership.joined_at,
			};
		}),

	getBySlug: protectedProcedure
		.input(z.object({ slug: z.string() }))
		.query(async ({ ctx, input }) => {
			const org = await ctx.env.DB.prepare(
				`SELECT * FROM organizations WHERE slug = ? AND brand_id = ?`,
			)
				.bind(input.slug, ctx.brandId)
				.first<OrganizationRow>();

			if (!org) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Organization not found",
				});
			}

			const membership = await ctx.env.DB.prepare(
				`SELECT role FROM organization_members WHERE org_id = ? AND user_id = ?`,
			)
				.bind(org.id, ctx.user.id)
				.first<{ role: "admin" | "leader" | "member" }>();

			return {
				...toClientOrganization(org),
				memberRole: membership?.role ?? null,
			};
		}),

	update: protectedProcedure
		.input(updateOrgInputSchema)
		.mutation(async ({ ctx, input }) => {
			const { org, membership } = await requireOrgMembership(
				ctx.env.DB,
				input.id,
				ctx.brandId,
				ctx.user.id,
			);

			if (membership.role !== "admin") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only organization admins can update organization settings",
				});
			}

			const updates: string[] = [];
			const values: (string | number | null)[] = [];

			if (input.name !== undefined) {
				updates.push("name = ?");
				values.push(input.name);
			}

			if (input.slug !== undefined) {
				const normalizedSlug = slugify(input.slug);
				const uniqueSlug = await ensureUniqueSlug(
					ctx.env.DB,
					ctx.brandId,
					normalizedSlug,
					org.id,
				);
				updates.push("slug = ?");
				values.push(uniqueSlug);
			}

			if (input.sizeTier !== undefined) {
				updates.push("size_tier = ?");
				values.push(input.sizeTier);
			}

			if (input.reportedAttendance !== undefined) {
				updates.push("reported_attendance = ?");
				values.push(input.reportedAttendance);
			}

			if (input.joinLinkEnabled !== undefined) {
				updates.push("join_link_enabled = ?");
				values.push(input.joinLinkEnabled ? 1 : 0);
			}

			if (input.denomination !== undefined) {
				updates.push("denomination = ?");
				values.push(input.denomination);
			}

			if (input.city !== undefined) {
				updates.push("city = ?");
				values.push(input.city);
			}

			if (input.state !== undefined) {
				updates.push("state = ?");
				values.push(input.state);
			}

			if (updates.length === 0) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "No fields to update",
				});
			}

			const now = Date.now();
			updates.push("updated_at = ?");
			values.push(now);
			values.push(org.id);
			values.push(ctx.brandId);

			await ctx.env.DB.prepare(
				`UPDATE organizations SET ${updates.join(", ")} WHERE id = ? AND brand_id = ?`,
			)
				.bind(...values)
				.run();

			const updated = await getOrgById(ctx.env.DB, org.id, ctx.brandId);
			if (!updated) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to update organization",
				});
			}

			return {
				...toClientOrganization(updated),
				memberRole: membership.role,
			};
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const { org, membership } = await requireOrgMembership(
				ctx.env.DB,
				input.id,
				ctx.brandId,
				ctx.user.id,
			);

			if (membership.role !== "admin") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only organization admins can delete organizations",
				});
			}

			await ctx.env.DB.prepare(
				`UPDATE organizations SET status = 'cancelled', join_link_enabled = 0, updated_at = ? WHERE id = ? AND brand_id = ?`,
			)
				.bind(Date.now(), org.id, ctx.brandId)
				.run();

			return { success: true };
		}),

	listMyOrgs: protectedProcedure.query(async ({ ctx }) => {
		const result = await ctx.env.DB.prepare(
			`SELECT
					o.*,
					om.role AS member_role,
					om.joined_at AS member_joined_at
				 FROM organization_members om
				 INNER JOIN organizations o ON o.id = om.org_id
				 WHERE om.user_id = ?
				 AND o.brand_id = ?
				 ORDER BY o.updated_at DESC`,
		)
			.bind(ctx.user.id, ctx.brandId)
			.all<OrganizationWithMembershipRow>();

		return result.results.map((row) => ({
			...toClientOrganization(row),
			memberRole: row.member_role,
			memberJoinedAt: row.member_joined_at,
		}));
	}),

	join: protectedProcedure
		.input(
			z.object({
				joinCode: z
					.string()
					.trim()
					.toUpperCase()
					.regex(/^[A-Z0-9]{6}$/),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const org = await ctx.env.DB.prepare(
				`SELECT * FROM organizations
					 WHERE join_code = ?
					 AND brand_id = ?
					 AND join_link_enabled = 1
					 AND status IN ('active', 'trial')`,
			)
				.bind(input.joinCode, ctx.brandId)
				.first<OrganizationRow>();

			if (!org) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Invalid or expired join code",
				});
			}

			const existingMembership = await ctx.env.DB.prepare(
				`SELECT org_id FROM organization_members WHERE org_id = ? AND user_id = ?`,
			)
				.bind(org.id, ctx.user.id)
				.first<{ org_id: string }>();

			if (existingMembership) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "You are already a member of this organization",
				});
			}

			await ctx.env.DB.prepare(
				`INSERT INTO organization_members (org_id, user_id, role, joined_at, invited_by)
					 VALUES (?, ?, 'member', ?, NULL)`,
			)
				.bind(org.id, ctx.user.id, Date.now())
				.run();

			return {
				organization: toClientOrganization(org),
				memberRole: "member" as const,
			};
		}),

	joinBySlug: protectedProcedure
		.input(z.object({ slug: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const org = await ctx.env.DB.prepare(
				`SELECT * FROM organizations
					 WHERE slug = ?
					 AND brand_id = ?
					 AND join_link_enabled = 1
					 AND status IN ('active', 'trial')`,
			)
				.bind(input.slug, ctx.brandId)
				.first<OrganizationRow>();

			if (!org) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Organization not found or join link disabled",
				});
			}

			const existingMembership = await ctx.env.DB.prepare(
				`SELECT org_id FROM organization_members WHERE org_id = ? AND user_id = ?`,
			)
				.bind(org.id, ctx.user.id)
				.first<{ org_id: string }>();

			if (existingMembership) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "You are already a member of this organization",
				});
			}

			await ctx.env.DB.prepare(
				`INSERT INTO organization_members (org_id, user_id, role, joined_at, invited_by)
					 VALUES (?, ?, 'member', ?, NULL)`,
			)
				.bind(org.id, ctx.user.id, Date.now())
				.run();

			return {
				organization: toClientOrganization(org),
				memberRole: "member" as const,
			};
		}),

	leave: protectedProcedure
		.input(z.object({ orgId: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const { org, membership } = await requireOrgMembership(
				ctx.env.DB,
				input.orgId,
				ctx.brandId,
				ctx.user.id,
			);

			if (membership.role === "admin") {
				const adminCount = await countAdminMembers(ctx.env.DB, org.id);
				if (adminCount <= 1) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Sole admin cannot leave organization",
					});
				}
			}

			const statements = [
				ctx.env.DB.prepare(
					`DELETE FROM organization_members WHERE org_id = ? AND user_id = ?`,
				).bind(org.id, ctx.user.id),
			] as D1PreparedStatement[];

			if (org.admin_user_id === ctx.user.id) {
				const nextAdmin = await ctx.env.DB.prepare(
					`SELECT user_id FROM organization_members WHERE org_id = ? AND role = 'admin' AND user_id != ? ORDER BY joined_at ASC LIMIT 1`,
				)
					.bind(org.id, ctx.user.id)
					.first<{ user_id: string }>();

				if (nextAdmin) {
					statements.push(
						ctx.env.DB.prepare(
							`UPDATE organizations SET admin_user_id = ?, updated_at = ? WHERE id = ? AND brand_id = ?`,
						).bind(nextAdmin.user_id, Date.now(), org.id, ctx.brandId),
					);
				}
			}

			await ctx.env.DB.batch(statements);

			return { success: true };
		}),

	getMembers: protectedProcedure
		.input(z.object({ orgId: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			await requireOrgMembership(
				ctx.env.DB,
				input.orgId,
				ctx.brandId,
				ctx.user.id,
			);

			const result = await ctx.env.DB.prepare(
				`SELECT
						om.user_id,
						om.role,
						om.joined_at,
						om.invited_by,
						u.email,
						u.display_name
					 FROM organization_members om
					 INNER JOIN organizations o ON o.id = om.org_id
					 LEFT JOIN users u ON u.id = om.user_id
					 WHERE om.org_id = ? AND o.brand_id = ?
					 ORDER BY
						CASE om.role
							WHEN 'admin' THEN 1
							WHEN 'leader' THEN 2
							ELSE 3
						END,
						om.joined_at ASC`,
			)
				.bind(input.orgId, ctx.brandId)
				.all<{
					user_id: string;
					role: "admin" | "leader" | "member";
					joined_at: number;
					invited_by: string | null;
					email: string | null;
					display_name: string | null;
				}>();

			return result.results.map((member) => ({
				userId: member.user_id,
				role: member.role,
				joinedAt: member.joined_at,
				invitedBy: member.invited_by,
				email: member.email,
				displayName: member.display_name,
			}));
		}),

	removeMember: protectedProcedure
		.input(
			z.object({
				orgId: z.string().uuid(),
				userId: z.string().uuid(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { org, membership: actorMembership } = await requireOrgMembership(
				ctx.env.DB,
				input.orgId,
				ctx.brandId,
				ctx.user.id,
			);

			if (actorMembership.role === "member") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only admins or leaders can remove members",
				});
			}

			if (input.userId === ctx.user.id) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Use leave endpoint to remove yourself",
				});
			}

			const targetMembership = await ctx.env.DB.prepare(
				`SELECT org_id, user_id, role, joined_at, invited_by FROM organization_members WHERE org_id = ? AND user_id = ?`,
			)
				.bind(org.id, input.userId)
				.first<OrganizationMembershipRow>();

			if (!targetMembership) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
			}

			if (
				actorMembership.role === "leader" &&
				targetMembership.role !== "member"
			) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Leaders can only remove members",
				});
			}

			if (targetMembership.role === "admin") {
				const adminCount = await countAdminMembers(ctx.env.DB, org.id);
				if (adminCount <= 1) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Cannot remove the sole admin",
					});
				}
			}

			const statements = [
				ctx.env.DB.prepare(
					`DELETE FROM organization_members WHERE org_id = ? AND user_id = ?`,
				).bind(org.id, input.userId),
			] as D1PreparedStatement[];

			if (
				org.admin_user_id === input.userId &&
				targetMembership.role === "admin"
			) {
				const nextAdmin = await ctx.env.DB.prepare(
					`SELECT user_id FROM organization_members WHERE org_id = ? AND role = 'admin' AND user_id != ? ORDER BY joined_at ASC LIMIT 1`,
				)
					.bind(org.id, input.userId)
					.first<{ user_id: string }>();

				if (nextAdmin) {
					statements.push(
						ctx.env.DB.prepare(
							`UPDATE organizations SET admin_user_id = ?, updated_at = ? WHERE id = ? AND brand_id = ?`,
						).bind(nextAdmin.user_id, Date.now(), org.id, ctx.brandId),
					);
				}
			}

			await ctx.env.DB.batch(statements);

			return { success: true };
		}),

	updateMemberRole: protectedProcedure
		.input(
			z.object({
				orgId: z.string().uuid(),
				userId: z.string().uuid(),
				role: orgRoleSchema,
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { org, membership: actorMembership } = await requireOrgMembership(
				ctx.env.DB,
				input.orgId,
				ctx.brandId,
				ctx.user.id,
			);

			if (actorMembership.role !== "admin") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only admins can update member roles",
				});
			}

			const targetMembership = await ctx.env.DB.prepare(
				`SELECT org_id, user_id, role, joined_at, invited_by FROM organization_members WHERE org_id = ? AND user_id = ?`,
			)
				.bind(org.id, input.userId)
				.first<OrganizationMembershipRow>();

			if (!targetMembership) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
			}

			if (targetMembership.role === input.role) {
				return {
					success: true,
					userId: input.userId,
					role: input.role,
				};
			}

			if (targetMembership.role === "admin" && input.role !== "admin") {
				const adminCount = await countAdminMembers(ctx.env.DB, org.id);
				if (adminCount <= 1) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Cannot demote the sole admin",
					});
				}
			}

			await ctx.env.DB.prepare(
				`UPDATE organization_members SET role = ? WHERE org_id = ? AND user_id = ?`,
			)
				.bind(input.role, org.id, input.userId)
				.run();

			if (org.admin_user_id === input.userId && input.role !== "admin") {
				const replacementAdminId =
					input.userId !== ctx.user.id
						? ctx.user.id
						: (
								await ctx.env.DB.prepare(
									`SELECT user_id FROM organization_members WHERE org_id = ? AND role = 'admin' AND user_id != ? ORDER BY joined_at ASC LIMIT 1`,
								)
									.bind(org.id, input.userId)
									.first<{ user_id: string }>()
							)?.user_id;

				if (!replacementAdminId) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Organization must have at least one admin",
					});
				}

				await ctx.env.DB.prepare(
					`UPDATE organizations SET admin_user_id = ?, updated_at = ? WHERE id = ? AND brand_id = ?`,
				)
					.bind(replacementAdminId, Date.now(), org.id, ctx.brandId)
					.run();
			}

			return {
				success: true,
				userId: input.userId,
				role: input.role,
			};
		}),

	regenerateJoinCode: protectedProcedure
		.input(z.object({ orgId: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const { org, membership } = await requireOrgMembership(
				ctx.env.DB,
				input.orgId,
				ctx.brandId,
				ctx.user.id,
			);

			if (membership.role !== "admin") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only admins can regenerate join codes",
				});
			}

			const joinCode = await generateUniqueJoinCode(ctx.env.DB);
			const now = Date.now();

			await ctx.env.DB.prepare(
				`UPDATE organizations SET join_code = ?, updated_at = ? WHERE id = ? AND brand_id = ?`,
			)
				.bind(joinCode, now, org.id, ctx.brandId)
				.run();

			return {
				orgId: org.id,
				joinCode,
				updatedAt: now,
			};
		}),
});

type D1PreparedStatement =
	import("@cloudflare/workers-types").D1PreparedStatement;
