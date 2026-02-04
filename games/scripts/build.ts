#!/usr/bin/env tsx
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { build as esbuild } from 'esbuild';
import { GAME_IDS, loadGame } from '../src/registry';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(__dirname, '..', 'dist');
const COMPILED_DIR = join(__dirname, '..', 'compiled');

async function bundleGameScript(gameId: string): Promise<string | undefined> {
  const scriptPath = join(COMPILED_DIR, gameId, 'script.ts');
  if (!existsSync(scriptPath)) return undefined;

  try {
    const result = await esbuild({
      entryPoints: [scriptPath],
      bundle: true,
      format: 'cjs',
      platform: 'browser',
      target: 'es2020',
      write: false,
      minify: false,
      treeShaking: true,
    });

    return result.outputFiles[0].text;
  } catch (error) {
    console.error(`  ⚠ Failed to bundle script for ${gameId}:`, error);
    return undefined;
  }
}

function generateStaticRegistry(gameIds: string[]): string {
  const imports = gameIds.map(id => `import ${sanitizeVarName(id)}Json from './${id}.json';`).join('\n');
  const entries = gameIds.map(id => {
    const varName = sanitizeVarName(id);
    return `  '${id}': {
    id: ${varName}Json.id,
    title: ${varName}Json.title,
    description: ${varName}Json.description,
    definition: ${varName}Json.definition as unknown as GameDefinition,
  }`;
  }).join(',\n');

  return `// AUTO-GENERATED - DO NOT EDIT
import type { GameDefinition } from '@slopcade/shared';

${imports}

export interface StaticGameEntry {
  id: string;
  title: string;
  description: string;
  definition: GameDefinition;
}

export const STATIC_GAMES: Record<string, StaticGameEntry> = {
${entries}
};

export const STATIC_GAME_IDS = Object.keys(STATIC_GAMES);

export function getStaticGame(id: string): StaticGameEntry | null {
  return STATIC_GAMES[id] ?? null;
}

export function listStaticGames(): StaticGameEntry[] {
  return Object.values(STATIC_GAMES);
}
`;
}

function sanitizeVarName(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, '_');
}

interface BuildResult {
  id: string;
  success: boolean;
  outputPath?: string;
  error?: string;
}

async function build(): Promise<void> {
  console.log('Building games package...\n');
  
  if (!existsSync(DIST_DIR)) {
    mkdirSync(DIST_DIR, { recursive: true });
  }
  
  const results: BuildResult[] = [];
  
  for (const id of GAME_IDS) {
    try {
      const entry = await loadGame(id);
      
      if (!entry) {
        results.push({ id, success: false, error: 'Failed to load game' });
        continue;
      }

      const scriptCode = await bundleGameScript(id);
      if (scriptCode) {
        entry.definition.script = scriptCode;
      }
      
      const outputPath = join(DIST_DIR, `${id}.json`);
      
      const json = JSON.stringify({
        id: entry.id,
        title: entry.title,
        description: entry.description,
        definition: entry.definition,
      }, null, 2);
      
      writeFileSync(outputPath, json);
      
      results.push({ id, success: true, outputPath });
      const scriptNote = scriptCode ? ' (+ script)' : '';
      console.log(`✓ ${id}${scriptNote} -> dist/${id}.json`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      results.push({ id, success: false, error: errorMsg });
      console.error(`✗ ${id}: ${errorMsg}`);
    }
  }
  
  const manifest = {
    version: 1,
    buildTime: new Date().toISOString(),
    games: results
      .filter(r => r.success)
      .map(r => ({
        id: r.id,
        file: `${r.id}.json`,
      })),
  };
  
  writeFileSync(join(DIST_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  
  // Generate static registry for Workers environments (API)
  const successfulGames = results.filter(r => r.success);
  const staticRegistryContent = generateStaticRegistry(successfulGames.map(r => r.id));
  writeFileSync(join(DIST_DIR, 'static-registry.ts'), staticRegistryContent);
  console.log(`✓ Generated static-registry.ts`);
  
  const succeeded = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`\nBuild complete:`);
  console.log(`  Succeeded: ${succeeded}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Output: ${DIST_DIR}`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
