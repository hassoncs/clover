#!/usr/bin/env npx tsx
import { watch } from 'chokidar';
import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const TYPES_PATH = resolve(ROOT, 'packages/godot-bridge/src/types.ts');

let debounceTimer: NodeJS.Timeout | null = null;
let isGenerating = false;

function regenerate() {
  if (isGenerating) {
    console.log('[bridge-watch] Generation already in progress, skipping...');
    return;
  }

  isGenerating = true;
  console.log('[bridge-watch] Regenerating bridge files...');

  const child = spawn('pnpm', ['generate:bridge'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
  });

  child.on('close', (code) => {
    isGenerating = false;
    if (code === 0) {
      console.log('[bridge-watch] ✓ Bridge files regenerated successfully');
    } else {
      console.error(`[bridge-watch] ✗ Generation failed with code ${code}`);
    }
  });

  child.on('error', (err) => {
    isGenerating = false;
    console.error('[bridge-watch] ✗ Generation error:', err);
  });
}

console.log('[bridge-watch] Watching for changes to types.ts...');
console.log(`[bridge-watch] Watching: ${TYPES_PATH}`);

const watcher = watch(TYPES_PATH, {
  persistent: true,
  ignoreInitial: true,
});

watcher.on('change', () => {
  console.log('[bridge-watch] types.ts changed, debouncing...');
  
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    regenerate();
  }, 500);
});

watcher.on('error', (error) => {
  console.error('[bridge-watch] Watcher error:', error);
});

process.on('SIGINT', () => {
  console.log('\n[bridge-watch] Shutting down...');
  watcher.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[bridge-watch] Shutting down...');
  watcher.close();
  process.exit(0);
});
