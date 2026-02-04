import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  BundleCompileResult,
  CompileError,
  CompileWarning,
  EditorMetadata,
  RawBundleData,
  ConstantRef,
} from './types';
import type {
  GameDefinition,
  GameMetadata,
  Match3Config,
  TetrisConfig,
  ContainerConfig,
  EntityTemplate,
  GameRule,
} from '@slopcade/shared';
import { FileReader, NodeFileReader } from './FileReader';

function isConstantRef(value: unknown): value is ConstantRef {
  return (
    typeof value === 'object' &&
    value !== null &&
    'const' in value &&
    typeof (value as ConstantRef).const === 'string'
  );
}

const BUNDLE_SUBDIRS = ['templates', 'entities', 'rules'] as const;

interface ResolvedConstant {
  value: number | string | boolean;
  path: string[];
}

function scanForJsonFiles(dir: string, fileReader: FileReader, files: string[] = []): string[] {
  const entries = fileReader.readdirSync(dir);

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanForJsonFiles(fullPath, fileReader, files);
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }

  return files;
}

function scanForScriptFiles(dir: string, fileReader: FileReader, warnings: CompileWarning[]): string[] {
  const scriptsDir = path.join(dir, 'scripts');
  
  if (!fileReader.existsSync(scriptsDir)) {
    return [];
  }

  const stat = fileReader.statSync(scriptsDir);
  if (!stat.isDirectory()) {
    return [];
  }

  const entries = fileReader.readdirSync(scriptsDir);
  const scriptFiles: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      warnings.push({
        code: 'NESTED_SCRIPTS_IGNORED',
        message: `Nested script directories are not supported: scripts/${entry.name}`,
        file: `scripts/${entry.name}`,
      });
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.js')) {
      scriptFiles.push(path.join(scriptsDir, entry.name));
    }
  }

  // Sort alphabetically by basename
  return scriptFiles.sort((a, b) => {
    const baseA = path.basename(a);
    const baseB = path.basename(b);
    return baseA.localeCompare(baseB);
  });
}

function scanForAssetFiles(dir: string, fileReader: FileReader): string[] {
  const assetsDir = path.join(dir, 'assets');
  
  if (!fileReader.existsSync(assetsDir)) {
    return [];
  }

  const stat = fileReader.statSync(assetsDir);
  if (!stat.isDirectory()) {
    return [];
  }

  const assetExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp3', '.wav', '.ogg'];
  const assetFiles: string[] = [];

  function scanDirectory(currentDir: string): void {
    const entries = fileReader.readdirSync(currentDir);
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (assetExtensions.includes(ext)) {
          const relativePath = path.relative(assetsDir, fullPath);
          assetFiles.push(relativePath);
        }
      }
    }
  }

  scanDirectory(assetsDir);
  return assetFiles.sort();
}

function readJsonFile(filePath: string, fileReader: FileReader): { data: unknown; error?: CompileError } | null {
  try {
    const content = fileReader.readFileSync(filePath);
    const data = JSON.parse(content);
    return { data };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {
        data: null,
        error: {
          code: 'INVALID_JSON',
          message: `Invalid JSON in file: ${filePath}`,
          file: filePath,
          context: { parseError: (error as Error).message },
        },
      };
    }
    return {
      data: null,
      error: {
        code: 'MISSING_FILE',
        message: `Failed to read file: ${filePath}`,
        file: filePath,
        context: { error: (error as Error).message },
      },
    };
  }
}

function readScriptFile(filePath: string, fileReader: FileReader): { content: string; error?: CompileError } {
  try {
    const content = fileReader.readFileSync(filePath);
    
    const exportsPattern = /exports\.\w+\s*=/;
    if (!exportsPattern.test(content)) {
      return {
        content: '',
        error: {
          code: 'SCRIPT_SYNTAX_ERROR',
          message: `Script file must contain at least one export (exports.name = ...)`,
          file: filePath,
          context: { reason: 'missing_exports' },
        },
      };
    }

    const topLevelReturnPattern = /^\s*return\s/m;
    if (topLevelReturnPattern.test(content)) {
      return {
        content: '',
        error: {
          code: 'SCRIPT_SYNTAX_ERROR',
          message: `Script file contains top-level return statement`,
          file: filePath,
          context: { reason: 'top_level_return' },
        },
      };
    }

    return { content };
  } catch (error) {
    return {
      content: '',
      error: {
        code: 'MISSING_FILE',
        message: `Failed to read script file: ${filePath}`,
        file: filePath,
        context: { error: (error as Error).message },
      },
    };
  }
}

