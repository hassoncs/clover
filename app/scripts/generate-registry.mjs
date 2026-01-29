#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, watch as fsWatch, readdirSync, statSync, mkdirSync, chmodSync } from 'fs';
import { resolve, relative, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const SHARED_ROOT = resolve(__dirname, '../../shared');

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
    jsonOutputFile: '../../api/dev-test-games.json',
    metaType: 'TestGameMeta',
    entryType: 'TestGameEntry',
    idType: 'TestGameId',
    hrefPrefix: '/test-games',
    importPrefix: '@/lib/test-games/games',
    moduleType: 'data',
    dataType: 'GameDefinition',
    dataTypeImport: 'import type { GameDefinition } from "@slopcade/shared";',
    extensions: ['.ts'],
    exclude: ['*.test.ts', 'index.ts'],
    supportBundles: true,
  },
];

// Bundle detection and compilation
const BUNDLE_SUBDIR = '.bundle';

function isBundleDirectory(dirPath) {
  if (!existsSync(dirPath) || !statSync(dirPath).isDirectory()) {
    return false;
  }
  const bundlePath = join(dirPath, BUNDLE_SUBDIR);
  return existsSync(bundlePath) && statSync(bundlePath).isDirectory();
}

// Simplified bundle compiler functions (inline from shared/src/bundle/compiler.ts)
function readJsonFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    return { data };
  } catch (error) {
    return { data: null, error: { message: error.message, code: 'JSON_PARSE_ERROR' } };
  }
}

function scanForJsonFiles(dir, files = []) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      scanForJsonFiles(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }
  return files;
}

function isConstantRef(value) {
  return (
    typeof value === 'object' &&
    value !== null &&
    'const' in value &&
    typeof value.const === 'string'
  );
}

function resolveConstantRefs(obj, constants) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => resolveConstantRefs(item, constants));
  }

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isConstantRef(value)) {
      const constName = value.const;
      if (constants && constants[constName] !== undefined) {
        result[key] = constants[constName];
      } else {
        // Keep the original if constant not found
        result[key] = value;
      }
    } else {
      result[key] = resolveConstantRefs(value, constants);
    }
  }
  return result;
}

function resolveAssetRefs(obj, assets) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => resolveAssetRefs(item, assets));
  }

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    // Handle visual property specially
    if (key === 'visual' && value !== null && typeof value === 'object') {
      const visual = { ...value };

      // Resolve asset reference to imageUrl (only for image visuals)
      if (visual.type === 'image' && visual.asset) {
        const assetId = visual.asset;
        if (assets && assets[assetId] && assets[assetId].path) {
          visual.imageUrl = assets[assetId].path;
        }
        // Remove the asset property after resolution
        delete visual.asset;
      }

      // Rename width/height to imageWidth/imageHeight (only for image visuals)
      if (visual.type === 'image') {
        if (visual.width !== undefined) {
          visual.imageWidth = visual.width;
          delete visual.width;
        }
        if (visual.height !== undefined) {
          visual.imageHeight = visual.height;
          delete visual.height;
        }
      }

      result[key] = resolveAssetRefs(visual, assets);
    } else {
      result[key] = resolveAssetRefs(value, assets);
    }
  }
  return result;
}

