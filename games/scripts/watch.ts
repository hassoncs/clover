#!/usr/bin/env tsx
import { watch } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COMPILED_DIR = join(__dirname, '..', 'compiled');

let buildInProgress = false;
let pendingBuild = false;
let debounceTimer: NodeJS.Timeout | null = null;

function runBuild() {
  if (buildInProgress) {
    pendingBuild = true;
    return;
  }

  buildInProgress = true;
  console.log('[games-watcher] Building...');

  const child = spawn('pnpm', ['build'], {
    cwd: join(__dirname, '..'),
    stdio: 'inherit',
  });

  child.on('close', (code) => {
    buildInProgress = false;
    if (code === 0) {
      console.log('[games-watcher] Build complete');
    } else {
      console.error('[games-watcher] Build failed with code', code);
    }

    if (pendingBuild) {
      pendingBuild = false;
      runBuild();
    }
  });
}

function debouncedBuild() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    runBuild();
  }, 300);
}

console.log('[games-watcher] Watching', COMPILED_DIR);
console.log('[games-watcher] Running initial build...');
runBuild();

watch(COMPILED_DIR, { recursive: true }, (eventType, filename) => {
  if (!filename) return;
  if (filename.endsWith('.ts') || filename.endsWith('.json') || filename.endsWith('.png')) {
    console.log(`[games-watcher] ${eventType}: ${filename}`);
    debouncedBuild();
  }
});
