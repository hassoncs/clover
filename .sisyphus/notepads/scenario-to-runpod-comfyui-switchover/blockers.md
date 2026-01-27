# Blockers

## Task 2: Deploy/validate RunPod serverless custom ComfyUI worker

**Status**: BLOCKED - Docker build issue + needs merge to main

### Completed
✅ GitHub secrets added: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`

### Blocked On
1. **Docker build platform issues** - The build fails on Apple Silicon due to platform compatibility with the base image (`runpod/worker-comfyui:5.7.1-base`)
2. **Workflow not on main branch** - The GitHub Actions workflow file is on `godot-spike` branch but needs to be on `main` to trigger

### What You Need To Do

**Option A: Merge and trigger via GitHub Actions (Recommended)**
```bash
# Merge the workflow to main
git checkout main
git merge godot-spike  # or cherry-pick c54d5b46
git push origin main

# Trigger the workflow
gh workflow run build-runpod-worker.yml
```

**Option B: Manual RunPod Console Setup**
1. Go to RunPod Console → Serverless
2. Create new endpoint with image: `hassoncs/slopcade-comfyui:latest` (after building)
3. Or use RunPod's pre-built ComfyUI template
4. Copy the endpoint ID to your `.hush` file as `RUNPOD_COMFYUI_ENDPOINT_ID`

### Files
- Dockerfile: `api/runpod-worker/Dockerfile`
- Workflow: `.github/workflows/build-runpod-worker.yml`
- Setup guide: `docs/plans/runpod-comfyui-setup-status.md`

**Reference**: See `docker-build-blocker.md` for detailed error information.
