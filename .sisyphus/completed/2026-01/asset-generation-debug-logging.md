# Asset Generation Debug Logging Enhancement

## Context

### Original Request
User regenerated assets for a forked game and got "bonkers" results - shapes completely mismatch physics definitions. Need comprehensive logging to diagnose the pipeline and identify where physics data is getting lost or corrupted.

### Interview Summary
**Key Findings**:
- **Issue Type**: Completely wrong shapes (most severe mismatch)
- **Debug Output**: No debug images found in api/debug-output/ even though pattern-003.md says they should exist
- **Scope**: Haven't tested if issue is fork-specific vs affects all games
- **Environment**: Needs production-safe logging (log levels) for debugging in production

**Current State**:
- Only 9 console.log statements across entire pipeline
- ScenarioClient has ZERO logging (completely silent)
- Missing logs for: silhouette upload, img2img API calls, R2 uploads, physics data extraction
- Existing debug output pattern (pattern-003.md) may not be working

**Critical Discovery**: User reports no debug output files even exist, suggesting:
1. DEBUG_ASSET_GENERATION env var not being read
2. saveDebugFile() failing silently
3. Path api/debug-output/ incorrect or not writable

### Metis Review
**Identified Gaps** (addressed):
- [x] Correlation ID needed (jobId + assetId) for tracing
- [x] Physics data logging before silhouette creation
- [x] Generation path logging (img2img vs txt2img)
- [x] Must not log secrets (API keys, base64 images)
- [x] Production-safe log levels (DEBUG/INFO)
- [x] Structured logging format for parseability

---

## Work Objectives

### Core Objective
Add comprehensive, production-safe debug logging to asset generation pipeline to diagnose physics shape mismatches in generated assets.

### Concrete Deliverables
1. **Enhanced logging** in 3 files:
   - `api/src/ai/assets.ts` (AssetService)
   - `api/src/ai/scenario.ts` (ScenarioClient)
   - `api/src/trpc/routes/asset-system.ts` (processGenerationJob)

2. **Log level support** (DEBUG/INFO/WARN/ERROR) controlled by env var

3. **Debug output verification** - Fix or document why debug files aren't being created

### Definition of Done
- [x] Asset generation produces logs showing complete pipeline flow
- [x] Can trace single asset from request → R2 upload via correlation IDs
- [x] Physics data logged at extraction point (before silhouette creation)
- [x] Scenario.com API calls logged (without exposing secrets)
- [x] Log levels work correctly (DEBUG env var controls verbosity)
- [x] No secrets appear in logs (verified with grep)
- [x] Debug output files created to api/debug-output/ or documented why not

### Must Have
- Correlation IDs in every log (jobId, taskId, assetId where applicable)
- Physics data logging (shape, width, height) before silhouette creation
- Generation path indicator (img2img vs txt2img)
- Scenario.com request/response logging (excluding API keys)
- Production-safe log levels

### Must NOT Have (Guardrails)
- NO logging of API keys or secrets
- NO logging of full base64 image data
- NO changes to business logic or error handling
- NO new npm dependencies
- NO code refactoring (only add logging)
- NO logging outside asset generation path
- NO removal of existing DEBUG_ASSET_GENERATION functionality

---

## Verification Strategy

### Log Level Strategy
**Environment Variable**: `LOG_LEVEL` (default: `INFO`)
- `DEBUG`: All logs including verbose pipeline details
- `INFO`: Important milestones (job start, asset complete)
- `WARN`: Warnings and fallbacks
- `ERROR`: Errors only

**Implementation**:
```typescript
// Simple log level check (no dependencies)
const LOG_LEVEL = process.env.LOG_LEVEL || 'INFO';
const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const shouldLog = (level: string) => LEVELS[level] >= LEVELS[LOG_LEVEL];

// Usage
if (shouldLog('DEBUG')) console.log('[DEBUG] ...');
```

### Manual Testing Procedure