function normalizeToArray(data: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(data)) {
    return data.filter(item => typeof item === 'object' && item !== null) as Array<Record<string, unknown>>;
  }
  if (typeof data === 'object' && data !== null) {
    return [data as Record<string, unknown>];
  }
  return [];
}

function findConstantRefs(obj: unknown, found: Set<string> = new Set()): Set<string> {
  if (obj === null || typeof obj !== 'object') {
    return found;
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      findConstantRefs(item, found);
    }
    return found;
  }

  const record = obj as Record<string, unknown>;

  if ('const' in record && typeof record.const === 'string') {
    found.add(record.const);
    return found;
  }

  for (const value of Object.values(record)) {
    findConstantRefs(value, found);
  }

  return found;
}

function findSimilarKeys(target: string, keys: string[]): string[] {
  const threshold = 3;
  return keys.filter(key => {
    if (key === target) return false;
    const distance = levenshteinDistance(target, key);
    return distance <= threshold;
  }).slice(0, 3);
}

function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function checkDuplicateIds(
  items: Array<{ id?: string }>,
  category: 'templates' | 'entities' | 'rules',
  errors: CompileError[],
  file?: string
): void {
  const idCounts = new Map<string, string[]>();

  for (const item of items) {
    if (!item.id) continue;
    const existing = idCounts.get(item.id) || [];
    existing.push(file || 'unknown');
    idCounts.set(item.id, existing);
  }

  for (const [id, files] of Array.from(idCounts)) {
    if (files.length > 1) {
      errors.push({
        code: 'DUPLICATE_ID',
        message: `Duplicate ID "${id}" in ${category} (found in: ${files.join(', ')})`,
        file,
        path: `${category}.${id}`,
      });
    }
  }
}

function validateEntityTemplateRefs(
  entities: Array<Record<string, unknown>>,
  templates: Map<string, Record<string, unknown>>,
  errors: CompileError[]
): void {
  const templateIds = new Set(templates.keys());

  for (const entity of entities) {
    const entityId = (entity.id as string) || 'unknown';
    const templateRef = entity.template as string | undefined;

    if (templateRef && !templateIds.has(templateRef)) {
      const similar = findSimilarKeys(templateRef, Array.from(templateIds));
      errors.push({
        code: 'UNKNOWN_TEMPLATE',
        message: `Entity "${entityId}" references unknown template: "${templateRef}"`,
        path: `entities.${entityId}.template`,
        suggestions: similar.length > 0 ? [`Did you mean: ${similar.join(', ')}`] : undefined,
      });
    }
  }
}

function validateAssetRefs(
  items: Array<Record<string, unknown>>,
  assets: Set<string>,
  category: 'templates' | 'entities',
  errors: CompileError[]
): void {
  function checkObject(obj: unknown, currentPath: string[]): void {
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return;

    const record = obj as Record<string, unknown>;

    if ('asset' in record && typeof record.asset === 'string') {
      const assetId = record.asset;
      if (!assets.has(assetId)) {
        errors.push({
          code: 'UNKNOWN_ASSET',
          message: `Unknown asset reference: "${assetId}"`,
          path: [...currentPath, 'asset'].join('.'),
        });
      }
    }

    for (const [key, value] of Object.entries(record)) {
      checkObject(value, [...currentPath, key]);
    }
  }

  for (const item of items) {
    const itemId = (item.id as string) || 'unknown';
    checkObject(item, [category, itemId]);
  }
}