function compileBundle(bundlePath) {
  const errors = [];
  const warnings = [];
  const processedFiles = [];

  const rawData = {
    manifest: null,
    constants: null,
    editor: null,
    assets: null,
    templates: [],
    entities: [],
    rules: [],
  };

  if (!existsSync(bundlePath)) {
    errors.push({ code: 'MISSING_FILE', message: `Bundle directory does not exist: ${bundlePath}` });
    return { success: false, gameDefinition: null, errors, warnings, rawData, processedFiles };
  }

  const bundleStat = statSync(bundlePath);
  if (!bundleStat.isDirectory()) {
    errors.push({ code: 'INVALID_BUNDLE', message: `Bundle path is not a directory: ${bundlePath}` });
    return { success: false, gameDefinition: null, errors, warnings, rawData, processedFiles };
  }

  const jsonFiles = scanForJsonFiles(bundlePath);

  for (const filePath of jsonFiles) {
    const relativePath = relative(bundlePath, filePath);
    const result = readJsonFile(filePath);

    if (result.error) {
      errors.push({ ...result.error, file: relativePath });
      continue;
    }

    processedFiles.push(relativePath);
    const data = result.data;

    if (relativePath === 'manifest.json') {
      rawData.manifest = data;
    } else if (relativePath === 'constants.json' && typeof data === 'object') {
      rawData.constants = data;
    } else if (relativePath === 'assets.json' && typeof data === 'object') {
      rawData.assets = data;
    } else if (relativePath.startsWith('templates')) {
      rawData.templates.push(Array.isArray(data) ? data : [data]);
    } else if (relativePath.startsWith('entities')) {
      rawData.entities.push(Array.isArray(data) ? data : [data]);
    } else if (relativePath.startsWith('rules')) {
      rawData.rules.push(Array.isArray(data) ? data : [data]);
    }
  }

  if (!rawData.manifest) {
    errors.push({ code: 'MISSING_MANIFEST', message: 'Bundle must contain manifest.json' });
  }

  // Resolve constant references in templates, entities, rules, and manifest
  const constants = rawData.constants || {};
  const resolvedTemplates = rawData.templates.flat().map(t => resolveConstantRefs(t, constants));
  const resolvedEntities = rawData.entities.flat().map(e => resolveConstantRefs(e, constants));
  const resolvedRules = rawData.rules.flat().map(r => resolveConstantRefs(r, constants));
  const resolvedManifest = resolveConstantRefs(rawData.manifest || {}, constants);

  // Resolve asset references in templates, entities, and rules
  const assets = rawData.assets || {};
  const assetResolvedTemplates = resolvedTemplates.map(t => resolveAssetRefs(t, assets));
  const assetResolvedEntities = resolvedEntities.map(e => resolveAssetRefs(e, assets));
  const assetResolvedRules = resolvedRules.map(r => resolveAssetRefs(r, assets));

  // Flatten templates into object by ID
  const templates = assetResolvedTemplates.reduce((acc, t) => {
    if (t && t.id) acc[t.id] = t;
    return acc;
  }, {});

  // Build simplified game definition
  const manifest = resolvedManifest;
  const metadata = {
    id: manifest.name || 'unnamed-game',
    title: manifest.title || manifest.name || 'Untitled Game',
    description: manifest.description,
    version: manifest.version || '1.0.0',
  };

  const gameDefinition = {
    metadata,
    world: manifest.world || { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
    camera: manifest.camera,
    ui: manifest.ui,
    templates,
    entities: assetResolvedEntities,
    rules: assetResolvedRules,
    winCondition: manifest.winCondition,
    loseCondition: manifest.loseCondition,
    initialLives: manifest.initialLives,
    initialScore: manifest.initialScore,
  };

  return {
    success: errors.length === 0,
    gameDefinition,
    errors,
    warnings,
    rawData,
    processedFiles,
  };
}

function extractBundleMetadata(rawData) {
  const manifest = rawData.manifest || {};
  return {
    title: manifest.title || manifest.name || 'Untitled Game',
    description: manifest.description,
    status: manifest.status || 'active',
    category: manifest.category,
    tags: manifest.tags,
    author: manifest.author,
    players: manifest.players,
    thumbnailUrl: manifest.thumbnailUrl,
    titleHeroImageUrl: manifest.titleHeroImageUrl,
  };
}

function scanForGames(sourceDir, extensions, exclude) {
  const gameEntries = [];

  function scan(currentDir) {
    if (!existsSync(currentDir)) return;

    const entries = readdirSync(currentDir);
    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const relativePath = relative(sourceDir, fullPath);

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
        if (isBundleDirectory(fullPath)) {
          gameEntries.push({
            type: 'bundle',
            path: fullPath,
            bundlePath: join(fullPath, BUNDLE_SUBDIR),
            id: entry.replace(/[^a-zA-Z0-9_]/g, ''),
          });
        } else {
          scan(fullPath);
        }
      } else if (extensions.some(ext => entry.endsWith(ext)) && entry === 'game.ts') {
        gameEntries.push({
          type: 'file',
          path: fullPath,
          id: null,
        });
      }
    }
  }

  scan(sourceDir);
  return gameEntries.sort((a, b) => a.path.localeCompare(b.path));
}