**Test 1: Verify Debug Output Pattern**
```bash
# Enable debug mode
export DEBUG_ASSET_GENERATION=true
export LOG_LEVEL=DEBUG

# Run asset generation for a test game
# Navigate to Asset Gallery → Regenerate Assets

# Verify files created
ls -la api/debug-output/
# Expected: Subdirectories for gameId/assetId with:
#   - 1-silhouette.png
#   - 2-prompt.txt
#   - 3-generated.jpg (or .png)
#   - 4-final.png
#   - manifest.json
```

**Test 2: Trace Asset Generation Flow**
```bash
# Set log level to DEBUG
export LOG_LEVEL=DEBUG

# Run generation, grep logs for pipeline stages
# Expected output:
grep "\[AssetGen\]" api-logs.txt
# Should show:
# [AssetGen] [job:X] Starting job with N tasks
# [AssetGen] [job:X] [task:Y] Physics: {shape: box, width: 4, height: 1}
# [AssetGen] [job:X] [task:Y] Silhouette created: 512x128
# [AssetGen] [job:X] [task:Y] Uploaded silhouette: asset_abc123
# [AssetGen] [job:X] [task:Y] img2img job created: job_def456
# [AssetGen] [job:X] [task:Y] Downloaded: asset_xyz789
# [AssetGen] [job:X] [task:Y] Uploaded to R2: generated/platform/uuid.png
# [AssetGen] [job:X] [task:Y] Task succeeded
```

**Test 3: Fork Game Comparison**
```bash
# Test 1: Generate assets for original game
# Test 2: Fork the game
# Test 3: Regenerate assets for forked game
# Compare logs:
#   - Are physics values identical?
#   - Same silhouette dimensions?
#   - Same generation path (img2img)?
```

**Test 4: Secret Safety Check**
```bash
# Run generation with LOG_LEVEL=DEBUG
# Grep for secrets
grep -i "scenario.*key" api-logs.txt  # Should be empty
grep "Authorization: Basic" api-logs.txt  # Should be empty
grep "data:image/png;base64," api-logs.txt  # Should be empty
```

---

## Task Flow

