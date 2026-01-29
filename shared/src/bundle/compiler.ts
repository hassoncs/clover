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
import type { GameDefinition, GameMetadata } from '../types/GameDefinition';
import type { Match3Config, SlotMachineConfig, ContainerConfig, TetrisConfig } from '../types/GameDefinition';
import type { EntityTemplate } from '../types/entity';
import type { GameRule } from '../types/rules';

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

function scanForJsonFiles(dir: string, files: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanForJsonFiles(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }

  return files;
}

function readJsonFile(filePath: string): { data: unknown; error?: CompileError } | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
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
  assets: Record<string, { path: string; type: string }> | null,
  systems: {
    match3?: Match3Config;
    slotMachine?: SlotMachineConfig;
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
    assetPacks: assets ? {
      default: {
        id: 'default',
        name: 'Default Assets',
        assets: Object.fromEntries(
          Object.entries(assets).map(([id, asset]) => [
            id,
            {
              imageUrl: asset.path,
              type: asset.type as 'image' | 'sound',
            },
          ])
        ),
      },
    } : undefined,
    // Include system configs if provided
    ...(systems?.match3 && { match3: systems.match3 }),
    ...(systems?.slotMachine && { slotMachine: systems.slotMachine }),
    ...(systems?.containers && { containers: systems.containers }),
    ...(systems?.tetris && { tetris: systems.tetris }),
  };
}

export function compileBundle(bundlePath: string): BundleCompileResult {
  const errors: CompileError[] = [];
  const warnings: CompileWarning[] = [];
  const processedFiles: string[] = [];

  const rawData: RawBundleData = {
    manifest: null,
    constants: null,
    editor: null,
    assets: null,
    templates: [],
    entities: [],
    rules: [],
    schemas: undefined,
  };

  if (!fs.existsSync(bundlePath)) {
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

  const bundleStat = fs.statSync(bundlePath);
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

  const jsonFiles = scanForJsonFiles(bundlePath);

  for (const filePath of jsonFiles) {
    const relativePath = path.relative(bundlePath, filePath);
    const result = readJsonFile(filePath);

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
        rawData.assets = data as Record<string, { path: string; type: string }>;
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

  // Load schemas from schemas/ directory
  const schemasDir = path.join(bundlePath, 'schemas');
  if (fs.existsSync(schemasDir) && fs.statSync(schemasDir).isDirectory()) {
    rawData.schemas = {};

    const schemaFiles = ['level.json', 'persistence.json'] as const;
    for (const schemaFile of schemaFiles) {
      const schemaPath = path.join(schemasDir, schemaFile);
      if (fs.existsSync(schemaPath)) {
        processedFiles.push(path.relative(bundlePath, schemaPath));
        const result = readJsonFile(schemaPath);
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
