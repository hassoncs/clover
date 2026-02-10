#!/usr/bin/env npx tsx
import { Project, type MethodSignature, type InterfaceDeclaration } from 'ts-morph';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const TYPES_PATH = resolve(ROOT, 'app/lib/godot/types.ts');
const OUTPUT_DIR = resolve(ROOT, 'app/lib/godot/generated');
const OUTPUT_PATH = resolve(OUTPUT_DIR, 'bridge-registry.json');

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

function main() {
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

  const registry: BridgeRegistry = {
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

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(registry, null, 2) + '\n');

  console.log(`Generated ${OUTPUT_PATH}`);
  console.log(`  Total methods: ${registry.stats.total}`);
  console.log(`  Bridge methods: ${registry.stats.bridgeMethods}`);
  console.log(`  TS-only methods: ${registry.stats.tsOnlyMethods}`);
  console.log(`  Categories: ${Object.keys(byCategory).join(', ')}`);
}

main();