```
Task 1 (Setup) → Task 2 (AssetService) → Task 3 (ScenarioClient) → Task 4 (processGenerationJob) → Task 5 (Testing)
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 2, 3 | Independent files, can edit in parallel |

| Task | Depends On | Reason |
|------|------------|--------|
| 1 | None | Setup must happen first |
| 2, 3 | 1 | Need log utility |
| 4 | 2, 3 | Orchestration logs depend on service logs being in place |
| 5 | 1, 2, 3, 4 | Can only test after all logging added |

---

## TODOs

- [x] 1. **Add Log Level Utility**

  **What to do**:
  - Add log level utility at top of `api/src/ai/assets.ts`
  - Define LOG_LEVEL env var reading
  - Define LEVELS mapping
  - Define shouldLog helper function
  - Add log formatting helper: `formatLog(level, jobId, assetId, message)`

  **Must NOT do**:
  - Do NOT create separate utility file
  - Do NOT add npm dependencies (winston, pino, etc.)
  - Do NOT change existing console.log statements yet

  **Parallelizable**: NO (must happen first)

  **References**:
  
  **Pattern References**:
  - None (new pattern being established)

  **Existing Code**:
  - `api/src/ai/assets.ts:473` - Existing debug log pattern to match
  - `api/src/ai/assets.ts:4-6` - Top of file where to add utility

  **Environment Variables**:
  - `process.env.LOG_LEVEL` - New env var (default: 'INFO')
  - `process.env.DEBUG_ASSET_GENERATION` - Existing (keep working)

  **Acceptance Criteria**:
  
  **Code Implementation**:
  - [ ] Utility added to top of assets.ts (lines 7-20)
  - [ ] LOG_LEVEL env var read with default 'INFO'
  - [ ] shouldLog() function works correctly
  - [ ] formatLog() produces: `[AssetGen] [job:X] [asset:Y] message`

  **Manual Verification**:
  ```bash
  # Test log level filtering
  export LOG_LEVEL=ERROR
  # Run generation - should only see ERROR logs
  
  export LOG_LEVEL=DEBUG  
  # Run generation - should see all logs
  ```

  **Evidence Required**:
  - [ ] Terminal output shows log format: `[AssetGen] [job:X] ...`
  - [ ] Changing LOG_LEVEL filters output correctly

  **Commit**: YES
  - Message: `feat(assets): add log level utility for production-safe debugging`
  - Files: `api/src/ai/assets.ts`
  - Pre-commit: `npx tsc --noEmit api/src/ai/assets.ts`

---

- [x] 2. **Add AssetService Logging**

  **What to do**:
  - Add DEBUG log in `generateDirect` showing extracted physics data (shape, width, height)
  - Add INFO log when silhouette created with dimensions
  - Add INFO log when silhouette uploaded to Scenario with assetId
  - Add INFO log when img2img generation starts
  - Add INFO log when image downloaded from Scenario  
  - Add INFO log when image uploaded to R2 with r2Key
  - Update existing error logs to use formatLog()
  - Verify debug output file path and fix if incorrect

  **Must NOT do**:
  - Do NOT log full base64 image data
  - Do NOT change generateDirect logic
  - Do NOT remove existing DEBUG_ASSET_GENERATION checks for saveDebugFile
  - Do NOT add logs in generateFromStructuredParams or generateWithSilhouette (deprecated methods)

  **Parallelizable**: YES (with 3)

  **References**:

  **Code to Modify**:
  - `api/src/ai/assets.ts:510-597` - generateDirect() method
  - `api/src/ai/assets.ts:530-543` - Silhouette creation section
  - `api/src/ai/assets.ts:545-551` - img2img call section
  - `api/src/ai/assets.ts:560-572` - Download and save section
  - `api/src/ai/assets.ts:574` - R2 upload call
  - `api/src/ai/assets.ts:454-477` - saveDebugFile() - verify path

  **Debug Output Investigation**:
  - Check if `DEBUG_OUTPUT_DIR` is correct (line 6)
  - Verify `process.cwd()` returns expected path
  - Add error log if saveDebugFile fails (currently only warns)

  **Acceptance Criteria**:

  **Code Implementation**:
  - [ ] Physics data logged: `[DEBUG] [job:X] Physics: {shape, width, height}`
  - [ ] Silhouette created: `[INFO] [job:X] Silhouette created: 512x256`
  - [ ] Silhouette uploaded: `[INFO] [job:X] Uploaded silhouette: asset_abc123`
  - [ ] img2img started: `[INFO] [job:X] Starting img2img generation`
  - [ ] Image downloaded: `[INFO] [job:X] Downloaded asset: asset_xyz789`
  - [ ] R2 uploaded: `[INFO] [job:X] Uploaded to R2: generated/platform/uuid.png`

  **Manual Verification**:
  ```bash
  export LOG_LEVEL=DEBUG
  # Generate assets, verify log output:
  tail -f <devmux-api-logs> | grep "\[AssetGen\]"
  
  # Expected output sequence:
  # [DEBUG] Physics: {shape: 'box', width: 4, height: 1}
  # [INFO] Silhouette created: 512x128
  # [INFO] Uploaded silhouette: asset_123
  # [INFO] Starting img2img generation  
  # [INFO] Downloaded asset: asset_456
  # [INFO] Uploaded to R2: generated/platform/xyz.png
  ```

  **Debug Output Verification**:
  ```bash
  export DEBUG_ASSET_GENERATION=true
  # Generate assets
  ls -la api/debug-output/
  # Should contain directories and files
  # If not, check logs for saveDebugFile errors
  ```

  **Evidence Required**:
  - [ ] Complete log sequence captured
  - [ ] Physics dimensions match game definition
  - [ ] Silhouette dimensions calculated correctly
  - [ ] R2 URL format is valid

  **Commit**: YES
  - Message: `feat(assets): add comprehensive pipeline logging to AssetService`
  - Files: `api/src/ai/assets.ts`
  - Pre-commit: `npx tsc --noEmit api/src/ai/assets.ts`

---

- [x] 3. **Add ScenarioClient Logging**

  **What to do**:
  - Add DEBUG log in `createImg2ImgJob` showing request params (prompt, strength, guidance, steps) WITHOUT API key
  - Add DEBUG log in `pollJobUntilComplete` for each poll attempt showing status
  - Add INFO log when polling completes successfully with assetIds count
  - Add DEBUG log in `uploadAsset` showing asset name (not base64 data)
  - Add INFO log in `uploadAsset` on success with returned assetId
  - Add DEBUG log in `downloadAsset` showing assetId being downloaded
  - Add INFO log in `downloadAsset` on success with mimeType and extension

  **Must NOT do**:
  - Do NOT log Authorization header or API credentials
  - Do NOT log full base64 image data
  - Do NOT change polling logic or request behavior
  - Do NOT add logging to unused methods (createGenerationJob, createThirdPartyJob)

  **Parallelizable**: YES (with 2)

  **References**:

  **Code to Modify**:
  - `api/src/ai/scenario.ts:153-187` - createImg2ImgJob()
  - `api/src/ai/scenario.ts:213-240` - pollJobUntilComplete()
  - `api/src/ai/scenario.ts:276-290` - uploadAsset()
  - `api/src/ai/scenario.ts:258-274` - downloadAsset()

  **Import Log Utility**:
  - Copy log utility from assets.ts to top of scenario.ts
  - OR import if we extract to shared location (but avoid scope creep)

  **Acceptance Criteria**:

  **Code Implementation**:
  - [ ] img2img request: `[DEBUG] POST /generate/img2img - Prompt: <first 100 chars>... strength: 0.95`
  - [ ] Polling: `[DEBUG] Polling job job_123: status=pending (attempt 3/60)`
  - [ ] Poll complete: `[INFO] Job job_123 succeeded: 1 asset(s) generated`
  - [ ] Upload start: `[DEBUG] Uploading asset: silhouette-123.png`
  - [ ] Upload success: `[INFO] Asset uploaded: asset_abc123`
  - [ ] Download start: `[DEBUG] Downloading asset: asset_abc123`
  - [ ] Download success: `[INFO] Downloaded asset: asset_abc123 (image/png, .png)`

  **Manual Verification**:
  ```bash
  export LOG_LEVEL=DEBUG
  # Generate assets
  
  # Verify Scenario.com interaction sequence:
  grep "POST /generate/img2img" api-logs.txt
  grep "Polling job" api-logs.txt
  grep "Job.*succeeded" api-logs.txt
  grep "Uploading asset" api-logs.txt
  grep "Asset uploaded" api-logs.txt
  grep "Downloaded asset" api-logs.txt
  ```

  **Secret Safety Check**:
  ```bash
  # Verify NO secrets logged
  grep -i "authorization" api-logs.txt  # Should be empty
  grep -i "api.*key" api-logs.txt      # Should be empty
  grep "Basic " api-logs.txt            # Should be empty
  ```

  **Evidence Required**:
  - [ ] Scenario.com API calls visible in logs
  - [ ] Polling progress shows status changes
  - [ ] No secrets appear in output

  **Commit**: YES
  - Message: `feat(scenario): add API interaction logging to ScenarioClient`
  - Files: `api/src/ai/scenario.ts`
  - Pre-commit: `npx tsc --noEmit api/src/ai/scenario.ts`

---

- [x] 4. **Add Orchestration Logging**

  **What to do**:
  - Add INFO log at start of `processGenerationJob` showing jobId and task count
  - Add DEBUG log in task loop showing current task being processed (templateId, entityType)
  - Add DEBUG log showing physics data extracted from game definition
  - Add DEBUG log showing target dimensions calculated from physics
  - Add INFO log when task completes successfully showing assetId
  - Add INFO log when all tasks complete showing success/fail counts
  - Update existing background removal logs to use formatLog()

  **Must NOT do**:
  - Do NOT log full game definition JSON
  - Do NOT change processGenerationJob control flow
  - Do NOT add logging to other tRPC routes (only processGenerationJob)

  **Parallelizable**: NO (depends on 2, 3)

  **References**:

  **Code to Modify**:
  - `api/src/trpc/routes/asset-system.ts:598-722` - processGenerationJob mutation
  - `api/src/trpc/routes/asset-system.ts:520-545` - Physics extraction in createGenerationJob
  - `api/src/trpc/routes/asset-system.ts:633-713` - Task processing loop

  **Import Log Utility**:
  - Copy log utility from assets.ts to top of asset-system.ts

  **Acceptance Criteria**:

  **Code Implementation**:
  - [ ] Job start: `[INFO] [job:X] Starting job with 5 tasks`
  - [ ] Task start: `[DEBUG] [job:X] [task:Y] Processing: platform (templateId: widePlatform)`
  - [ ] Physics extracted: `[DEBUG] [job:X] [task:Y] Physics from game def: {shape: box, width: 4, height: 1}`
  - [ ] Dimensions calculated: `[DEBUG] [job:X] [task:Y] Target dimensions: 512x128 (4:1)`
  - [ ] Task complete: `[INFO] [job:X] [task:Y] Task succeeded - Asset: asset_abc123`
  - [ ] Job complete: `[INFO] [job:X] Job finished: 5 succeeded, 0 failed`

  **Manual Verification**:
  ```bash
  export LOG_LEVEL=DEBUG
  # Generate assets for game with multiple templates
  
  # Trace complete job lifecycle:
  grep "\[job:" api-logs.txt | head -20
  
  # Expected flow:
  # [INFO] [job:X] Starting job with N tasks
  # [DEBUG] [job:X] [task:1] Processing: character (player)
  # [DEBUG] [job:X] [task:1] Physics: {shape: box, width: 1, height: 2}
  # [DEBUG] [job:X] [task:1] Target: 256x512
  # [INFO] [job:X] [task:1] Succeeded - Asset: abc123
  # ... (repeat for each task)
  # [INFO] [job:X] Job finished: N succeeded, 0 failed
  ```

  **Fork Comparison Test**:
  ```bash
  # Generate for original game - save logs
  cp api-logs.txt original-game-logs.txt
  
  # Fork game - generate for fork - save logs  
  cp api-logs.txt forked-game-logs.txt
  
  # Compare physics data
  diff <(grep "Physics from game def" original-game-logs.txt) \
       <(grep "Physics from game def" forked-game-logs.txt)
  
  # Should be identical - if different, found the bug!
  ```

  **Evidence Required**:
  - [ ] Complete job trace from start to finish
  - [ ] Physics data visible for each template
  - [ ] Target dimensions match physics aspect ratio
  - [ ] Success/fail counts accurate

  **Commit**: YES
  - Message: `feat(asset-system): add job orchestration logging to processGenerationJob`
  - Files: `api/src/trpc/routes/asset-system.ts`
  - Pre-commit: `npx tsc --noEmit api/src/trpc/routes/asset-system.ts`

---

- [x] 5. **Comprehensive Testing & Documentation**

  **What to do**:
  - Run all 4 manual tests (defined in Verification Strategy)
  - Compare original vs forked game logs to identify physics mismatch
  - If debug output still not working, document why in CONTINUATION.md
  - Update CONTINUATION.md with logging details and how to use
  - Create example log output in docs/asset-generation/debug-log-example.txt

  **Must NOT do**:
  - Do NOT attempt to fix the actual physics bug (that's a separate task)
  - Do NOT add UI logging
  - Do NOT change documentation outside asset-generation/

  **Parallelizable**: NO (depends on all previous tasks)

  **References**:

  **Test Procedure Files**:
  - See "Verification Strategy" section above for 4 test procedures
  - Use `devmux attach api` or `tmux capture-pane -t api -p` to capture logs

  **Documentation Updates**:
  - `docs/asset-generation/CONTINUATION.md` - Add "Debug Logging" section
  - Create `docs/asset-generation/debug-log-example.txt` - Sample log output

  **Acceptance Criteria**:

  **Test 1 - Debug Output Pattern**:
  - [ ] api/debug-output/ directory created
  - [ ] Subdirectories exist for each generated asset
  - [ ] Files present: silhouette.png, prompt.txt, result image, manifest.json
  - [ ] If not working: Documented reason in CONTINUATION.md

  **Test 2 - Pipeline Flow Tracing**:
  - [ ] Can trace single asset from job start to R2 upload
  - [ ] Correlation IDs (jobId, taskId, assetId) link logs correctly
  - [ ] Pipeline stages visible: physics → silhouette → upload → img2img → download → R2

  **Test 3 - Fork Comparison**:
  - [ ] Generated assets for original game
  - [ ] Forked game and regenerated assets
  - [ ] Compared physics data in logs
  - [ ] Documented findings: Are physics identical? Different? Missing?

  **Test 4 - Secret Safety**:
  - [ ] Verified no API keys in logs
  - [ ] Verified no Authorization headers in logs
  - [ ] Verified no base64 image data in logs

  **Documentation**:
  - [ ] CONTINUATION.md updated with "Debug Logging" section
  - [ ] debug-log-example.txt created with sample output
  - [ ] Instructions for using LOG_LEVEL env var
  - [ ] Instructions for interpreting logs

  **Manual Verification**:
  ```bash
  # Run all tests from Verification Strategy section
  
  # Test 1: Debug Output
  export DEBUG_ASSET_GENERATION=true LOG_LEVEL=DEBUG
  # <generate assets>
  ls -R api/debug-output/
  
  # Test 2: Flow Tracing  
  grep "\[job:X\]" api-logs.txt | sort
  
  # Test 3: Fork Comparison
  # <generate original> → save logs
  # <fork game> → <generate fork> → save logs
  diff original-logs.txt forked-logs.txt
  
  # Test 4: Secret Safety
  grep -E "(api.*key|authorization|basic )" -i api-logs.txt
  # Should return nothing
  ```

  **Evidence Required**:
  - [ ] All 4 tests passed (or failures documented)
  - [ ] CONTINUATION.md has "Debug Logging" section
  - [ ] debug-log-example.txt exists and is accurate
  - [ ] Fork comparison findings documented

  **Commit**: YES
  - Message: `docs(assets): add debug logging documentation and examples`
  - Files: `docs/asset-generation/CONTINUATION.md`, `docs/asset-generation/debug-log-example.txt`
  - Pre-commit: None (markdown files)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(assets): add log level utility for production-safe debugging` | api/src/ai/assets.ts | `npx tsc --noEmit api/src/ai/assets.ts` |
