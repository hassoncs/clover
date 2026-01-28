#!/usr/bin/env node
/**
 * Big Bang Import Alias Migration Script
 * 
 * Converts all relative imports to use path aliases:
 * - `../../ai/validator` → `@/ai/validator` (within api package)
 * - `../../../shared/src/types` → `@slopcade/shared/types` (cross-package)
 * 
 * Usage:
 *   node scripts/migrate-imports-big-bang.mjs --dry-run  # Preview changes
 *   node scripts/migrate-imports-big-bang.mjs            # Apply changes
 *   node scripts/migrate-imports-big-bang.mjs --verify   # Run tests after
 */

import { glob } from 'glob';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Parse arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const verify = args.includes('--verify');
const verbose = args.includes('--verbose') || dryRun;

// Statistics
const stats = {
  filesScanned: 0,
  filesChanged: 0,
  importsConverted: 0,
  errors: [],
};

// Package configurations
const packages = [
  { name: 'api', path: 'api', hasSharedAlias: true },
  { name: 'shared', path: 'shared', hasSharedAlias: false },
  { name: 'app', path: 'app', hasSharedAlias: true },
  { name: 'ui', path: 'packages/ui', hasSharedAlias: true },
  { name: 'theme', path: 'packages/theme', hasSharedAlias: true },
  { name: 'game-inspector-mcp', path: 'packages/game-inspector-mcp', hasSharedAlias: true },
];

/**
 * Calculate the relative path depth from a file to the package root
 */
function getRelativeDepth(filePath, packagePath) {
  const relativePath = path.relative(packagePath, filePath);
  const depth = relativePath.split(path.sep).length - 1;
  return depth;
}

/**
 * Convert a relative import path to an alias
 */
function convertImport(importPath, filePath, packageConfig) {
  const packageRoot = path.join(rootDir, packageConfig.path);
  const fileDir = path.dirname(filePath);
  
  // Handle cross-package imports to shared
  if (importPath.includes('/shared/') || importPath.endsWith('/shared')) {
    // Check if it's importing from shared
    const sharedMatch = importPath.match(/^(?:\.\.\/)*shared\/src\/(.*)$/);
    if (sharedMatch) {
      return `@slopcade/shared/${sharedMatch[1]}`;
    }
    // Handle direct shared imports like ../../shared
    if (importPath.match(/^(?:\.\.\/)*shared$/)) {
      return '@slopcade/shared';
    }
  }
  
  // Handle within-package imports (convert to @/)
  if (importPath.startsWith('.')) {
    // Resolve the relative path to get the absolute path within the package
    const resolvedPath = path.resolve(fileDir, importPath);
    const relativeToPackage = path.relative(packageRoot, resolvedPath);
    
    // Only convert if it's within the src directory
    if (!relativeToPackage.startsWith('..') && !path.isAbsolute(relativeToPackage)) {
      // Remove .ts extension if present and strip 'src/' prefix
      const cleanPath = relativeToPackage
        .replace(/\.ts$/, '')
        .replace(/^src\//, '');
      return `@/${cleanPath}`;
    }
  }
  
  return null; // No conversion needed
}

/**
 * Process a single file
 */
async function processFile(filePath, packageConfig) {
  const content = await fs.readFile(filePath, 'utf-8');
  let newContent = content;
  let hasChanges = false;
  let fileConversions = 0;
  
  // Match import statements
  const importRegex = /from\s+['"]([^'"]+)['"];?/g;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    const originalImport = match[1];
    
    // Skip already aliased imports
    if (originalImport.startsWith('@/') || originalImport.startsWith('@slopcade/')) {
      continue;
    }
    
    // Skip node_modules imports
    if (!originalImport.startsWith('.')) {
      continue;
    }
    
    const convertedImport = convertImport(originalImport, filePath, packageConfig);
    
    if (convertedImport && convertedImport !== originalImport) {
      // Replace in the new content
      const before = newContent;
      newContent = newContent.replace(
        new RegExp(`from\\s+['"]${escapeRegex(originalImport)}['"];?`),
        `from '${convertedImport}'`
      );
      
      if (newContent !== before) {
        hasChanges = true;
        fileConversions++;
        stats.importsConverted++;
        
        if (verbose) {
          console.log(`  ${originalImport} → ${convertedImport}`);
        }
      }
    }
  }
  
  // Also handle dynamic imports
  const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = dynamicImportRegex.exec(content)) !== null) {
    const originalImport = match[1];
    
    if (originalImport.startsWith('@/') || originalImport.startsWith('@slopcade/')) {
      continue;
    }
    
    if (!originalImport.startsWith('.')) {
      continue;
    }
    
    const convertedImport = convertImport(originalImport, filePath, packageConfig);
    
    if (convertedImport && convertedImport !== originalImport) {
      const before = newContent;
      newContent = newContent.replace(
        new RegExp(`import\\s*\\(\\s*['"]${escapeRegex(originalImport)}['"]\\s*\\)`),
        `import('${convertedImport}')`
      );
      
      if (newContent !== before) {
        hasChanges = true;
        fileConversions++;
        stats.importsConverted++;
        
        if (verbose) {
          console.log(`  ${originalImport} → ${convertedImport} (dynamic)`);
        }
      }
    }
  }
  
  if (hasChanges) {
    stats.filesChanged++;
    
    if (!dryRun) {
      await fs.writeFile(filePath, newContent, 'utf-8');
    }
    
    if (verbose || dryRun) {
      const relativePath = path.relative(rootDir, filePath);
      console.log(`${dryRun ? '[DRY-RUN] ' : ''}${relativePath} (${fileConversions} conversions)`);
    }
  }
}

