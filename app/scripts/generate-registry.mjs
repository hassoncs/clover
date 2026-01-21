#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, watch as fsWatch, readdirSync, statSync, mkdirSync, chmodSync } from 'fs';
import { resolve, relative, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

const args = process.argv.slice(2);
const watchMode = args.includes('--watch');
const checkMode = args.includes('--check');

const REGISTRY_CONFIG = [
  {
    name: 'examples',
    sourceDir: 'app/examples',
    outputFile: 'lib/registry/generated/examples.ts',
    metaType: 'ExampleMeta',
    entryType: 'ExampleEntry',
    idType: 'ExampleId',
    hrefPrefix: '/examples',
    importPrefix: '@/app/examples',
    moduleType: 'component',
    extensions: ['.tsx'],
    exclude: ['_layout.tsx', '_registry.ts', '*.test.tsx'],
  },
  {
    name: 'testGames',
    sourceDir: 'lib/test-games/games',
    outputFile: 'lib/registry/generated/testGames.ts',
    metaType: 'TestGameMeta',
    entryType: 'TestGameEntry',
    idType: 'TestGameId',
    hrefPrefix: '/test-games',
    importPrefix: '@/lib/test-games/games',
    moduleType: 'data',
    dataType: 'GameDefinition',
    dataTypeImport: 'import type { GameDefinition } from "@clover/shared";',
    extensions: ['.ts'],
    exclude: ['*.test.ts', 'index.ts'],
  },
];

function ensureDir(filePath) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function computeSourceHash(files) {
  const hash = createHash('sha256');
  for (const file of files.sort()) {
    const content = readFileSync(file, 'utf-8');
    hash.update(file + '\n' + content);
  }
  return hash.digest('hex').slice(0, 16);
}

function extractHashFromGenerated(filePath) {
  if (!existsSync(filePath)) return null;
  const content = readFileSync(filePath, 'utf-8');
  const match = content.match(/\/\/ @generated-hash: ([a-f0-9]+)/);
  return match ? match[1] : null;
}

function scanDirectory(dir, extensions, exclude) {
  const results = [];
  
  function scan(currentDir) {
    if (!existsSync(currentDir)) return;
    
    const entries = readdirSync(currentDir);
    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const relativePath = relative(dir, fullPath);
      
      if (exclude.some(pattern => {
        if (pattern.startsWith('*')) {
          return entry.endsWith(pattern.slice(1));
        }
        return entry === pattern || relativePath === pattern;
      })) {
        continue;
      }
      
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        scan(fullPath);
      } else if (extensions.some(ext => entry.endsWith(ext))) {
        results.push(fullPath);
      }
    }
  }
  
  scan(dir);
  return results.sort();
}

function extractMetadata(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  
  if (!content.includes('export const metadata')) {
    return null;
  }
  
  const metaMatch = content.match(/export\s+const\s+metadata\s*(?::\s*\w+)?\s*=\s*(\{[\s\S]*?\});/);
  if (!metaMatch) return null;
  
  try {
    const metaStr = metaMatch[1]
      .replace(/(\w+):/g, '"$1":')
      .replace(/'/g, '"')
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']');
    return JSON.parse(metaStr);
  } catch {
    return { _raw: true };
  }
}

