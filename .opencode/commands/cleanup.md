---
description: "Clean up temporary files, test screenshots, and logs from the repository root"
agent: "default"
subtask: false
---

# Repository Cleanup

Scan the repository root for temporary files, test artifacts, logs, and other files that shouldn't be committed, then clean them up.

## What Gets Cleaned

### Always Delete (Safe)
- Test screenshots: `*.png` files with patterns like `paint-*.png`, `scenario*.png`, `test-*.png`
- Log files: `*.log`, `console-errors.txt`, `console-errors.log`, `ccache.log`
- Backup files: `*.backup`, `*.bak`, `*.tmp`
- macOS files: `.DS_Store`
- Temporary scripts: `test` (executable without extension)

### Review Before Deleting
- Markdown files in root (may be documentation to keep)
- Shell scripts (may be utilities)

## Instructions

1. **List root files** to identify cleanup targets:
   - Run `ls -la` in the repository root
   - Look for patterns: screenshots, logs, backups, temp files

2. **Delete safe temporary files**:
   - Test screenshots (*.png with test-related names)
   - Log files (*.log, console-errors.*)
   - Backup files (*.backup, *.bak)
   - .DS_Store files
   - Temporary executables (files named `test` with no extension)

3. **Handle markdown files**:
   - If it's debug/handoff content (e.g., `BALLSORT_DEBUG_HANDOFF.md`, `PHASE1-COMPLETE.md`): DELETE
   - If it's valuable documentation (e.g., `3d-game-engine-plan.md`, `AUDIT.md`): MOVE to `docs/` or `docs/plans/`
   - If it's a duplicate (e.g., `ARCHITECTURE.md` when `docs/ARCHITECTURE.md` exists): DELETE the less detailed one

4. **Update .gitignore** if needed:
   - Add patterns for new log file types discovered
   - Add patterns for generated test artifacts

5. **Report what was done**:
   - List deleted files
   - List moved files with their new locations
   - List any .gitignore additions

$ARGUMENTS
