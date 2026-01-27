# Scenario.com → RunPod ComfyUI Rollout Plan

> **Plan Version**: 1.0  
> **Created**: 2026-01-27  
> **Status**: Ready for Execution

---

## Quick Switch Commands

### Switch to ComfyUI (Production)
```bash
# Set the provider flag
wrangler secret put IMAGE_GENERATION_PROVIDER
# When prompted, enter: comfyui
```

### Rollback to Scenario.com (Instant)
```bash
# Set the provider flag back to scenario
wrangler secret put IMAGE_GENERATION_PROVIDER
# When prompted, enter: scenario
```

### Verify Current Provider
```bash
# Check deployed secrets
npx wrangler secret list | grep IMAGE_GENERATION
```

---

## Runtime Configuration

### Single Switch
The entire system is controlled by one environment variable:

| Variable | Values | Effect |
|----------|--------|--------|
| `IMAGE_GENERATION_PROVIDER` | `scenario` | Legacy Scenario.com API |
| | `comfyui` | Direct ComfyUI endpoint |
| | `runpod` | RunPod serverless (recommended) |

### Required Credentials by Provider

```bash
# Scenario (legacy)
SCENARIO_API_KEY=...
SCENARIO_SECRET_API_KEY=...

# RunPod Serverless (recommended)
RUNPOD_API_KEY=...
RUNPOD_COMFYUI_ENDPOINT_ID=...

# Direct ComfyUI (optional)
COMFYUI_ENDPOINT=https://your-comfyui.com/api
```

---

## Operational Notes

### Cold Start Behavior

| Provider | Cold Start | Notes |
|----------|------------|-------|
| Scenario.com | ~2-5s | Always-on infrastructure |
| ComfyUI (direct) | ~10-30s | Depends on server state |
| RunPod Serverless | **30-120s** | True serverless, workers spin up on demand |

**Mitigation for RunPod cold starts**:
- Set `Min Workers = 1` for production (~$16-28/day) to eliminate cold starts
- Set `Min Workers = 0` for cost savings (cold starts on first request)
- Idle timeout of 30s balances responsiveness vs cost

### Expected Performance (p95)

| Operation | Scenario.com | RunPod (L40) | Notes |
|-----------|--------------|--------------|-------|
| txt2img | ~15-30s | ~20-40s | Includes queue time |
| img2img | ~20-40s | ~25-45s | Includes queue time |
| bg removal | ~5-10s | ~10-20s | Lightweight operation |
| Full pipeline | ~60-90s | ~70-120s | All stages combined |

### Known Failure Modes

| Error | Cause | Mitigation |
|-------|-------|------------|
| `Model not found` | Model files missing on worker | Verify Dockerfile includes all models |
| `Out of memory` | GPU VRAM exhausted | Reduce batch size, use FP8 models |
| `Connection timeout` | Worker cold start | Increase idle timeout, use warm workers |
| `Rate limited` | Too many concurrent requests | Implement request queuing |
| `Invalid API key` | Wrong/missing credentials | Verify env vars are set correctly |

---

## Rollback Procedure

### Instant Rollback (Recommended)
The system is designed for instant rollback by changing one environment variable:

```bash
# 1. Set provider back to scenario
wrangler secret put IMAGE_GENERATION_PROVIDER
# Enter: scenario

# 2. Verify rollback (no redeployment needed - reads env at request time)
curl https://your-api.workers.dev/health
```

**Rollback is instant** because:
- All providers are compiled into the worker
- Provider selection happens at runtime via `ctx.env.IMAGE_GENERATION_PROVIDER`
- No code changes or redeployment required

### Graceful Degradation
If RunPod endpoint is down but credentials are set:
```bash
# Temporarily switch to Scenario while debugging
wrangler secret put IMAGE_GENERATION_PROVIDER
# Enter: scenario
```

---

## Monitoring Checklist

### Pre-Switch
- [ ] RunPod endpoint returns successful responses (`/health`)
- [ ] Test scripts pass with `IMAGE_GENERATION_PROVIDER=comfyui`
- [ ] All pipeline tests pass (`pnpm test:run`)
- [ ] Type check passes (`pnpm type-check`)

### Post-Switch
- [ ] Monitor `/health` endpoint for errors
- [ ] Check Cloudflare Workers logs for failures
- [ ] Verify generated assets load correctly
- [ ] Monitor RunPod console for queue times

### Alerts to Watch
- `5xx` errors on asset generation endpoints
- Unusually high latency (>120s per generation)
- High error rate (>10%) on generation requests
- RunPod endpoint health check failures

---

## Rollout Timeline

### Phase 1: Dry Run (Optional)
```bash
# Set local environment
IMAGE_GENERATION_PROVIDER=comfyui
pnpm hush run -- npx tsx api/scripts/generate-game-assets.ts <test-game-id>
```

### Phase 2: Shadow Mode (Optional)
Deploy with `IMAGE_GENERATION_PROVIDER=comfyui` but don't advertise.
Monitor logs for issues before switching traffic.

### Phase 3: Full Switch
```bash
# Production switch
wrangler secret put IMAGE_GENERATION_PROVIDER
# Enter: comfyui
```

### Phase 4: Verify
- [ ] Generate 10+ assets across different types
- [ ] Verify R2 URLs resolve correctly
- [ ] Check generated asset quality

### Phase 5: Monitor (24-48 hours)
- Watch for error spikes
- Collect latency metrics
- Gather user feedback if applicable

---

## Rollback Triggers (When to Switch Back)

**Immediate rollback if**:
- Error rate exceeds 10%
- p95 latency exceeds 3 minutes
- Assets fail to generate 3 times in a row
- RunPod endpoint goes down

**Graceful rollback if**:
- Quality complaints from users
- Unexpected asset formats
- Missing features compared to Scenario.com

---

## Post-Migration (After 1-2 Weeks)

### Cleanup Tasks
1. Remove Scenario.com credential requirements from documentation
2. Archive Scenario.com client code (keep for reference)
3. Update `.hush.template` to remove Scenario keys
4. Deprecate Scenario.com-specific CLI options

### Success Metrics
- [ ] Cost reduction achieved (target: 50-90% savings)
- [ ] Latency comparable or better than Scenario.com
- [ ] Asset quality meets user expectations
- [ ] No critical errors in production logs

---

## Quick Reference

### Local Development
```bash
# Set provider in .hush
IMAGE_GENERATION_PROVIDER=comfyui
RUNPOD_API_KEY=...
RUNPOD_COMFYUI_ENDPOINT_ID=...

# Run test
pnpm hush run -- npx tsx api/scripts/test-comfyui-api.ts "A knight" txt2img
```

### Production Deployment
```bash
# Set secrets
wrangler secret put IMAGE_GENERATION_PROVIDER
wrangler secret put RUNPOD_API_KEY
wrangler secret put RUNPOD_COMFYUI_ENDPOINT_ID

# Deploy
pnpm deploy:api
```

### Verification Commands
```bash
# Test provider selection
curl https://api.workers.dev/health | jq '.provider'

# Test generation
pnpm hush run -- npx tsx api/scripts/test-comfyui-api.ts "Test" txt2img
```

---

## Support Contacts

- **RunPod Support**: https://docs.runpod.io/
- **Cloudflare Workers**: https://developers.cloudflare.com/workers/
- **ComfyUI Discord**: https://discord.gg/comfyui

---

_Last Updated: 2026-01-27_
