# RunPod/ComfyUI Rollout Plan

## Overview

This document outlines the rollout strategy for switching from Scenario.com to RunPod serverless ComfyUI for image generation.

## Runtime Configuration

### Provider Selection

The system uses a single environment variable to control the provider:

```bash
IMAGE_GENERATION_PROVIDER=scenario  # Default, existing behavior
IMAGE_GENERATION_PROVIDER=comfyui   # RunPod serverless ComfyUI
IMAGE_GENERATION_PROVIDER=runpod    # Alias for comfyui
```

### Required Environment Variables

**For Scenario (default):**
- `SCENARIO_API_KEY`
- `SCENARIO_SECRET_API_KEY` (or `SCENARIO_API_SECRET`)

**For ComfyUI/RunPod:**
- `RUNPOD_API_KEY`
- `RUNPOD_COMFYUI_ENDPOINT_ID`

## Rollout Strategy

### Phase 1: Validation (Current)
- [x] Code changes complete
- [x] Provider adapter factory implemented
- [x] TRPC routes updated
- [x] CLI tools updated
- [ ] RunPod endpoint deployed
- [ ] End-to-end validation complete

### Phase 2: Canary Deployment
1. Deploy RunPod endpoint
2. Set `IMAGE_GENERATION_PROVIDER=comfyui` in staging environment
3. Run test asset generations
4. Monitor for errors

### Phase 3: Gradual Rollout
1. Enable ComfyUI for 10% of traffic (if possible via feature flags)
2. Monitor success rates and latency
3. Increase to 50% after validation
4. Full rollout to 100%

### Phase 4: Scenario Deprecation
1. Monitor ComfyUI stability for 1-2 weeks
2. Remove Scenario credential requirements from non-essential paths
3. Keep Scenario as fallback for emergency rollback
4. Eventually remove Scenario code (Task 12)

## Operational Notes

### Cold Start Behavior

**RunPod Serverless:**
- Cold start: 30-60 seconds (container startup + model loading)
- Warm invocation: 2-5 seconds
- Recommendation: Set `minWorkers: 1` in RunPod endpoint config to reduce cold starts

**Comparison:**
- Scenario: ~2-5 seconds (always warm)
- RunPod (cold): ~30-60 seconds
- RunPod (warm): ~2-5 seconds

### Expected Performance

| Metric | Scenario | RunPod (warm) | RunPod (cold) |
|--------|----------|---------------|---------------|
| p50 latency | 3s | 3s | 45s |
| p95 latency | 8s | 6s | 90s |
| p99 latency | 15s | 10s | 120s |
| Error rate | <1% | <2% | N/A |

### Known Failure Modes

1. **Cold Start Timeout**
   - Symptom: Request times out after 60s
   - Mitigation: Increase timeout or set minWorkers: 1

2. **Model Not Found**
   - Symptom: "flux1-dev-fp8.safetensors not found"
   - Mitigation: Verify Dockerfile built correctly with model downloads

3. **Rate Limiting**
   - Symptom: 429 errors from RunPod
   - Mitigation: Implement client-side rate limiting or upgrade RunPod plan

4. **Out of Memory**
   - Symptom: Generation fails with OOM error
   - Mitigation: Use GPU with more VRAM (L40/A100 instead of A10)

## Rollback Procedure

Rollback is instant and requires no code changes:

```bash
# From ComfyUI back to Scenario
IMAGE_GENERATION_PROVIDER=scenario
```

No restart required - the next request will use the new provider.

### Emergency Rollback Checklist

- [ ] Set `IMAGE_GENERATION_PROVIDER=scenario`
- [ ] Verify Scenario credentials are still configured
- [ ] Monitor error rates
- [ ] Investigate ComfyUI failure root cause

## Monitoring

### Key Metrics to Track

1. **Success rate** - Should be >98%
2. **Latency** - p95 should be <10s (warm)
3. **Cold start frequency** - Should decrease over time
4. **Cost per generation** - Compare Scenario vs RunPod

### Alerting

Set up alerts for:
- Success rate drops below 95%
- p95 latency exceeds 15s
- Error rate exceeds 5%

## Cost Analysis

### Scenario.com
- ~$0.05-0.10 per image (depending on model)
- No cold start costs
- Predictable pricing

### RunPod Serverless
- ~$0.001-0.003 per image (compute only)
- Cold start: ~$0.01-0.02 per cold start
- Storage: Minimal for models
- **Estimated savings: 70-80%**

## Configuration Examples

### Local Development

```bash
# .hush (local)
IMAGE_GENERATION_PROVIDER=comfyui
RUNPOD_API_KEY=your-key
RUNPOD_COMFYUI_ENDPOINT_ID=your-endpoint-id
```

### Production (Wrangler)

```bash
# Set secret
wrangler secret put RUNPOD_API_KEY --env production

# Set variable
wrangler vars put IMAGE_GENERATION_PROVIDER --env production
```

## Testing Checklist

Before full rollout:

- [ ] txt2img generation works
- [ ] img2img generation works
- [ ] Background removal works (if using)
- [ ] R2 upload works
- [ ] Error handling works
- [ ] Rollback tested

## Post-Rollout

### Week 1
- Monitor metrics daily
- Address any issues immediately
- Document any unexpected behavior

### Week 2-4
- Monitor metrics weekly
- Optimize endpoint configuration
- Plan Scenario deprecation

### Month 2+
- Remove Scenario dependency (Task 12)
- Celebrate cost savings!
