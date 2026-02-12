# Remix Rollout Checklists

## Rollout Checklist

### Pre-Cutover (Staging/Dev)
- [ ] Verify migration script `migrate-packs-to-remixes.ts` runs without errors.
- [ ] Verify 100% data integrity (Packs -> Remixes mapping).
- [ ] Verify Remix API endpoints (`/remixes/*`) are functional.
- [ ] Verify UI components correctly display Remixes.
- [ ] Verify `useRemixDefault` feature flag toggles behavior correctly in local environment.

### Production Cutover
- [ ] Run migration script on production database (Cloudflare D1).
- [ ] Verify production data integrity.
- [ ] Enable `useRemixDefault` feature flag for internal users/canary group.
- [ ] Monitor error rates and API latency.
- [ ] Enable `useRemixDefault` feature flag for 100% of users.

### Post-Cutover
- [ ] Verify user adoption of Remix features.
- [ ] Monitor Sentry for any new Remix-related errors.
- [ ] Confirm legacy "Packs" UI is still accessible but marked as deprecated.

## Rollback Checklist

### Trigger Conditions
- [ ] Critical regression in game loading or creation.
- [ ] Data corruption detected in Remixes table.
- [ ] API latency increases by >50% for core flows.

### Rollback Steps
- [ ] Disable `useRemixDefault` feature flag (set to `false`).
- [ ] Verify system reverts to legacy "Packs" behavior.
- [ ] Investigate root cause in staging.
- [ ] If data corruption occurred, restore `remixes` table from backup (if necessary, though legacy `packs` table remains intact).

### Communication
- [ ] Notify engineering team of rollback.
- [ ] Update status page if user-facing impact occurred.
