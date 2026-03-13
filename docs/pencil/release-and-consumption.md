# Pencil Release and Consumption

This document outlines how Slopcade consumes the standalone Pencil repository, the local development workflow, and rollback steps.

## Overview

Slopcade consumes Pencil packages from the standalone repository located at `/Users/hassoncs/Workspaces/personal/pencil`. 

Instead of publishing to a public npm registry, we use a local tarball workflow. The tarballs are stored in `.sisyphus/vendor/pencil-tarballs/` and consumed via `pnpm.overrides` in the root `package.json`.

### Consumed Packages
- `@pencil/core`
- `@pencil/design-canvas`
- `@pencil/protocol`
- `@pencil/server`

## Consumer Workflow (Updating Tarballs)

When changes are made in the standalone Pencil repository, follow these steps to update Slopcade:

1. **Build and Pack (in Pencil repo)**:
   Navigate to the standalone Pencil repository and run `pnpm pack` in each changed package directory.
   ```bash
   cd /Users/hassoncs/Workspaces/personal/pencil
   cd packages/pencil-core && pnpm pack
   cd ../design-canvas && pnpm pack
   # ... repeat for other packages
   ```

2. **Copy Tarballs (to Slopcade)**:
   Copy the generated `.tgz` files to the vendor directory in Slopcade.
   ```bash
   cp /Users/hassoncs/Workspaces/personal/pencil/packages/**/*.tgz /Users/hassoncs/Workspaces/Personal/slopcade/.sisyphus/vendor/pencil-tarballs/
   ```

3. **Install and Verify (in Slopcade)**:
   Run `pnpm install` to update the lockfile and apply the new tarballs.
   ```bash
   cd /Users/hassoncs/Workspaces/Personal/slopcade
   pnpm install
   ```
   Verify the changes by running the development server or tests:
   ```bash
   pnpm dev
   ```

### Why `pnpm.overrides`?
The root `package.json` uses `pnpm.overrides` to force all transitive dependencies to use the local tarballs:
```json
"overrides": {
  "@pencil/core": "file:.sisyphus/vendor/pencil-tarballs/pencil-core-1.0.0.tgz",
  // ...
}
```
This is necessary because `pnpm pack` automatically rewrites internal workspace references (e.g., `workspace:*`) to `1.0.0` in the generated tarballs. The overrides ensure that when `@pencil/server` requires `@pencil/core`, it resolves to our local tarball instead of looking for version `1.0.0` on the public registry.

## Rollback Procedure

If a new tarball introduces issues, you can roll back to the previous state:

1. **Restore Old Tarballs**:
   If the `.sisyphus/vendor/pencil-tarballs/` directory is tracked in git, simply check out the previous commit:
   ```bash
   git checkout HEAD^ -- .sisyphus/vendor/pencil-tarballs/
   ```
   *Alternatively, if they are untracked, you must go to the Pencil repository, check out the older commit, and re-run the pack and copy steps.*

2. **Reinstall**:
   Run `pnpm install` to apply the rollback.
   ```bash
   pnpm install
   ```

## History Cleanup (Wave 5 Caveat)

During the initial extraction of the standalone Pencil repository (Wave 5), local history-shaping commits were created in both Slopcade and the Pencil repository.

- **Future history cleanup must be deliberate.**
- If you need to rewrite history (e.g., `git rebase -i`), be aware that the two repositories have diverged histories from the extraction point. Ensure that any history rewrites do not break the ability to trace changes back to the original commits if needed.
