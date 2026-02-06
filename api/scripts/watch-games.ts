#!/usr/bin/env tsx
import { watch } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WATCH_DIR = resolve(__dirname, '..', '..', 'r2', 'games');

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

  const child = spawn('pnpm', ['run', 'build:games'], {
    cwd: resolve(__dirname, '..'),
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

console.log('[games-watcher] Watching', WATCH_DIR);
console.log('[games-watcher] Running initial build...');
runBuild();

// Build outputs written back into r2/games/{id}/ — skip to prevent rebuild loops.
// Source .ts and .png changes, plus directory-level events (deletions), all trigger builds.
const BUILD_OUTPUTS = new Set(['definition.json', 'metadata.json']);

watch(WATCH_DIR, { recursive: true }, (eventType, filename) => {
  if (!filename) return;

  const basename = filename.split('/').pop() ?? filename;
  if (BUILD_OUTPUTS.has(basename)) return;

  console.log(`[games-watcher] ${eventType}: ${filename}`);
  debouncedBuild();
});
