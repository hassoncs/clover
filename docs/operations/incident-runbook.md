# Incident Runbook: Slopcade API

This runbook provides the first 30-minute triage steps and escalation procedures for API incidents.

## Triage: First 30 Minutes

### 1. Verify the Alert (0-5 mins)
- Check the alert source (Cloudflare, Supabase, etc.).
- Confirm if the issue is ongoing by checking the **Cloudflare Workers Metrics** dashboard.
- Check for any scheduled maintenance or recent deployments (`git log`).

### 2. Assess Impact (5-15 mins)
- **Scope**: Is it affecting all users or a specific subset?
- **Severity**: Is the API completely down (5xx) or just slow?
- **Cost**: Is there a billing spike associated with the traffic?
- **Security**: Is this a potential DDoS or abuse of generation endpoints?

### 3. Immediate Mitigation (15-30 mins)
- **Rollback**: If a recent deployment caused the issue, rollback immediately.
  - `wrangler rollback` (if using Cloudflare versioning) or redeploy previous stable commit.
- **Rate Limiting**: If traffic is excessive, enable/tighten Cloudflare Rate Limiting rules.
  - Go to **Security** > **WAF** > **Rate Limiting Rules**.
  - Enable "Emergency Block" for suspicious IPs.
- **Feature Flag**: If a specific feature (e.g., AI generation) is failing, disable it via environment variables if possible.
  - Update `wrangler.toml` or Cloudflare Dashboard variables.

## Escalation Contacts

| Role | Name | Contact |
| --- | --- | --- |
| Primary Responder | [Name] | [Email/Phone] |
| Secondary Responder | [Name] | [Email/Phone] |
| Infrastructure/Cloudflare | Cloudflare Support | [Link] |
| AI Services (Scenario/ElevenLabs) | Support | [Link] |

## Rollback Levers

### Cloudflare Worker Rollback
If using Cloudflare's deployment system:
1. Go to **Workers & Pages** > **slopcade-api** > **Deployments**.
2. Select the previous successful deployment.
3. Click **Rollback to this version**.

### Emergency Traffic Shedding
1. Go to **Security** > **WAF** > **Custom Rules**.
2. Create a rule to block traffic to `/api/generate` or other high-cost endpoints.
3. Set action to **Block** or **Managed Challenge**.

### Database (D1) Recovery
If data corruption is suspected:
1. Check D1 backups in the Cloudflare Dashboard.
2. Restore to the latest point-in-time backup if necessary.

## Post-Incident Review (PIR) Template

Every P1/P2 incident requires a PIR within 48 hours.

- **Summary**: What happened?
- **Timeline**: When did it start, when was it detected, when was it resolved?
- **Root Cause**: Why did it happen?
- **Impact**: How many users were affected? What was the cost?
- **Action Items**: What will we do to prevent this from happening again?
- **Detection**: Did our alerts fire? If not, why?
