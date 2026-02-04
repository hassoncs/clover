import { resolve, dirname } from 'node:path';
import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import type { ReggieConfig, GenerateOptions, GenerateResult } from './types.js';
import { scanFiles } from './scanner.js';
import { generateRegistry } from './generator.js';

export { defineConfig } from './types.js';
export type { ReggieConfig, RegistryConfig, GenerateOptions, GenerateResult } from './types.js';

const CONFIG_FILES = ['reggie.config.ts', 'reggie.config.js', 'reggie.config.mjs'];

async function loadConfig(rootDir: string): Promise<ReggieConfig | null> {
  for (const filename of CONFIG_FILES) {
    const configPath = resolve(rootDir, filename);
    if (existsSync(configPath)) {
      const url = pathToFileURL(configPath).href;
      const mod = await import(url);
      return mod.default ?? mod;
    }
  }
  return null;
}

function extractHashFromFile(filePath: string): string | null {
  if (!existsSync(filePath)) return null;
  const content = readFileSync(filePath, 'utf-8');
  const match = content.match(/\/\/ @generated-hash: ([a-f0-9]+)/);
  return match ? match[1] : null;
}

export async function generate(
  config?: ReggieConfig,
  options: GenerateOptions = {}
): Promise<GenerateResult[]> {
  const rootDir = options.rootDir ?? process.cwd();
  const resolvedConfig = config ?? await loadConfig(rootDir);
  
  if (!resolvedConfig) {
    throw new Error('No reggie config found. Create reggie.config.ts or pass config directly.');
  }

  const results: GenerateResult[] = [];

  for (const [name, registryConfig] of Object.entries(resolvedConfig)) {
    const entries = await scanFiles(registryConfig, rootDir);
    
    if (entries.length === 0) {
      if (!options.quiet) {
        console.log(`[${name}] No files found in ${registryConfig.sourceDir}`);
      }
      continue;
    }

    const outputPath = resolve(rootDir, registryConfig.output);
    const result = generateRegistry(name, registryConfig, entries, outputPath);

    if (options.checkOnly) {
      const existingHash = extractHashFromFile(outputPath);
      const isStale = result.hash !== existingHash;
      
      if (!options.quiet) {
        if (isStale) {
          console.log(`❌ [${name}] ${registryConfig.output} is STALE`);
        } else {
          console.log(`✓ [${name}] ${registryConfig.output} is up-to-date`);
        }
      }
      
      if (isStale) {
        results.push({ ...result, code: '' });
      }
    } else {
      mkdirSync(dirname(outputPath), { recursive: true });
      
      if (existsSync(outputPath)) {
        chmodSync(outputPath, 0o644);
      }
      writeFileSync(outputPath, result.code);
      chmodSync(outputPath, 0o444);
      
      if (!options.quiet) {
        console.log(`[${name}] Generated ${registryConfig.output} with ${result.entryCount} entries`);
      }
    }

    results.push(result);
  }

  return results;
}
