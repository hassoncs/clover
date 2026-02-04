#!/usr/bin/env node
import { watch } from 'node:fs';
import { resolve } from 'node:path';
import { generate } from './index.js';

const args = process.argv.slice(2);
const watchMode = args.includes('--watch') || args.includes('-w');
const checkMode = args.includes('--check') || args.includes('-c');

async function run() {
  console.log('reggie');
  console.log('======');

  if (checkMode) {
    console.log('Checking if generated files are up-to-date...\n');
    const results = await generate(undefined, { checkOnly: true });
    const stale = results.filter(r => r.code === '');
    
    if (stale.length > 0) {
      console.log('\n⚠️  Generated files are out of sync. Run "npx reggie" to fix.');
      process.exit(1);
    } else {
      console.log('\n✓ All generated files are up-to-date.');
      process.exit(0);
    }
  }

  await generate();

  if (watchMode) {
    console.log('\nWatch mode enabled. Watching for changes...');
    
    const { default: config } = await import(resolve(process.cwd(), 'reggie.config.ts'));
    
    for (const [name, registryConfig] of Object.entries(config)) {
      const sourceDir = resolve(process.cwd(), (registryConfig as { sourceDir: string }).sourceDir);
      console.log(`Watching: ${sourceDir}`);
      
      let debounceTimer: ReturnType<typeof setTimeout> | null = null;
      
      watch(sourceDir, { recursive: true }, (eventType, filename) => {
        if (!filename) return;
        if (filename.includes('generated')) return;
        
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          console.log(`\n[${name}] Change detected: ${filename}`);
          await generate();
        }, 100);
      });
    }
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