function resolveConstantRefs(
  obj: unknown,
  constants: Map<string, ResolvedConstant>,
  path: string[] = [],
  errors: CompileError[]
): unknown {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item, index) => resolveConstantRefs(item, constants, [...path, `[${index}]`], errors));
  }

  const record = obj as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    const currentPath = [...path, key];

    if (isConstantRef(value)) {
      const constName = value.const;
      const resolved = constants.get(constName);

      if (!resolved) {
        const similar = findSimilarKeys(constName, Array.from(constants.keys()));
        errors.push({
          code: 'UNKNOWN_CONSTANT',
          message: `Unknown constant reference: "${constName}"`,
          path: currentPath.join('.'),
          suggestions: similar.length > 0 ? [`Did you mean: ${similar.join(', ')}`] : undefined,
        });
        result[key] = value;
      } else {
        result[key] = resolved.value;
      }
    } else if (value !== null && typeof value === 'object') {
      result[key] = resolveConstantRefs(value, constants, currentPath, errors);
    } else {
      result[key] = value;
    }
  }

  return result;
}

function extractTemplates(
  templates: Array<Record<string, unknown>>
): Map<string, Record<string, unknown>> {
  const templateMap = new Map<string, Record<string, unknown>>();

  for (const template of templates) {
    const id = template.id as string;
    if (id) {
      templateMap.set(id, template);
    }
  }

  return templateMap;
}

function buildGameDefinition(
  manifest: Record<string, unknown> | null,
  rawConstants: Record<string, number | string | boolean> | null,
  templates: Map<string, Record<string, unknown>>,
  entities: Array<Record<string, unknown>>,
  rules: GameRule[],
  assets: Record<string, { path?: string; remoteUrl?: string; localPath?: string; type: string }> | null,
  systems: {
    match3?: Match3Config;
    containers?: ContainerConfig[];
    tetris?: TetrisConfig;
  } | null
): GameDefinition {
  const metadata: GameMetadata = {
    id: (manifest?.name as string) || 'unnamed-game',
    title: (manifest?.title as string) || (manifest?.name as string) || 'Untitled Game',
    description: manifest?.description as string | undefined,
    version: (manifest?.version as string) || '1.0.0',
  };

  const templateRecord: Record<string, EntityTemplate> = {};
  for (const [id, template] of Array.from(templates)) {
    templateRecord[id] = template as unknown as EntityTemplate;
  }

  // Build world config from manifest or use defaults
  const worldConfig = (manifest?.world as Record<string, unknown>) || {};
  const world: GameDefinition['world'] = {
    gravity: (worldConfig.gravity as { x: number; y: number }) || { x: 0, y: 10 },
    pixelsPerMeter: (worldConfig.pixelsPerMeter as number) || 50,
  };
  
  // Add bounds if specified
  if (worldConfig.bounds) {
    world.bounds = worldConfig.bounds as { width: number; height: number };
  }

  return {
    metadata,
    world,
    templates: templateRecord,
    entities: entities as unknown as GameDefinition['entities'],
    rules,
    constants: rawConstants || undefined,
    // Include system configs if provided
    ...(systems?.match3 && { match3: systems.match3 }),
    ...(systems?.containers && { containers: systems.containers }),
    ...(systems?.tetris && { tetris: systems.tetris }),
  };
}