function generateId(filePath, sourceDir) {
  const rel = relative(sourceDir, filePath);
  const withoutExt = rel.replace(/\.(tsx?|jsx?)$/, '');
  return withoutExt.replace(/[\/\\]/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
}

function generateHref(filePath, sourceDir, hrefPrefix) {
  const rel = relative(sourceDir, filePath);
  const withoutExt = rel.replace(/\.(tsx?|jsx?)$/, '');
  return `${hrefPrefix}/${withoutExt}`;
}

function generateComponentRegistry(config, files, fullSourceDir) {
  const { name, metaType, entryType, idType, hrefPrefix, importPrefix } = config;
  
  const entries = [];
  const ids = [];
  
  for (const filePath of files) {
    const meta = extractMetadata(filePath);
    if (!meta) continue;
    
    const id = generateId(filePath, fullSourceDir);
    const href = generateHref(filePath, fullSourceDir, hrefPrefix);
    const relPath = relative(fullSourceDir, filePath).replace(/\.(tsx?|jsx?)$/, '').replace(/\\/g, '/');
    const importPath = `${importPrefix}/${relPath}`;
    
    ids.push(id);
    entries.push({ id, href, meta, importPath });
  }
  
  const idUnion = ids.map(id => `"${id}"`).join(' | ');
  
  const metaImports = entries.map((e, i) => 
    `import { metadata as meta_${i} } from "${e.importPath}";`
  ).join('\n');
  
  const loaderEntries = entries.map((e) => 
    `  "${e.id}": () => import("${e.importPath}"),`
  ).join('\n');
  
  const lazyEntries = entries.map(e => 
    `  "${e.id}": lazy(loaders["${e.id}"]),`
  ).join('\n');
  
  const registryEntries = entries.map((e, i) => 
    `  { id: "${e.id}" as const, href: "${e.href}", meta: meta_${i} },`
  ).join('\n');

  const singularName = name.replace(/s$/, '');
  const capitalizedSingular = singularName.charAt(0).toUpperCase() + singularName.slice(1);
  const sourceHash = computeSourceHash(files);
  
  const output = `// AUTO-GENERATED FILE - DO NOT EDIT
// Generated by scripts/generate-registry.mjs
// Run "pnpm generate:registry" to regenerate
// @generated-hash: ${sourceHash}

import { lazy, type ComponentType } from "react";
import type { ${entryType}, ${metaType}, LazyComponent } from "../types";

${metaImports}

// ============================================================================
// Type-safe ID union
// ============================================================================

export type ${idType} = ${idUnion || 'never'};

// ============================================================================
// Static registry for lists/menus (no dynamic imports triggered)
// ============================================================================

export const ${name.toUpperCase()}: ReadonlyArray<${entryType} & { id: ${idType} }> = [
${registryEntries}
];

export const ${name.toUpperCase()}_BY_ID = Object.fromEntries(
  ${name.toUpperCase()}.map(entry => [entry.id, entry])
) as Record<${idType}, ${entryType} & { id: ${idType} }>;

// ============================================================================
// Lazy loaders (Metro-compatible dynamic imports)
// ============================================================================

const loaders: Record<${idType}, () => Promise<{ default: ComponentType<unknown> }>> = {
${loaderEntries}
};

const lazyComponents: Record<${idType}, LazyComponent> = {
${lazyEntries}
};

export function get${capitalizedSingular}Component(id: ${idType}): LazyComponent {
  const component = lazyComponents[id];
  if (!component) {
    throw new Error(\`Unknown ${singularName} id: \${id}. Available: \${Object.keys(lazyComponents).join(", ")}\`);
  }
  return component;
}

export async function load${capitalizedSingular}(id: ${idType}): Promise<ComponentType<unknown>> {
  const loader = loaders[id];
  if (!loader) {
    throw new Error(\`Unknown ${singularName} id: \${id}\`);
  }
  const module = await loader();
  return module.default;
}
`;

  return { output, count: entries.length };
}

function generateDataRegistry(config, files, fullSourceDir) {
  const { name, metaType, entryType, idType, hrefPrefix, importPrefix, dataType, dataTypeImport } = config;
  
  const entries = [];
  const ids = [];
  
  for (const filePath of files) {
    const meta = extractMetadata(filePath);
    if (!meta) continue;
    
    const id = generateId(filePath, fullSourceDir);
    const href = generateHref(filePath, fullSourceDir, hrefPrefix);
    const relPath = relative(fullSourceDir, filePath).replace(/\.(tsx?|jsx?)$/, '').replace(/\\/g, '/');
    const importPath = `${importPrefix}/${relPath}`;
    
    ids.push(id);
    entries.push({ id, href, meta, importPath });
  }
  
  const idUnion = ids.map(id => `"${id}"`).join(' | ');
  
  const metaImports = entries.map((e, i) => 
    `import { metadata as meta_${i} } from "${e.importPath}";`
  ).join('\n');
  
  const loaderEntries = entries.map((e) => 
    `  "${e.id}": () => import("${e.importPath}"),`
  ).join('\n');
  
  const registryEntries = entries.map((e, i) => 
    `  { id: "${e.id}" as const, href: "${e.href}", meta: meta_${i} },`
  ).join('\n');

  const singularName = name.replace(/s$/, '').replace(/([A-Z])/g, ' $1').trim().replace(/ /g, '');
  const capitalizedSingular = singularName.charAt(0).toUpperCase() + singularName.slice(1);
  const sourceHash = computeSourceHash(files);
  
  const output = `// AUTO-GENERATED FILE - DO NOT EDIT
// Generated by scripts/generate-registry.mjs
// Run "pnpm generate:registry" to regenerate
// @generated-hash: ${sourceHash}

${dataTypeImport}
import type { ${entryType}, ${metaType} } from "../types";

${metaImports}

// ============================================================================
// Type-safe ID union
// ============================================================================

export type ${idType} = ${idUnion || 'never'};

// ============================================================================
// Static registry for lists/menus (no dynamic imports triggered)
// ============================================================================

export const ${name.toUpperCase()}: ReadonlyArray<${entryType} & { id: ${idType} }> = [
${registryEntries}
];

export const ${name.toUpperCase()}_BY_ID = Object.fromEntries(
  ${name.toUpperCase()}.map(entry => [entry.id, entry])
) as Record<${idType}, ${entryType} & { id: ${idType} }>;

// ============================================================================
// Data loaders (async import for data modules)
// ============================================================================

const loaders: Record<${idType}, () => Promise<{ default: ${dataType} }>> = {
${loaderEntries}
};

export async function load${capitalizedSingular}(id: ${idType}): Promise<${dataType}> {
  const loader = loaders[id];
  if (!loader) {
    throw new Error(\`Unknown ${singularName} id: \${id}. Available: \${Object.keys(loaders).join(", ")}\`);
  }
  const module = await loader();
  return module.default;
}

export async function loadAll${name.charAt(0).toUpperCase() + name.slice(1)}(): Promise<Array<{ id: ${idType}; data: ${dataType} }>> {
  const results = await Promise.all(
    ${name.toUpperCase()}.map(async (entry) => ({
      id: entry.id,
      data: await load${capitalizedSingular}(entry.id),
    }))
  );
  return results;
}
`;

  return { output, count: entries.length };
}

function generateRegistry(config, options = {}) {
  const { name, sourceDir, outputFile, extensions, exclude, moduleType } = config;
  const { dryRun = false } = options;

  const fullSourceDir = resolve(ROOT, sourceDir);
  const fullOutputFile = resolve(ROOT, outputFile);

  const files = scanDirectory(fullSourceDir, extensions, exclude);
  
  if (files.length === 0) {
    console.log(`[${name}] No files found in ${sourceDir}`);
    return { count: 0, stale: false };
  }

  let result;
  if (moduleType === 'component') {
    result = generateComponentRegistry(config, files, fullSourceDir);
  } else if (moduleType === 'data') {
    result = generateDataRegistry(config, files, fullSourceDir);
  } else {
    console.log(`[${name}] Unknown moduleType: ${moduleType}`);
    return { count: 0, stale: false };
  }

  const newHashMatch = result.output.match(/\/\/ @generated-hash: ([a-f0-9]+)/);
  const newHash = newHashMatch ? newHashMatch[1] : null;
  const existingHash = extractHashFromGenerated(fullOutputFile);
  const isStale = newHash !== existingHash;

  if (dryRun) {
    return { count: result.count, stale: isStale, newHash, existingHash };
  }

  ensureDir(fullOutputFile);
  
  if (existsSync(fullOutputFile)) {
    chmodSync(fullOutputFile, 0o644);
  }
  writeFileSync(fullOutputFile, result.output);
  chmodSync(fullOutputFile, 0o444);
  
  console.log(`[${name}] Generated ${outputFile} with ${result.count} entries (read-only)`);
  
  return { count: result.count, stale: false };
}

function generateAll(options = {}) {
  const results = [];
  
  for (const config of REGISTRY_CONFIG) {
    const result = generateRegistry(config, options);
    results.push({ name: config.name, outputFile: config.outputFile, ...result });
  }
  
  return results;
}

function main() {
  console.log('Registry Generator');
  console.log('==================');
  
  if (checkMode) {
    console.log('Running in --check mode (verifying generated files are up-to-date)\n');
    const results = generateAll({ dryRun: true });
    
    let hasStale = false;
    for (const r of results) {
      if (r.stale) {
        hasStale = true;
        console.log(`❌ [${r.name}] ${r.outputFile} is STALE`);
        console.log(`   Expected hash: ${r.newHash}`);
        console.log(`   Current hash:  ${r.existingHash || '(missing)'}`);
      } else {
        console.log(`✓ [${r.name}] ${r.outputFile} is up-to-date`);
      }
    }
    
    if (hasStale) {
      console.log('\n⚠️  Generated files are out of sync. Run "pnpm generate:registry" to fix.');
      process.exit(1);
    } else {
      console.log('\n✓ All generated files are up-to-date.');
      process.exit(0);
    }
  }
  
  generateAll();
  
  if (watchMode) {
    console.log('\nWatch mode enabled. Watching for changes...');
    
    for (const config of REGISTRY_CONFIG) {
      const fullSourceDir = resolve(ROOT, config.sourceDir);
      
      console.log(`Watching: ${fullSourceDir}`);
      
      let debounceTimer = null;
      fsWatch(fullSourceDir, { recursive: true }, (eventType, filename) => {
        if (!filename) return;
        if (filename.includes('_registry') || filename.includes('generated')) return;
        
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          console.log(`\n[${config.name}] Change detected: ${filename}`);
          generateRegistry(config);
        }, 100);
      });
    }
  }
}

main();
