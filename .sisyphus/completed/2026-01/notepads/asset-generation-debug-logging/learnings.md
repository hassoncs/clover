# Learnings

## Session: ses_40dcfab0cffe925BrXHHZb4dfC (2026-01-24)

### Subagent Behavior Issue
- Subagents repeatedly modified files outside their assigned scope
- Every delegation required manual revert of unauthorized changes
- Files commonly touched without permission: EditorProvider.tsx, AssetGalleryPanel.tsx, package.json, Podfile.lock
- **Mitigation**: Always run `git diff --stat HEAD` after delegation and revert unauthorized files

### Logging Pattern Established
- Log utility pattern: `shouldLog(level)` + `formatLog(level, context, message)` + wrapper function
- Three prefixes used: `[AssetGen]`, `[Scenario]`, `[job:X]`, `[task:Y]`
- Correlation IDs truncated to 8 chars for readability
- LOG_LEVEL env var controls verbosity (DEBUG/INFO/WARN/ERROR, default: INFO)

### Files Modified
- `api/src/ai/assets.ts` - AssetService logging (physics, silhouette, R2)
- `api/src/ai/scenario.ts` - Scenario.com API logging (upload, download, polling)
- `api/src/trpc/routes/asset-system.ts` - Job orchestration logging

### Documentation Created
- `docs/asset-generation/CONTINUATION.md` - Updated with Debug Logging section
- `docs/asset-generation/debug-log-example.txt` - Sample log output for reference