export function compileBundle(
  bundlePath: string,
  options?: { fileReader?: FileReader }
): BundleCompileResult {
  const fileReader = options?.fileReader ?? new NodeFileReader();
  const errors: CompileError[] = [];
  const warnings: CompileWarning[] = [];
  const processedFiles: string[] = [];

  const rawData: RawBundleData = {
    manifest: null,
    constants: null,
    editor: null,
    assets: null,
    scripts: null,
    templates: [],
    entities: [],
    rules: [],
    schemas: undefined,
  };

  if (!fileReader.existsSync(bundlePath)) {
    errors.push({
      code: 'MISSING_FILE',
      message: `Bundle directory does not exist: ${bundlePath}`,
    });
    return {
      success: false,
      gameDefinition: null,
      editorMetadata: null,
      errors,
      warnings,
      rawData,
      processedFiles,
    };
  }

  const bundleStat = fileReader.statSync(bundlePath);
  if (!bundleStat.isDirectory()) {
    errors.push({
      code: 'INVALID_BUNDLE_STRUCTURE',
      message: `Bundle path is not a directory: ${bundlePath}`,
    });
    return {
      success: false,
      gameDefinition: null,
      editorMetadata: null,
      errors,
      warnings,
      rawData,
      processedFiles,
    };
  }

  const jsonFiles = scanForJsonFiles(bundlePath, fileReader);

  for (const filePath of jsonFiles) {
    const relativePath = path.relative(bundlePath, filePath);
    const result = readJsonFile(filePath, fileReader);

    if (!result) {
      errors.push({
        code: 'INVALID_JSON',
        message: `Failed to read JSON file: ${relativePath}`,
        file: relativePath,
      });
      continue;
    }

    if (result.error) {
      errors.push(result.error);
      continue;
    }

    processedFiles.push(relativePath);
    const data = result.data as Record<string, unknown>;

    if (relativePath === 'manifest.json') {
      rawData.manifest = data;
    } else if (relativePath === 'constants.json') {
      if (typeof data === 'object' && data !== null) {
        rawData.constants = data as Record<string, number | string | boolean>;
      }
    } else if (relativePath === 'editor.json') {
      if (typeof data === 'object' && data !== null) {
        rawData.editor = data as EditorMetadata;
      }
    } else if (relativePath === 'assets.json') {
      if (typeof data === 'object' && data !== null) {
        rawData.assets = data as Record<string, { path?: string; remoteUrl?: string; localPath?: string; type: string }>;
      }
    } else if (relativePath === 'scripts.json') {
      if (typeof data === 'object' && data !== null) {
        rawData.scripts = data as Record<string, string>;
      }
    } else if (relativePath.startsWith('templates')) {
      const items = normalizeToArray(data);
      rawData.templates.push(...items);
    } else if (relativePath.startsWith('entities')) {
      const items = normalizeToArray(data);
      rawData.entities.push(...items);
    } else if (relativePath.startsWith('rules')) {
      const items = normalizeToArray(data);
      rawData.rules.push(...items);
    }
  }

  const scriptFiles = scanForScriptFiles(bundlePath, fileReader, warnings);
  const scriptContents: Record<string, string> = {};
  const scriptParts: string[] = [];
  const exportTracker = new Map<string, string>();

  for (const scriptPath of scriptFiles) {
    const relativePath = path.relative(bundlePath, scriptPath);
    const basename = path.basename(scriptPath, '.js');
    const result = readScriptFile(scriptPath, fileReader);

    if (result.error) {
      errors.push(result.error);
      continue;
    }

    processedFiles.push(relativePath);
    scriptContents[basename] = result.content;

    const exportsInFile = result.content.match(/exports\.(\w+)\s*=/g) || [];
    for (const match of exportsInFile) {
      const exportName = match.match(/exports\.(\w+)/)?.[1];
      if (exportName) {
        const existingFile = exportTracker.get(exportName);
        if (existingFile) {
          warnings.push({
            code: 'DUPLICATE_EXPORT',
            message: `Export "${exportName}" defined in multiple files: ${existingFile}, ${basename}`,
            file: relativePath,
            context: { exportName, files: [existingFile, basename] },
          });
        }
        exportTracker.set(exportName, basename);
      }
    }

    scriptParts.push(`// --- ${basename} ---\n${result.content}`);
  }

  if (scriptParts.length > 0) {
    rawData.scripts = scriptContents;
  }

  // Load schemas from schemas/ directory
  const schemasDir = path.join(bundlePath, 'schemas');
  if (fileReader.existsSync(schemasDir) && fileReader.statSync(schemasDir).isDirectory()) {
    rawData.schemas = {};

    const schemaFiles = ['level.json', 'persistence.json'] as const;
    for (const schemaFile of schemaFiles) {
      const schemaPath = path.join(schemasDir, schemaFile);
      if (fileReader.existsSync(schemaPath)) {
        processedFiles.push(path.relative(bundlePath, schemaPath));
        const result = readJsonFile(schemaPath, fileReader);
        if (result && result.data && typeof result.data === 'object') {
          const schemaName = schemaFile.replace('.json', '') as 'level' | 'persistence';
          rawData.schemas[schemaName] = result.data as object;
        }
      }
    }
  }

  if (!rawData.manifest) {
    errors.push({
      code: 'MISSING_FILE',
      message: 'Bundle must contain manifest.json',
    });
  }

  const constantRefs = new Set<string>();
  const allItems = [...rawData.templates, ...rawData.entities, ...rawData.rules];

  for (const item of allItems) {
    findConstantRefs(item, constantRefs);
  }

  const resolvedConstants = new Map<string, ResolvedConstant>();
  const resolutionStack: string[] = [];

  function resolveConstant(name: string, currentPath: string[]): number | string | boolean | null {
    if (resolutionStack.includes(name)) {
      const cyclePath = [...resolutionStack, name];
      errors.push({
        code: 'CONSTANT_CYCLE',
        message: `Constant resolution cycle detected: ${cyclePath.join(' -> ')}`,
        path: currentPath.join('.'),
      });
      return null;
    }

    if (resolvedConstants.has(name)) {
      return resolvedConstants.get(name)!.value;
    }

    if (!rawData.constants || !(name in rawData.constants)) {
      return null;
    }

    resolutionStack.push(name);
    const rawValue = rawData.constants[name];
    resolutionStack.pop();

    if (typeof rawValue === 'number' || typeof rawValue === 'string' || typeof rawValue === 'boolean') {
      resolvedConstants.set(name, { value: rawValue, path: currentPath });
      return rawValue;
    }

    return null;
  }

  for (const ref of Array.from(constantRefs)) {
    resolveConstant(ref, ['constants', ref]);
  }

  const constantsMap = new Map<string, ResolvedConstant>();
  if (rawData.constants) {
    for (const [name, value] of Object.entries(rawData.constants)) {
      if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
        constantsMap.set(name, { value, path: ['constants', name] });
      }
    }
  }

  for (const [name, resolved] of Array.from(resolvedConstants)) {
    constantsMap.set(name, resolved);
  }

  const resolvedTemplates = rawData.templates.map(t =>
    resolveConstantRefs(t, constantsMap, ['templates'], errors) as Record<string, unknown>
  );
  const resolvedEntities = rawData.entities.map(e =>
    resolveConstantRefs(e, constantsMap, ['entities'], errors) as Record<string, unknown>
  );
  const resolvedRules = rawData.rules.map(r =>
    resolveConstantRefs(r, constantsMap, ['rules'], errors) as Record<string, unknown>
  );

  checkDuplicateIds(resolvedTemplates, 'templates', errors);
  checkDuplicateIds(resolvedEntities, 'entities', errors);
  checkDuplicateIds(resolvedRules, 'rules', errors);

  const templateMap = extractTemplates(resolvedTemplates);

  validateEntityTemplateRefs(resolvedEntities, templateMap, errors);

  const assetIds = rawData.assets ? new Set(Object.keys(rawData.assets)) : new Set<string>();
  validateAssetRefs(resolvedTemplates, assetIds, 'templates', errors);
  validateAssetRefs(resolvedEntities, assetIds, 'entities', errors);

  if (rawData.assets) {
    for (const [assetId, asset] of Object.entries(rawData.assets)) {
      if (!asset.path && !asset.remoteUrl && !asset.localPath) {
        errors.push({
          code: 'INVALID_ASSET_REFERENCE',
          message: `Asset "${assetId}" must have either "path", "remoteUrl", or "localPath"`,
          path: `assets.${assetId}`,
        });
      }

      if (asset.localPath) {
        const assetPath = path.join(bundlePath, 'assets', asset.localPath);
        if (!fileReader.existsSync(assetPath)) {
          errors.push({
            code: 'MISSING_LOCAL_ASSET',
            message: `Asset "${assetId}" references missing local file: assets/${asset.localPath}`,
            path: `assets.${assetId}.localPath`,
            context: { localPath: asset.localPath },
          });
        }
      }
    }
  }

  // Resolve constants in systems config
  const systemsConfig = (rawData.manifest as any)?.systems;
  const resolvedSystems = systemsConfig 
    ? resolveConstantRefs(systemsConfig, constantsMap, ['systems'], errors) as any
    : null;

  const gameDefinition = buildGameDefinition(
    rawData.manifest,
    rawData.constants,
    templateMap,
    resolvedEntities,
    resolvedRules as unknown as GameRule[],
    rawData.assets,
    resolvedSystems
  );

  if (scriptParts.length > 0) {
    gameDefinition.script = scriptParts.join('\n\n');
  }

  return {
    success: errors.length === 0,
    gameDefinition,
    editorMetadata: rawData.editor || null,
    errors,
    warnings,
    rawData,
    processedFiles,
  };
}