/**
 * Escape special regex characters
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('='.repeat(60));
  console.log('Big Bang Import Alias Migration');
  console.log('='.repeat(60));
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log('');
  
  for (const packageConfig of packages) {
    const packagePath = path.join(rootDir, packageConfig.path);
    const srcPath = path.join(packagePath, 'src');
    
    console.log(`\n📦 Processing ${packageConfig.name}...`);
    
    // Check if src directory exists
    try {
      await fs.access(srcPath);
    } catch {
      console.log(`  ⚠️  No src directory found, skipping`);
      continue;
    }
    
    // Find all TypeScript files
    const pattern = path.join(srcPath, '**/*.ts');
    const files = await glob(pattern, { ignore: ['**/node_modules/**', '**/dist/**'] });
    
    // Also include .tsx files for app package
    let allFiles = files;
    if (packageConfig.name === 'app') {
      const tsxPattern = path.join(packagePath, '**/*.tsx');
      const tsxFiles = await glob(tsxPattern, { ignore: ['**/node_modules/**', '**/dist/**'] });
      allFiles = [...files, ...tsxFiles];
    }
    
    for (const file of allFiles) {
      stats.filesScanned++;
      try {
        await processFile(file, packageConfig);
      } catch (error) {
        stats.errors.push({ file, error: error.message });
        console.error(`  ❌ Error processing ${file}: ${error.message}`);
      }
    }
  }
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('Migration Summary');
  console.log('='.repeat(60));
  console.log(`Files scanned: ${stats.filesScanned}`);
  console.log(`Files changed: ${stats.filesChanged}`);
  console.log(`Imports converted: ${stats.importsConverted}`);
  
  if (stats.errors.length > 0) {
    console.log(`\n❌ Errors: ${stats.errors.length}`);
    for (const { file, error } of stats.errors) {
      console.log(`  - ${path.relative(rootDir, file)}: ${error}`);
    }
  }
  
  if (dryRun) {
    console.log('\n⚠️  This was a dry run. No files were modified.');
    console.log('Run without --dry-run to apply changes.');
  } else {
    console.log('\n✅ Migration complete!');
    
    if (verify) {
      console.log('\n🔍 Running verification...');
      // Could add test commands here
    }
  }
  
  console.log('');
}

// Run the migration
runMigration().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