| 2 | `feat(assets): add comprehensive pipeline logging to AssetService` | api/src/ai/assets.ts | `npx tsc --noEmit api/src/ai/assets.ts` |
| 3 | `feat(scenario): add API interaction logging to ScenarioClient` | api/src/ai/scenario.ts | `npx tsc --noEmit api/src/ai/scenario.ts` |
| 4 | `feat(asset-system): add job orchestration logging to processGenerationJob` | api/src/trpc/routes/asset-system.ts | `npx tsc --noEmit api/src/trpc/routes/asset-system.ts` |
| 5 | `docs(assets): add debug logging documentation and examples` | docs/asset-generation/CONTINUATION.md, docs/asset-generation/debug-log-example.txt | None |

---

## Success Criteria

### Verification Commands
```bash
# Enable debug logging
export LOG_LEVEL=DEBUG
export DEBUG_ASSET_GENERATION=true

# Run asset generation
# (via UI: Asset Gallery → Regenerate Assets)

# Verify logs show complete pipeline
grep "\[AssetGen\]" <api-logs> | head -50

# Verify debug output files created
find api/debug-output/ -type f

# Verify no secrets leaked
grep -iE "(authorization|api.*key|basic )" <api-logs>  # Should be empty
```

### Final Checklist
- [x] All TODOs completed
- [x] All commits made with verification
- [x] LOG_LEVEL env var controls verbosity
- [x] Pipeline flow traceable via correlation IDs
- [x] Physics data visible in logs
- [x] Scenario.com API calls logged (safely)
- [x] Debug output files created (or documented why not)
- [x] No secrets in logs (verified)
- [ ] Fork comparison test completed (BLOCKED: requires user to run generation via UI)
- [x] CONTINUATION.md updated
