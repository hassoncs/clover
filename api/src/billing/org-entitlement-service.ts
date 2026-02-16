type D1Database = import("@cloudflare/workers-types").D1Database;

export interface OrgEntitlement {
	hasOrgEntitlement: boolean;
	orgId: string | null;
	orgName: string | null;
	orgRole: string | null;
}

export class OrgEntitlementService {
	constructor(
		private db: D1Database,
		private brandId: string,
	) {}

	async resolveOrgEntitlement(userId: string): Promise<OrgEntitlement> {
		const membership = await this.db
			.prepare(
				`SELECT
					om.org_id,
					o.name AS org_name,
					om.role AS org_role
				 FROM organization_members om
				 INNER JOIN organizations o ON o.id = om.org_id
				 INNER JOIN org_subscriptions os ON os.org_id = o.id
				 WHERE om.user_id = ?
				 AND o.brand_id = ?
				 AND os.status IN ('active', 'trialing')
				 ORDER BY os.updated_at DESC
				 LIMIT 1`,
			)
			.bind(userId, this.brandId)
			.first<{
				org_id: string;
				org_name: string;
				org_role: string;
			}>();

		if (!membership) {
			return {
				hasOrgEntitlement: false,
				orgId: null,
				orgName: null,
				orgRole: null,
			};
		}

		return {
			hasOrgEntitlement: true,
			orgId: membership.org_id,
			orgName: membership.org_name,
			orgRole: membership.org_role,
		};
	}
}
