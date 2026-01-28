# Import Alias Standardization Plan

## Goal
Convert all relative imports (`../`, `./`) to absolute aliases (`@/`, `@slopcade/shared/`) across the entire project.

## Current State
- **api/**: 135 relative imports, no aliases configured
- **shared/**: 103 relative imports, no aliases configured  
- **app/**: Already uses `@/*` aliases (0 relative imports)

## Phase 1: Configuration Setup

### 1. Update `api/tsconfig.json`
Add paths configuration:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@slopcade/shared/*": ["../shared/src/*"]
    }
  }
}
```

### 2. Update `shared/tsconfig.json`
Add paths configuration:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### 3. Update `api/vitest.config.ts`
Ensure Vitest can resolve the aliases:
```typescript
import path from 'path';

export default defineWorkersConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@slopcade/shared': path.resolve(__dirname, '../shared/src'),
    },
  },
});
```

### 4. Update `shared/vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
```

## Phase 2: Codemod Script

Create `scripts/migrate-imports.mjs`:

```javascript
#!/usr/bin/env node
/**
 * Import Migration Codemod
 * Converts relative imports to aliased imports
 * 
 * Usage: node scripts/migrate-imports.mjs [--dry-run] [--package=api|shared]
 */

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

const DRY_RUN = process.argv.includes('--dry-run');
const TARGET_PACKAGE = process.argv.find(arg => arg.startsWith('--package='))?.split('=')[1];

// Configuration for each package
const PACKAGE_CONFIGS = {
  api: {
    root: 'api',
    srcDir: 'api/src',
    aliases: {
      '@': './src',
      '@slopcade/shared': '../shared/src',
    },
  },
  shared: {
    root: 'shared',
    srcDir: 'shared/src',
    aliases: {
      '@': './src',
    },
  },
};

/**
 * Resolve relative import path to absolute alias
 */
function resolveImport(sourceFile, importPath, config) {
  // Already an alias - leave as-is
  if (importPath.startsWith('@')) {
    return null;
  }

  // Not a relative import - leave as-is
  if (!importPath.startsWith('.')) {
    return null;
  }

  const sourceDir = path.dirname(sourceFile);
  const absoluteImport = path.resolve(sourceDir, importPath);
  const srcRoot = path.resolve(config.srcDir);

  // Check if import resolves within the package's src directory
  if (absoluteImport.startsWith(srcRoot)) {
    const relativeToSrc = path.relative(srcRoot, absoluteImport);
    return `@/${relativeToSrc.replace(/\.ts$/, '').replace(/\\/g, '/')}`;
  }

  // Check if it's importing from shared package
  if (config.root === 'api' && absoluteImport.includes('shared/src')) {
    const sharedPath = absoluteImport.split('shared/src/')[1];
    return `@slopcade/shared/${sharedPath.replace(/\.ts$/, '').replace(/\\/g, '/')}`;
  }

  return null;
}

/**
 * Transform a single file
 */
async function transformFile(filePath, config) {
  const content = await fs.readFile(filePath, 'utf-8');
  let modified = false;

  // Match import statements
  const importRegex = /from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]/g;
  
  let newContent = content;
  const replacements = [];

  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1] || match[2];
    const newPath = resolveImport(filePath, importPath, config);
    
    if (newPath) {
      replacements.push({
        original: match[0],
        replacement: match[0].replace(importPath, newPath),
        oldPath: importPath,
        newPath,
      });
    }
  }

  // Apply replacements (in reverse order to maintain indices)
  for (const { original, replacement } of replacements.reverse()) {
    newContent = newContent.replace(original, replacement);
    modified = true;
  }

  return { modified, newContent, replacements };
}

/**
 * Main migration function
 */
async function migrate() {
  const packages = TARGET_PACKAGE 
    ? [TARGET_PACKAGE]
    : Object.keys(PACKAGE_CONFIGS);

  for (const pkgName of packages) {
    const config = PACKAGE_CONFIGS[pkgName];
    if (!config) {
      console.error(`Unknown package: ${pkgName}`);
      process.exit(1);
    }

    console.log(`\n📦 Processing ${pkgName}/...`);
    
    const files = await glob(`${config.srcDir}/**/*.ts`, {
      ignore: ['**/node_modules/**', '**/*.test.ts', '**/__tests__/**'],
    });

    let changed = 0;
    let unchanged = 0;
    let errors = 0;

    for (const file of files) {
      try {
        const { modified, newContent, replacements } = await transformFile(file, config);
        
        if (modified) {
          console.log(`\n  📝 ${file}`);
          for (const { oldPath, newPath } of replacements) {
            console.log(`     ${oldPath} → ${newPath}`);
          }
          
          if (!DRY_RUN) {
            await fs.writeFile(file, newContent, 'utf-8');
          }
          changed++;
        } else {
          unchanged++;
        }
      } catch (err) {
        console.error(`  ❌ Error in ${file}: ${err.message}`);
        errors++;
      }
    }

    console.log(`\n✅ ${pkgName} complete:`);
    console.log(`   Changed: ${changed}`);
    console.log(`   Unchanged: ${unchanged}`);
    console.log(`   Errors: ${errors}`);
  }

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN - no files were modified');
  }
}

migrate().catch(console.error);
```

## Phase 3: Execution Plan

### Step 1: Test the migration (dry run)
```bash
# Test api package only
node scripts/migrate-imports.mjs --package=api --dry-run

# Test shared package only  
node scripts/migrate-imports.mjs --package=shared --dry-run

# Test all packages
node scripts/migrate-imports.mjs --dry-run
```

### Step 2: Apply the migration
```bash
# Apply to api package first (lower risk)
node scripts/migrate-imports.mjs --package=api

# Run tests to verify
pnpm test:api

# Apply to shared package
node scripts/migrate-imports.mjs --package=shared

# Run all tests
pnpm test
```

### Step 3: Verify and fix edge cases
```bash
# Type check everything
pnpm tsc --noEmit

# Run the test games validation to ensure nothing broke
pnpm vitest run api/src/ai/__tests__/test-games-validation.test.ts
```

## Phase 4: Enforcement

### Add ESLint rule to prevent relative imports
Install `eslint-plugin-import` and add:
```json
{
  "rules": {
    "no-restricted-imports": ["error", {
      "patterns": ["../../*"]
    }]
  }
}
```

### Pre-commit hook validation
Add to `.husky/pre-commit`:
```bash
# Check for relative imports in new/changed files
if git diff --cached --name-only | grep -E '\.(ts|tsx)$'; then
  node scripts/check-relative-imports.mjs --staged
fi
```

## Expected Results

**Before:**
```typescript
import { validateGameDefinition } from '../../ai/validator';
import type { GameDefinition } from '../../../shared/src/types/GameDefinition';
```

**After:**
```typescript
import { validateGameDefinition } from '@/ai/validator';
import type { GameDefinition } from '@slopcade/shared/types/GameDefinition';
```

## Benefits

1. **Refactoring safety** - Moving files doesn't break imports
2. **Readability** - Clear package boundaries (`@/` vs `@slopcade/shared/`)
3. **IDE support** - Better auto-import suggestions
4. **Consistency** - Same pattern across all packages

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Build tools don't resolve aliases | Test vitest/build configs before migration |
| TypeScript can't find modules | Ensure all tsconfig.json have matching paths |
| Breaking existing PRs | Coordinate migration timing, do it in one go |
| Missing edge cases | Dry run first, review all changes before committing |
