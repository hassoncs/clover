#!/usr/bin/env npx tsx
import { Project, type MethodSignature, type InterfaceDeclaration } from 'ts-morph';
import { writeFileSync, mkdirSync, readFileSync, existsSync, chmodSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const TYPES_PATH = resolve(ROOT, 'app/lib/godot/types.ts');
const OUTPUT_DIR = resolve(ROOT, 'app/lib/godot/generated');
const OUTPUT_PATH = resolve(OUTPUT_DIR, 'bridge-registry.json');
const GDSCRIPT_OUTPUT_DIR = resolve(ROOT, 'godot_project/scripts/bridge/generated');
const GDSCRIPT_OUTPUT_PATH = resolve(GDSCRIPT_OUTPUT_DIR, 'BridgeValidation.gd');

interface MethodParam {
  name: string;
  type: string;
  optional: boolean;
}

interface MethodEntry {
  tsName: string;
  snakeName: string;
  params: MethodParam[];
  returnType: string;
  async: boolean;
  category: string;
  tsOnly: boolean;
  source: 'GodotBridge' | 'EffectsBridge';
}

interface BridgeRegistry {
  generatedAt: string;
  sourceFile: string;
  methods: MethodEntry[];
  stats: {
    total: number;
    bridgeMethods: number;
    tsOnlyMethods: number;
    byCategory: Record<string, number>;
  };
}

const LIFECYCLE_METHODS = new Set([
  'initialize',
  'dispose',
]);

const EVENT_CALLBACK_PATTERN = /^on[A-Z]/;

function camelToSnake(name: string): string {
  return name
    .replace(/([23])D(?=[A-Z]|$)/g, '_$1d_')
    .replace(/([a-z])(\d)/g, '$1_$2')
    .replace(/(\d)([A-Z])/g, '$1_$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();
}

function isTsOnly(name: string, returnType: string): boolean {
  if (LIFECYCLE_METHODS.has(name)) return true;
  if (EVENT_CALLBACK_PATTERN.test(name) && returnType.includes('() => void')) return true;
  return false;
}

function inferCategory(method: MethodSignature, interfaceDecl: InterfaceDeclaration): string {
  const sourceFile = interfaceDecl.getSourceFile();
  const methodStart = method.getStart();

  const fullText = sourceFile.getFullText();
  const textBefore = fullText.slice(0, methodStart);

  const commentLines = textBefore.split('\n');
  let lastCategory = 'uncategorized';

  for (const line of commentLines) {
    const match = line.match(/\/\/\s*(.+)/);
    if (match) {
      const comment = match[1].trim();
      if (comment.startsWith('Lifecycle')) lastCategory = 'lifecycle';
      else if (comment.startsWith('Effects hot-path') || comment.startsWith('Effects -') || comment.includes('effect graph')) lastCategory = 'effects';
      else if (comment.startsWith('Normalized coordinate')) lastCategory = 'drawing';
      else if (comment.startsWith('Game management')) lastCategory = 'game';
      else if (comment.startsWith('Physics control') || comment.startsWith('Physics queries')) lastCategory = 'physics';
      else if (comment.startsWith('Inspect mode') || comment.startsWith('Debug stepping') || comment.startsWith('Generic RPC') || comment.startsWith('Debug mode')) lastCategory = 'debug';
      else if (comment.startsWith('Entity management') || comment.startsWith('Entity data')) lastCategory = 'entity';
      else if (comment.startsWith('Transform queries') || comment.startsWith('Transform control')) lastCategory = 'transform';
      else if (comment.startsWith('Velocity control') || comment.startsWith('Force/impulse')) lastCategory = 'physics';
      else if (comment.startsWith('Joints')) lastCategory = 'joints';
      else if (comment.startsWith('Coordinate conversion')) lastCategory = 'coordinate';
      else if (comment.startsWith('Events')) lastCategory = 'events';
      else if (comment.startsWith('Property sync')) lastCategory = 'properties';
      else if (comment.startsWith('Input')) lastCategory = 'input';
      else if (comment.startsWith('Dynamic image') || comment.startsWith('Pixel Buffer')) lastCategory = 'visual';
      else if (comment.startsWith('Camera control')) lastCategory = 'camera';
      else if (comment.startsWith('Particle effects')) lastCategory = 'particles';
      else if (comment.startsWith('Audio')) lastCategory = 'audio';
      else if (comment.startsWith('Visual Effects - Sprite')) lastCategory = 'effects_sprite';
      else if (comment.startsWith('Visual Effects - Post')) lastCategory = 'effects_post';
      else if (comment.startsWith('Visual Effects - Camera')) lastCategory = 'effects_camera';
      else if (comment.startsWith('Visual Effects - Dynamic')) lastCategory = 'effects_dynamic';
      else if (comment.startsWith('Visual Effects - Particles')) lastCategory = 'effects_particles';
      else if (comment.startsWith('Visual Effects - Info')) lastCategory = 'effects_info';
      else if (comment.startsWith('UI Buttons')) lastCategory = 'ui';
      else if (comment.startsWith('Themed UI')) lastCategory = 'ui_themed';
      else if (comment.startsWith('3D Model') || comment.startsWith('3D Primitives') || comment.startsWith('3D Camera')) lastCategory = '3d';
      else if (comment.startsWith('External Input')) lastCategory = 'external_input';
    }
  }

  return lastCategory;
}

function extractMethod(method: MethodSignature, interfaceDecl: InterfaceDeclaration, source: 'GodotBridge' | 'EffectsBridge'): MethodEntry {
  const tsName = method.getName();
  const snakeName = camelToSnake(tsName);
  const returnType = method.getReturnType().getText(method);
  const isAsync = returnType.startsWith('Promise<');

  const params: MethodParam[] = method.getParameters().map(p => ({
    name: p.getName(),
    type: p.getType().getText(p),
    optional: p.isOptional(),
  }));

  const category = source === 'EffectsBridge' ? 'effects_pipeline' : inferCategory(method, interfaceDecl);
  const tsOnly = isTsOnly(tsName, returnType);

  return {
    tsName,
    snakeName,
    params,
    returnType,
    async: isAsync,
    category,
    tsOnly,
    source,
  };
}

function generateGDScriptValidator(registry: BridgeRegistry): void {
  const bridgeMethods = registry.methods.filter(m => !m.tsOnly);
  
  const methodEntries = bridgeMethods.map(m => {
    const paramCount = m.params.length;
    const asyncStr = m.async ? 'true' : 'false';
    return `  "${m.snakeName}": {"param_count": ${paramCount}, "async": ${asyncStr}},`;
  }).join('\n');

  const gdscript = `# ⚠️ AUTO-GENERATED - DO NOT EDIT
# This file is automatically generated from types.ts
# Any changes will be overwritten on next generation
# To modify: update app/lib/godot/types.ts and run pnpm generate:bridge
#
# Generated by: scripts/bridge-codegen.ts
# Source: app/lib/godot/types.ts (GodotBridge interface)
# Generated: ${registry.generatedAt}

class_name BridgeValidation

const EXPECTED_METHODS: Dictionary = {
${methodEntries}
}

static func validate(method_map: Dictionary) -> Array[String]:
  var errors: Array[String] = []
  
  # Check for missing methods
  for method_name in EXPECTED_METHODS:
    if not method_map.has(method_name):
      errors.append("MISSING: TypeScript expects '%s' but Godot does not register it" % method_name)
  
  # Check for extra methods
  for method_name in method_map:
    if not EXPECTED_METHODS.has(method_name):
      errors.append("EXTRA: Godot registers '%s' but TypeScript does not define it" % method_name)
  
  return errors
`;

  mkdirSync(GDSCRIPT_OUTPUT_DIR, { recursive: true });
  
  if (existsSync(GDSCRIPT_OUTPUT_PATH)) {
    chmodSync(GDSCRIPT_OUTPUT_PATH, 0o644);
  }
  writeFileSync(GDSCRIPT_OUTPUT_PATH, gdscript);
  chmodSync(GDSCRIPT_OUTPUT_PATH, 0o444);
}

function generateRegistry(): BridgeRegistry {
  const project = new Project({ compilerOptions: { strict: true } });
  project.addSourceFileAtPath(TYPES_PATH);

  const sourceFile = project.getSourceFileOrThrow(TYPES_PATH);

  const godotBridge = sourceFile.getInterfaceOrThrow('GodotBridge');
  const effectsBridge = sourceFile.getInterfaceOrThrow('EffectsBridge');

  const methods: MethodEntry[] = [];

  for (const method of effectsBridge.getMethods()) {
    methods.push(extractMethod(method, effectsBridge, 'EffectsBridge'));
  }

  for (const method of godotBridge.getMethods()) {
    methods.push(extractMethod(method, godotBridge, 'GodotBridge'));
  }

  const byCategory: Record<string, number> = {};
  let tsOnlyCount = 0;
  for (const m of methods) {
    byCategory[m.category] = (byCategory[m.category] ?? 0) + 1;
    if (m.tsOnly) tsOnlyCount++;
  }

  return {
    generatedAt: new Date().toISOString(),
    sourceFile: 'app/lib/godot/types.ts',
    methods,
    stats: {
      total: methods.length,
      bridgeMethods: methods.length - tsOnlyCount,
      tsOnlyMethods: tsOnlyCount,
      byCategory,
    },
  };
}

function normalizeRegistry(registry: BridgeRegistry): BridgeRegistry {
  return {
    ...registry,
    generatedAt: '',
  };
}

function checkMode(): void {
  if (!existsSync(OUTPUT_PATH)) {
    console.error(`ERROR: Registry not found at ${OUTPUT_PATH}`);
    console.error('Run "pnpm generate:bridge" first to generate the registry.');
    process.exit(1);
  }

  const committedContent = readFileSync(OUTPUT_PATH, 'utf-8');
  const committedRegistry = JSON.parse(committedContent) as BridgeRegistry;

  const freshRegistry = generateRegistry();

  const normalizedCommitted = normalizeRegistry(committedRegistry);
  const normalizedFresh = normalizeRegistry(freshRegistry);

  const committedJson = JSON.stringify(normalizedCommitted, null, 2);
  const freshJson = JSON.stringify(normalizedFresh, null, 2);

  if (committedJson !== freshJson) {
    console.error('ERROR: Bridge registry is out of date!');
    console.error('');
    console.error('The committed registry does not match the current TypeScript definitions.');
    console.error('Run "pnpm generate:bridge" to update it.');
    console.error('');
    console.error(`Committed: ${committedRegistry.stats.total} methods`);
    console.error(`Current:   ${freshRegistry.stats.total} methods`);
    process.exit(1);
  }

  console.log('✓ Bridge registry is up to date');
  console.log(`  Total methods: ${freshRegistry.stats.total}`);
  console.log(`  Bridge methods: ${freshRegistry.stats.bridgeMethods}`);
  console.log(`  TS-only methods: ${freshRegistry.stats.tsOnlyMethods}`);
}

function generateTypedBridgeClient(registry: BridgeRegistry): void {
  const E2E_OUTPUT_DIR = resolve(ROOT, 'tests/e2e/bridge/generated');
  const E2E_OUTPUT_PATH = resolve(E2E_OUTPUT_DIR, 'TypedBridgeClient.ts');

  const bridgeMethods = registry.methods.filter(m => !m.tsOnly);

  // Generate method implementations
  const methodImpls = bridgeMethods.map(m => {
    const params = m.params.map(p => {
      const optionalMark = p.optional ? '?' : '';
      return `${p.name}${optionalMark}: ${p.type}`;
    }).join(', ');

    const paramNames = m.params.map(p => p.name).join(', ');
    const paramsArray = m.params.length > 0 ? `[${paramNames}]` : '[]';

    const returnType = m.async ? m.returnType : `Promise<${m.returnType}>`;

    return `  async ${m.tsName}(${params}): ${returnType} {
    return this.driver.call("${m.snakeName}", ${paramsArray});
  }`;
  }).join('\n\n');

  const content = `// ⚠️ AUTO-GENERATED - DO NOT EDIT
// This file is automatically generated from types.ts
// Any changes will be overwritten on next generation
// To modify: update app/lib/godot/types.ts and run pnpm generate:bridge
//
// Generated by: scripts/bridge-codegen.ts
// Source: app/lib/godot/types.ts (GodotBridge + EffectsBridge interfaces)
// Generated: ${registry.generatedAt}

import type {
  GameDefinition,
  PropertySyncPayload,
  Vec2,
  EntityTransform,
  CollisionEvent,
  SensorEvent,
  SpawnEntityRequest,
  EntitySpawnedEvent,
  RaycastHit,
  DynamicShaderResult,
  EffectsResult,
  EffectsPipelineSnapshot,
} from '../../../app/lib/godot/types.js';
import type { CompiledPlan } from '@slopcade/shared/effects';
import type GodotHeadlessDriver from './GodotHeadlessDriver.js';

export class TypedBridgeClient {
  constructor(private driver: GodotHeadlessDriver) {}

${methodImpls}
}
`;

  mkdirSync(E2E_OUTPUT_DIR, { recursive: true });

  if (existsSync(E2E_OUTPUT_PATH)) {
    chmodSync(E2E_OUTPUT_PATH, 0o644);
  }
  writeFileSync(E2E_OUTPUT_PATH, content);
  chmodSync(E2E_OUTPUT_PATH, 0o444);

  console.log(`Generated ${E2E_OUTPUT_PATH}`);
  console.log(`  Methods: ${bridgeMethods.length}`);
}

function generateMockGodotBridge(registry: BridgeRegistry): void {
  const MOCK_OUTPUT_DIR = resolve(ROOT, 'app/lib/godot/__tests__/generated');
  const MOCK_OUTPUT_PATH = resolve(MOCK_OUTPUT_DIR, 'MockGodotBridge.ts');

  // Generate mock method implementations
  const mockMethods = registry.methods.map(m => {
    const params = m.params.map(p => {
      const optionalMark = p.optional ? '?' : '';
      return `${p.name}${optionalMark}: ${p.type}`;
    }).join(', ');

    return `  ${m.tsName} = vi.fn<(${params}) => ${m.returnType}>();`;
  }).join('\n');

  const content = `// ⚠️ AUTO-GENERATED - DO NOT EDIT
// This file is automatically generated from types.ts
// Any changes will be overwritten on next generation
// To modify: update app/lib/godot/types.ts and run pnpm generate:bridge
//
// Generated by: scripts/bridge-codegen.ts
// Source: app/lib/godot/types.ts (GodotBridge + EffectsBridge interfaces)
// Generated: ${registry.generatedAt}

import { vi } from 'vitest';
import type {
  GodotBridge,
  GameDefinition,
  PropertySyncPayload,
  Vec2,
  EntityTransform,
  CollisionEvent,
  SensorEvent,
  SpawnEntityRequest,
  EntitySpawnedEvent,
  RaycastHit,
  DynamicShaderResult,
  EffectsResult,
  EffectsPipelineSnapshot,
  RevoluteJointDef,
  DistanceJointDef,
  PrismaticJointDef,
  WeldJointDef,
  MouseJointDef,
  NormalizedDrawCommand,
  DrawCommand,
} from '../../types.js';
import type { CompiledPlan } from '@slopcade/shared/effects';

export class MockGodotBridge implements GodotBridge {
${mockMethods}
}
`;

  mkdirSync(MOCK_OUTPUT_DIR, { recursive: true });

  if (existsSync(MOCK_OUTPUT_PATH)) {
    chmodSync(MOCK_OUTPUT_PATH, 0o644);
  }
  writeFileSync(MOCK_OUTPUT_PATH, content);
  chmodSync(MOCK_OUTPUT_PATH, 0o444);

  console.log(`Generated ${MOCK_OUTPUT_PATH}`);
  console.log(`  Methods: ${registry.methods.length}`);
}

function generateMode(): void {
  const registry = generateRegistry();

  // Add AI protection header to JSON
  const jsonContent = `{
  "_comment": "⚠️ AUTO-GENERATED - DO NOT EDIT",
  "_warning": "This file is automatically generated from types.ts",
  "_instructions": "Any changes will be overwritten on next generation",
  "_howToModify": "To modify: update app/lib/godot/types.ts and run pnpm generate:bridge",
${JSON.stringify(registry, null, 2).slice(2)}`;

  mkdirSync(OUTPUT_DIR, { recursive: true });
  
  if (existsSync(OUTPUT_PATH)) {
    chmodSync(OUTPUT_PATH, 0o644);
  }
  writeFileSync(OUTPUT_PATH, jsonContent);
  chmodSync(OUTPUT_PATH, 0o444);

  console.log(`Generated ${OUTPUT_PATH}`);
  console.log(`  Total methods: ${registry.stats.total}`);
  console.log(`  Bridge methods: ${registry.stats.bridgeMethods}`);
  console.log(`  TS-only methods: ${registry.stats.tsOnlyMethods}`);
  console.log(`  Categories: ${Object.keys(registry.stats.byCategory).join(', ')}`);

  generateGDScriptValidator(registry);
  console.log(`Generated ${GDSCRIPT_OUTPUT_PATH}`);

  generateTypedBridgeClient(registry);
  
  generateMockGodotBridge(registry);
}

function main() {
  const args = process.argv.slice(2);
  const isCheckMode = args.includes('--check');

  if (isCheckMode) {
    checkMode();
  } else {
    generateMode();
  }
}

main();
