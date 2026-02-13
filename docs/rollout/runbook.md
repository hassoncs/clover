# Post-Cutover Monitoring Runbook

## Overview
This runbook describes the steps to monitor the system after enabling the `useRemixDefault` feature flag.

## Monitoring Steps

### 1. Real-time Error Monitoring (Sentry)
- **Action**: Check Sentry "Issues" tab filtered by `remix` tag.
- **Frequency**: Every 30 minutes for the first 4 hours, then daily for 1 week.
- **Threshold**: Any new `TypeError` or `TRPCError` related to Remixes.

### 2. API Latency Check (Cloudflare)
- **Action**: Review Cloudflare Worker analytics for the `api` worker.
- **Frequency**: Daily.
- **Threshold**: P95 latency > 300ms for `remixes` routes.

### 3. Database Health (D1)
- **Action**: Run audit query to ensure no orphaned Remixes or broken references.
- **Query**:
  ```sql
  SELECT count(*) FROM assets WHERE content_hash IS NULL;
  ```
- **Frequency**: Weekly.

### 4. User Feedback Loop
- **Action**: Monitor internal feedback channels for reports of broken game saves or forks.
- **Frequency**: Ongoing.

## Incident Response

### Minor Issue (UI glitch, non-critical error)
1. Document the issue.
2. Create a fix and deploy via standard CI/CD.
3. Do NOT rollback unless the fix is delayed.

### Major Issue (Data loss, critical crash, API outage)
1. **IMMEDIATELY** disable `useRemixDefault` feature flag.
2. Verify system stability.
3. Perform root cause analysis (RCA).
4. Fix and re-verify in staging before re-enabling.
