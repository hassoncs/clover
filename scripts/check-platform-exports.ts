#!/usr/bin/env npx tsx
import { dirname, basename, relative, join } from 'path';
import { existsSync, readdirSync, statSync, readFileSync } from 'fs';

const ROOT = process.cwd();

function walkDir(dir: string, callback: (file: string) => void): void {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    if (entry === 'node_modules' || entry === 'dist' || entry === '.next') continue;
    const stat = statSync(fullPath);
    if (stat.isDirectory()) walkDir(fullPath, callback);
    else if (stat.isFile()) callback(fullPath);
  }
}

function getExportedNames(filePath: string): Set<string> | null {
  const content = readFileSync(filePath, 'utf-8');
  const exports = new Set<string>();

  // export * from - can't compare these easily
  if (/export\s+\*\s+from/.test(content)) {
    return null;
  }

  // export { foo, bar } or export { foo as bar }
  const namedExportMatches = content.matchAll(/export\s*\{([^}]+)\}/g);
  for (const match of namedExportMatches) {
    const names = match[1].split(',').map(n => {
      const asMatch = n.trim().match(/(\w+)\s+as\s+(\w+)/);
      return asMatch ? asMatch[2] : n.trim().split(/\s/)[0];
    });
    for (const n of names.filter(Boolean)) exports.add(n);
  }

  // export function/const/class/type/interface name
  const declMatches = content.matchAll(/export\s+(?:async\s+)?(?:function|const|let|var|class|type|interface|enum)\s+(\w+)/g);
  for (const match of declMatches) {
    exports.add(match[1]);
  }

  // export default
  if (/export\s+default\s/.test(content)) {
    exports.add('default');
  }

  return exports;
}

function findPlatformPairs(): { dir: string; baseName: string; webFile: string; nativeFile: string }[] {
  const webFiles: string[] = [];
  walkDir(ROOT, (file) => {
    if (file.match(/\.web\.(ts|tsx)$/)) webFiles.push(relative(ROOT, file));
  });

  const pairs: { dir: string; baseName: string; webFile: string; nativeFile: string }[] = [];
  const seen = new Set<string>();

  for (const webFile of webFiles) {
    const dir = dirname(webFile);
    const fileName = basename(webFile);
    const baseName = fileName.replace(/\.web\.(ts|tsx)$/, '');
    const ext = fileName.match(/\.(ts|tsx)$/)?.[0] ?? '.ts';
    const nativeFile = `${dir}/${baseName}.native${ext}`;
    const key = `${dir}/${baseName}`;

    if (existsSync(join(ROOT, nativeFile)) && !seen.has(key)) {
      seen.add(key);
      pairs.push({ dir, baseName, webFile, nativeFile });
    }
  }
  return pairs;
}

function main() {
  const pairs = findPlatformPairs();
  let hasErrors = false;
  let skipped = 0;

  console.log(`Checking ${pairs.length} platform-specific modules...\n`);

  for (const { dir, baseName, webFile, nativeFile } of pairs) {
    const webExports = getExportedNames(join(ROOT, webFile));
    const nativeExports = getExportedNames(join(ROOT, nativeFile));

    if (!webExports || !nativeExports) {
      skipped++;
      continue;
    }

    const missingInNative = [...webExports].filter(e => !nativeExports.has(e));
    const missingInWeb = [...nativeExports].filter(e => !webExports.has(e));

    if (missingInNative.length || missingInWeb.length) {
      hasErrors = true;
      console.log(`${dir}/${baseName}:`);
      for (const e of missingInNative) console.log(`  "${e}" missing in native`);
      for (const e of missingInWeb) console.log(`  "${e}" missing in web`);
      console.log('');
    }
  }

  if (hasErrors) {
    process.exit(1);
  } else {
    console.log(`All platform exports match!${skipped ? ` (${skipped} skipped due to wildcard re-exports)` : ''}`);
  }
}

main();