function ensureDir(filePath) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function computeSourceHash(files) {
  const hash = createHash('sha256');
  for (const file of files.sort()) {
    const stat = statSync(file);
    if (stat.isDirectory()) {
      // For directories (bundles), compute hash from all JSON files inside
      const jsonFiles = scanForJsonFiles(file);
      for (const jsonFile of jsonFiles.sort()) {
        const content = readFileSync(jsonFile, 'utf-8');
        hash.update(jsonFile + '\n' + content);
      }
    } else {
      const content = readFileSync(file, 'utf-8');
      hash.update(file + '\n' + content);
    }
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
  
  // If the file is named 'game' (from game.ts), use the parent folder name as ID
  const parts = withoutExt.split(/[\/\\]/);
  if (parts.length > 1 && parts[parts.length - 1] === 'game') {
    // Use the parent folder name
    return parts[parts.length - 2].replace(/[^a-zA-Z0-9_]/g, '');
  }
  
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

  return { output, count: entries.length, entries };
}

function generateDataRegistry(config, gameEntries, fullSourceDir) {
  const { name, metaType, entryType, idType, hrefPrefix, importPrefix, dataType, dataTypeImport, supportBundles } = config;

  const entries = [];
  const ids = [];

  // Process all game entries and compile bundles
  for (const entry of gameEntries) {
    if (entry.type === 'bundle') {
      const result = compileBundle(entry.bundlePath);
      if (result.success && result.gameDefinition) {
        const metadata = extractBundleMetadata(result.rawData);
        const id = entry.id;

        ids.push(id);
        entries.push({
          id,
          href: `${hrefPrefix}/${entry.id}`,
          meta: metadata,
          importPath: null,
          type: 'bundle',
          gameDefinition: result.gameDefinition,
        });
      } else {
        const errorMessages = result.errors?.map(e => e.message).join('; ') || 'Unknown error';
        console.error(`[${name}] Failed to compile bundle at ${entry.bundlePath}: ${errorMessages}`);
      }
    } else {
      // File-based game (game.ts)
      const meta = extractMetadata(entry.path);
      if (!meta) continue;

      const rel = relative(fullSourceDir, entry.path);
      const parts = rel.split(/[\/\\]/);
      let id;
      if (parts.length > 1) {
        id = parts[parts.length - 2].replace(/[^a-zA-Z0-9_]/g, '');
      } else {
        id = 'game';
      }

      const href = `${hrefPrefix}/${id}`;
      const relPath = relative(fullSourceDir, entry.path).replace(/\.(tsx?|jsx?)$/, '').replace(/\\/g, '/');
      const importPath = `${importPrefix}/${relPath}`;

      ids.push(id);
      entries.push({ id, href, meta, importPath, type: 'file' });
    }
  }

  // Sort entries by ID to ensure consistent ordering
  entries.sort((a, b) => a.id.localeCompare(b.id));
  ids.sort();

  const idUnion = ids.map(id => `"${id}"`).join(' | ');

  // Generate metadata in sorted order - both imports and bundle metadata objects
  const allMetaDefinitions = [];
  const importStatements = [];
  const bundleMetaStatements = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry.type === 'file') {
      importStatements.push(`import { metadata as meta_${i} } from "${entry.importPath}";`);
    } else {
      bundleMetaStatements.push(`const meta_${i} = ${JSON.stringify(entry.meta, null, 2)};`);
    }
  }

  const metaImports = importStatements.join('\n');
  const bundleMetaObjects = bundleMetaStatements.join('\n');

  // Generate loader entries for both types
  const loaderEntries = entries.map((e) => {
    if (e.type === 'bundle') {
      return `  "${e.id}": () => Promise.resolve({ default: ${JSON.stringify(e.gameDefinition)} }),`;
    } else {
      return `  "${e.id}": () => import("${e.importPath}"),`;
    }
  }).join('\n');

  // Generate registry entries using sorted indices
  const registryEntries = entries.map((e, i) => {
    return `  { id: "${e.id}" as const, href: "${e.href}", meta: meta_${i} },`;
  }).join('\n');

  const singularName = name.replace(/s$/, '').replace(/([A-Z])/g, ' $1').trim().replace(/ /g, '');
  const capitalizedSingular = singularName.charAt(0).toUpperCase() + singularName.slice(1);

  // Compute hash including both files and bundle contents
  const filePaths = gameEntries.filter(e => e.type === 'file').map(e => e.path);
  const bundlePaths = gameEntries.filter(e => e.type === 'bundle').map(e => e.bundlePath);
  const allPaths = [...filePaths, ...bundlePaths];
  const sourceHash = computeSourceHash(allPaths);

  const output = `// AUTO-GENERATED FILE - DO NOT EDIT
 // Generated by scripts/generate-registry.mjs
 // Run "pnpm generate:registry" to regenerate
 // @generated-hash: ${sourceHash}

 ${dataTypeImport}
 import type { ${entryType}, ${metaType} } from "../types";

 ${metaImports}
 ${bundleMetaObjects}

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
 // Data loaders (async import for data modules, direct resolve for bundles)
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

  return { output, count: entries.length, entries };
}

function generateRegistry(config, options = {}) {
  const { name, sourceDir, outputFile, extensions, exclude, moduleType, supportBundles } = config;
  const { dryRun = false } = options;

  const fullSourceDir = resolve(ROOT, sourceDir);
  const fullOutputFile = resolve(ROOT, outputFile);

  let files, gameEntries;

  if (supportBundles && moduleType === 'data') {
    // Use new bundle-aware scanner for data modules that support bundles
    gameEntries = scanForGames(fullSourceDir, extensions, exclude);
    if (gameEntries.length === 0) {
      console.log(`[${name}] No games found in ${sourceDir}`);
      return { count: 0, stale: false };
    }
  } else {
    // Use original file-based scanner for other modules
    files = scanDirectory(fullSourceDir, extensions, exclude);
    if (files.length === 0) {
      console.log(`[${name}] No files found in ${sourceDir}`);
      return { count: 0, stale: false };
    }
  }

  let result;
  if (moduleType === 'component') {
    result = generateComponentRegistry(config, files, fullSourceDir);
  } else if (moduleType === 'data') {
    if (supportBundles) {
      result = generateDataRegistry(config, gameEntries, fullSourceDir);
    } else {
      result = generateDataRegistry(config, files, fullSourceDir);
    }
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

  return { count: result.count, stale: false, entries: result.entries };
}

async function generateJsonOutput(config, entries) {
  if (!config.jsonOutputFile || entries.length === 0) {
    return;
  }

  const { execSync } = await import('child_process');
  
  try {
    execSync(
      'npx tsx scripts/export-test-games-for-api.ts',
      { encoding: 'utf-8', cwd: ROOT, stdio: 'inherit' }
    );
  } catch (err) {
    console.error(`[${config.name}] Failed to generate JSON output: ${err.message}`);
  }
}

async function generateAll(options = {}) {
  const results = [];

  for (const config of REGISTRY_CONFIG) {
    const result = generateRegistry(config, options);
    results.push({ name: config.name, outputFile: config.outputFile, ...result });

    // Generate JSON output for data modules (after TS generation)
    if (!options.dryRun && config.jsonOutputFile && result.entries) {
      await generateJsonOutput(config, result.entries);
    }
  }

  return results;
}

async function main() {
  console.log('Registry Generator');
  console.log('==================');

  if (checkMode) {
    console.log('Running in --check mode (verifying generated files are up-to-date)\n');
    const results = await generateAll({ dryRun: true });

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

  await generateAll();
  
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
