# Multi-Brand Security Audit (Slopcade vs amen.games)

Date: 2026-02-16

## Scope

- tRPC context/auth brand resolution
- tRPC routes under `api/src/trpc/routes/`
- Stripe/RevenueCat webhook handlers
- Social service layer used by tRPC routes

## Findings Summary

### High severity issues found and fixed

1. Unvalidated `x-brand-id` header in tRPC context
- Risk: arbitrary brand values could influence auth credential selection and query scoping.
- Fix: header now validated with `isValidBrandId`; invalid/missing values fall back to `DEFAULT_BRAND_ID`.
- File: `api/src/trpc/context.ts`

2. Cross-brand game reads/writes in `games` and `chat-threads`
- Risk: endpoints selected/updated games by `id` without `brand_id`, enabling cross-brand reads/mutations when IDs are known.
- Fix: added `AND brand_id = ?` + `ctx.brandId` binding to all game ownership/public access/update/delete/publish/validate/fork/chat workspace checks.
- Files:
  - `api/src/trpc/routes/games.ts`
  - `api/src/trpc/routes/chat-threads.ts`
  - `api/src/trpc/routes/economy.ts` (estimate cost game lookup)

3. Social follow/bookmark/comment/reaction paths could traverse cross-brand relationships
- Risk: service-level queries on `follows`, `bookmarks`, and comment/reaction game counters did not consistently enforce brand scope.
- Fix:
  - Added brand-aware checks in social route handlers before follow/unfollow/reaction actions.
  - Added brand-aware query variants in follow/bookmark/comment services and wired route calls to pass `ctx.brandId`.
  - Added brand scoping to profile user lookup and feed-related follow/bookmark hydration.
- Files:
  - `api/src/trpc/routes/social.ts`
  - `api/src/trpc/routes/social-extra.ts`
  - `api/src/social/follow-service.ts`
  - `api/src/social/bookmark-service.ts`
  - `api/src/social/comment-service.ts`

4. Invite endpoints leaked cross-brand invite state by email
- Risk: invite existence/status checks used global email lookup and exposed state across brands.
- Fix:
  - Added brand-scoped invite lookup helper based on inviter/redeemer user brand.
  - Updated `create`, `isEmailInvited`, and `redeem` to use brand-scoped lookup.
  - Updated `users.syncFromAuth` invite enforcement to use brand-scoped invite selection.
- Files:
  - `api/src/trpc/routes/invites.ts`
  - `api/src/trpc/routes/users.ts`

5. Org Stripe webhook fallback path allowed unscoped org status update
- Risk: if metadata omitted `brandId`, org status update could run by `org_id` only.
- Fix: require `brandId` metadata, verify org exists in brand, and scope status updates with `brand_id`.
- File: `api/src/billing/org-webhook-handler.ts`

## Route Audit Result

- `games.ts`: fixed missing brand scope on id-based reads/updates/deletes.
- `social.ts`: fixed direct SQL lookups + service calls now brand-aware.
- `social-extra.ts`: fixed follower count and following feed subquery scoping.
- `users.ts`: fixed profile/update scoping and invite gating scoping.
- `admin-dashboard.ts`: already brand scoped (verified).
- `organizations.ts`: already brand scoped (verified).
- `billing.ts`: org membership/subscription paths brand scoped (verified).
- `invites.ts`: fixed by brand-scoped invite resolution.
- `notifications.ts`: user-owned only; no cross-brand list leakage found.
- `moderation.ts`: user-owned only; no cross-brand list leakage found.
- `chat-threads.ts`: fixed game ownership checks to include brand.
- `blob-assets.ts`: no list/browse query over tenant-owned relational rows in route; no direct cross-brand row disclosure found.
- `economy.ts`: fixed game lookup used by estimate path.
- `economy-graph.ts`: in-memory validation/simulation only.

## Webhook Audit Result

- `api/src/trpc/routes/billing.ts` (`stripeOrgWebhook`): signature validation and raw body handling verified.
- `api/src/billing/org-webhook-handler.ts`: fixed brand scoping gap on checkout completion org updates.
- `api/src/routes/webhooks/stripe.ts`: signature validation and idempotency present; processes subscription/user mappings without exposing cross-brand data through responses.
- `api/src/routes/webhooks/revenuecat.ts`: signature validation present; no cross-brand data returned in webhook responses.

## Residual Risk Notes

- `email_invites` table is globally unique on `invitee_email` and has no `brand_id` column.
- Without schema changes, full per-brand invite independence cannot be guaranteed at storage level.
- Endpoint behavior was adjusted to avoid cross-brand status leakage, but hard isolation for invites would require schema-level brand partitioning.

## Final Assessment

- Brand header validation: PASS
- Auth uses brand-specific Supabase credentials: PASS
- tRPC endpoints audited for cross-brand leaks: PASS after fixes
- Missing brand filters in audited paths: fixed
- Webhook cross-brand leakage controls: PASS after fixes
