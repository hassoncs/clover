# Incident Runbook: Security & Operational Anomalies

This runbook provides the first 30-minute triage steps and mitigation strategies for security incidents or operational catastrophes.

## 1. Alert Thresholds

| Alert Type | Threshold | Severity |
|------------|-----------|----------|
| API Error Spike | >5% errors / 5 min | High |
| Generation Spike | >100 gens / 1 min | Critical |
| Billing Anomaly | >10x normal spend | Critical |
| Unauthorized Admin | Any `admin.*` by non-admin | Critical |

## 2. First 30-Minute Triage

### Step 1: Verification (0-5 mins)
- Check the `#alerts` channel for the specific alert.
- Open **Cloudflare Workers Metrics** to confirm the spike.
- Run `wrangler tail` to see real-time logs and identify the erroring/abusive endpoint.

### Step 2: Identification (5-15 mins)
- **Identify the source**: Is it a single IP? A single User ID? A specific API key?
- **Identify the impact**: Is the database down? Are AI credits being drained? Is the site inaccessible?
- **Check Audit Logs**: Run `SELECT * FROM audit_events ORDER BY created_at DESC LIMIT 50;` in the D1 console to see recent admin actions.

### Step 3: Mitigation (15-30 mins)
- **If IP Abuse**: Add the IP to **Cloudflare WAF** > **Tools** > **IP Access Rules** (Block).
- **If User Abuse**: Disable the user in **Supabase Auth** or set `is_banned = 1` in the `users` table.
- **If Runaway Generation**:
    - Rotate/Revoke the `SCENARIO_API_KEY` or `ELEVENLABS_API_KEY` using `hush`.
    - Deploy a "Maintenance Mode" by setting `REQUIRE_INVITE = "true"` or a custom `MAINTENANCE_MODE` flag in `wrangler.toml`.
- **If Critical Failure**: Roll back the last Worker deployment via the Cloudflare Dashboard > **Workers** > **Deployments**.

## 3. Rollback Levers

- **Maintenance Mode**: Set `REQUIRE_INVITE = "true"` in `wrangler.toml` and redeploy to block new users.
- **Kill Switch**: Disable the Worker entirely in the Cloudflare Dashboard (last resort).
- **API Key Rotation**:
    ```bash
    # Example: Rotate Scenario key
    hush set SCENARIO_API_KEY "new_key"
    ```
- **WAF Block**: Use Cloudflare WAF to block specific countries or IP ranges if the attack is distributed.

## 4. Escalation Contacts

- **Primary Responder**: Admin (@admin)
- **Secondary**: Infrastructure Lead
- **External**: Cloudflare Support (if platform issue)

## 5. Communication Templates

### Internal (Slack/Discord)
> **Incident Started**: [Alert Name] triggered at [Time].
> **Status**: Investigating / Mitigating.
> **Impact**: [e.g., API 500s, High AI Spend].
> **Action**: [e.g., Blocking IP 1.2.3.4].

### External (Status Page / Twitter)
> We are currently investigating reports of API instability. Our team is working to resolve the issue as quickly as possible. Thank you for your patience.

## 6. Post-Mortem Requirement

Every "Critical" incident requires a post-mortem document in `.sisyphus/notepads/incidents/YYYY-MM-DD-incident-name.md` within 48 hours.
