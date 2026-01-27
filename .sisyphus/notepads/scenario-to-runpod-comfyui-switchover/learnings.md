## Rollout Plan (Task 10) - 2026-01-27

### Created Documents
- `docs/plans/runpod-comfyui-rollout-plan.md` - Comprehensive rollout and rollback documentation

### Key Rollout Components

#### Single Switch Architecture
- **Environment Variable**: `IMAGE_GENERATION_PROVIDER`
- **Values**: `scenario` | `comfyui` | `runpod`
- **Behavior**: Instant toggle at runtime (no redeployment needed)

#### Cold Start Characteristics
| Provider | Cold Start | Recommended Setting |
|----------|------------|---------------------|
| Scenario.com | ~2-5s | Always-on |
| RunPod Serverless | 30-120s | Min Workers = 0 (cost), 1 (performance) |
| Direct ComfyUI | 10-30s | Depends on hosting |

#### Expected Performance (p95)
- txt2img: 20-40s (RunPod)
- img2img: 25-45s (RunPod)
- bg removal: 10-20s (RunPod)
- Full pipeline: 70-120s (RunPod)

#### Rollback Procedure
```bash
# Instant rollback via env var
wrangler secret put IMAGE_GENERATION_PROVIDER
# Enter: scenario
```

Rollback is instant because:
1. All providers are compiled into the worker
2. Provider selection happens at runtime via `ctx.env`
3. No code changes required

### Known Failure Modes
1. **Model not found** - Model files missing on worker
2. **Out of memory** - GPU VRAM exhausted
3. **Connection timeout** - Worker cold start
4. **Rate limited** - Too many concurrent requests
5. **Invalid API key** - Wrong/missing credentials

### Rollout Timeline
1. Dry Run (local)
2. Shadow Mode (monitor logs)
3. Full Switch (production)
4. Verify (10+ assets)
5. Monitor (24-48 hours)

### Success Metrics
- Error rate < 10%
- p95 latency < 120s
- Cost reduction: 50-90% vs Scenario.com
