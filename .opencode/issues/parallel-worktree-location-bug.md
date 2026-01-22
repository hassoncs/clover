# Bug: Parallel Worktrees Created Inside Repository Directory

**Date:** 2026-01-22  
**Severity:** Medium  
**Component:** `mcp_parallel_task` / Parallel Coding System

---

## Summary

The parallel task system creates git worktrees inside the `.pw/` directory within the existing repository, which creates a confusing nested structure and can cause issues with git operations, IDE indexing, and parallel task dispatch.

---

## Observed Behavior

When dispatching parallel tasks with `mcp_parallel_task`:

```typescript
mcp_parallel_task({
  description: "Update Dominoes.tsx",
  contract: { ... },
  worktree: true,
  run_in_background: true
})
```

The system creates:
- **Worktree Path:** `/Users/hassoncs/Workspaces/Personal/slopcade/.pw/refactor-dominoes-ts-update-d`
- **Branch:** `pw/refactor-dominoes-ts-update-d`

This results in:
```
slopcade/                          # Main repo
├── .git/                          # Main git directory
├── .pw/                           # ❌ Worktrees INSIDE the repo
│   ├── refactor-dominoes-ts-update-d/
│   │   ├── .git                   # Worktree link
│   │   ├── app/
│   │   └── ...                    # Full copy of repo
│   └── update-avalanche-example/
└── app/
```

---

## Problems with Current Behavior

### 1. Nested Repository Confusion
- IDEs and tools see nested git directories and get confused
- `git status` in main repo shows `.pw/` as untracked
- Users might accidentally commit worktree directories

### 2. Parallel Dispatch Failures
When attempting to dispatch multiple parallel tasks simultaneously:
```
Error: There are uncommitted changes in the working directory
```

Even though `git status` only shows `.pw/` as untracked (not staged), subsequent parallel dispatches fail. This suggests the worktree location is interfering with the dispatch mechanism.

### 3. Disk Space Waste
- Worktrees are full copies of the repo (including `node_modules` if not excluded)
- Multiple worktrees inside the repo balloon the main repo size
- Backup tools might try to backup worktrees

### 4. IDE Performance
- IDEs might index worktree directories
- TypeScript server might scan multiple copies of the same code
- Search tools return duplicate results

---

## Expected Behavior

Git worktrees should be created **outside** the main repository directory, similar to how other worktree-based tools work:

### Option A: Sibling Directory
```
/Users/hassoncs/Workspaces/Personal/
├── slopcade/                      # Main repo
│   ├── .git/
│   └── app/
└── slopcade-worktrees/            # ✅ Worktrees outside
    ├── refactor-dominoes-ts-update-d/
    ├── update-avalanche-example/
    └── update-interaction-example/
```

### Option B: Temp Directory
```
/tmp/opencode-worktrees/           # ✅ Temp location
├── slopcade-abc123/
│   ├── refactor-dominoes-ts-update-d/
│   └── update-avalanche-example/
```

### Option C: User-Configurable Location
```json
// .opencode/config.json
{
  "parallelCoding": {
    "worktreePath": "/Users/hassoncs/.opencode/worktrees"
  }
}
```

---

## Proposed Solution

### Immediate Fix (Recommended: Option A)

1. **Default Location:** Create worktrees as siblings to the main repo
   ```
   /path/to/repo           → main repo
   /path/to/repo-worktrees → worktrees
   ```

2. **Naming Convention:**
   ```
   {repo-name}-worktrees/{unit-id}/
   ```

3. **Cleanup:** Automatically remove worktrees after successful merge or on error

### Configuration

Allow users to override default location:

```json
// ~/.opencode/config.json (global)
{
  "parallelCoding": {
    "worktreeBaseDir": "~/.opencode/worktrees"
  }
}

// .opencode/config.json (per-project)
{
  "parallelCoding": {
    "worktreeBaseDir": "../worktrees"  // relative to repo root
  }
}
```

---

## Implementation Notes

### Git Worktree Command

Current (problematic):
```bash
git worktree add .pw/refactor-dominoes-ts-update-d -b pw/refactor-dominoes-ts-update-d
```

Proposed:
```bash
git worktree add ../slopcade-worktrees/refactor-dominoes-ts-update-d -b pw/refactor-dominoes-ts-update-d
```

### Cleanup

Worktrees should be removed after:
- ✅ Successful merge
- ✅ Explicit user cancellation
- ❌ Task failure (keep for debugging, but warn user)

```bash
git worktree remove ../slopcade-worktrees/refactor-dominoes-ts-update-d
git branch -d pw/refactor-dominoes-ts-update-d  # if merged
```

---

## Workaround (Current)

Until fixed, add to `.gitignore`:
```gitignore
# Temporary workaround for parallel worktrees
.pw/
```

And manually dispatch tasks sequentially instead of in parallel.

---

## Related Issues

- Parallel dispatch fails after first task dispatch
- IDE performance degradation with worktrees present
- Disk space usage concerns

---

## Testing Checklist

After fix:
- [ ] Verify worktrees created outside repo directory
- [ ] Verify multiple parallel dispatches work simultaneously
- [ ] Verify `git status` in main repo stays clean
- [ ] Verify IDE doesn't index worktree directories
- [ ] Verify cleanup removes worktrees and branches after merge
- [ ] Verify error handling preserves worktrees for debugging

---

## Additional Context

**Reproduction:**
```typescript
// Dispatch 3 tasks in parallel
mcp_parallel_task({ unitId: "task-1", worktree: true, run_in_background: true })
mcp_parallel_task({ unitId: "task-2", worktree: true, run_in_background: true })
mcp_parallel_task({ unitId: "task-3", worktree: true, run_in_background: true })
```

**Result:** First succeeds, subsequent two fail with "uncommitted changes" error.

**Environment:**
- macOS
- Git 2.x
- OpenCode with parallel coding enabled
