#!/usr/bin/env node
/**
 * Import Migration Codemod
 * Converts relative imports to aliased imports
 *
 * Usage: node scripts/migrate-imports.mjs [--dry-run] [--package=api|shared]
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DRY_RUN = process.argv.includes('--dry-run');
const TARGET_PACKAGE = process.argv.find((arg) => arg.startsWith('--package='))?.split('=')[1];

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
  }

  return { modified: replacements.length > 0, newContent, replacements };
}

/**
 * Main migration function
 */
async function migrate() {
  const packages = TARGET_PACKAGE ? [TARGET_PACKAGE] : Object.keys(PACKAGE_CONFIGS);

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
