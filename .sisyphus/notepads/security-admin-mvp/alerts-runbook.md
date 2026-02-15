# Cloudflare Alerts & Runbook Learnings

## Successful Approaches
- Defined alerts based on Cloudflare's native notification system (HTTP Error Rate, Traffic Anomaly, Usage Based Billing).
- Created a structured incident runbook with clear 30-minute triage steps.
- Identified key rollback levers in Cloudflare (Wrangler rollback, WAF rules for traffic shedding).

## Patterns & Conventions
- Alerts should have clear severity levels (P1, P2, P3) and notification channels.
- Runbooks should be actionable and time-bound (e.g., "First 30 Minutes").

## Gotchas
- Traffic Anomaly alerts are particularly useful for detecting generation spikes that might not be errors but could be costly.
- Billing alerts are essential for usage-based services like Workers, D1, and R2.
