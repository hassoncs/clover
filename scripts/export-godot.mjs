#!/usr/bin/env node
/**
 * Godot Export Script
 *
 * Exports the Godot project for web and native platforms.
 *
 * Usage:
 *   node scripts/export-godot.mjs          # Watch mode (default, web only)
 *   node scripts/export-godot.mjs --watch  # Watch mode (explicit)
 *   node scripts/export-godot.mjs --once   # Single export (CI/Build only)
 *   node scripts/export-godot.mjs --native # Export .pck for iOS/Android
 *   node scripts/export-godot.mjs --all    # Export both web and native
 *   node scripts/export-godot.mjs --check  # Check if export is current
 */
import { execSync, spawn } from "child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  watch as fsWatch,
} from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");

const GODOT_PROJECT = join(ROOT, "godot_project");
const OUTPUT_DIR = join(ROOT, "app", "public", "godot");
const OUTPUT_FILE = join(OUTPUT_DIR, "index.html");

// Native export paths
const NATIVE_OUTPUT_DIR = join(ROOT, "app", "godot");
const IOS_PCK_FILE = join(NATIVE_OUTPUT_DIR, "main.pck");

const args = process.argv.slice(2);
const watchMode = args.includes("--watch") || !args.some((a) => a.startsWith("--"));
const onceMode = args.includes("--once");
const checkMode = args.includes("--check");
const nativeMode = args.includes("--native");
const allMode = args.includes("--all");

// Directories to watch for changes
const WATCH_DIRS = ["scripts", "scenes", "shaders", "particles", "models"];
const WATCH_EXTENSIONS = [".gd", ".tscn", ".tres", ".gdshader"];
const WATCH_ROOT_FILES = ["project.godot", "export_presets.cfg"];

function log(msg) {
  const time = new Date().toLocaleTimeString();
  console.log(`[${time}] [godot-export] ${msg}`);
}

function findGodot() {
  // Try common paths
  const paths = [
    "godot",
    "/opt/homebrew/bin/godot",
    "/usr/local/bin/godot",
    "/Applications/Godot.app/Contents/MacOS/Godot",
  ];

  for (const p of paths) {
    try {
      execSync(`${p} --version`, { stdio: "ignore" });
      return p;
    } catch {
      // Continue to next path
    }
  }

  throw new Error(
    "Godot not found. Install with: brew install godot\n" +
      "Or download from: https://godotengine.org/download"
  );
}

function getLatestModTime(dir, extensions, rootFiles = []) {
  let latest = 0;

  // Check root files
  for (const file of rootFiles) {
    const filePath = join(dir, file);
    if (existsSync(filePath)) {
      const stat = statSync(filePath);
      if (stat.mtimeMs > latest) latest = stat.mtimeMs;
    }
  }

  // Check subdirectories
  function walkDir(d) {
    if (!existsSync(d)) return;
    const entries = readdirSync(d, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(d, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        walkDir(fullPath);
      } else if (entry.isFile()) {
        if (extensions.some((ext) => entry.name.endsWith(ext))) {
          const stat = statSync(fullPath);
          if (stat.mtimeMs > latest) latest = stat.mtimeMs;
        }
      }
    }
  }

  for (const subdir of WATCH_DIRS) {
    walkDir(join(dir, subdir));
  }

  return latest;
}

function getOutputModTime() {
  const wasmFile = join(OUTPUT_DIR, "index.wasm");
  if (!existsSync(wasmFile)) return 0;
  return statSync(wasmFile).mtimeMs;
}

function exportGodotWeb(godotPath) {
  log("Exporting Godot project to WASM...");

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  try {
    execSync(
      `${godotPath} --headless --path "${GODOT_PROJECT}" --export-release "Web" "${OUTPUT_FILE}"`,
      {
        stdio: "inherit",
        timeout: 120000,
      }
    );
    log(`Web export complete → ${OUTPUT_DIR}`);
    return true;
  } catch (error) {
    log(`Web export failed: ${error.message}`);
    return false;
  }
}

function exportGodotNative(godotPath) {
  log("Exporting Godot project to .pck for native...");

  if (!existsSync(NATIVE_OUTPUT_DIR)) {
    mkdirSync(NATIVE_OUTPUT_DIR, { recursive: true });
  }

  try {
    execSync(
      `${godotPath} --headless --path "${GODOT_PROJECT}" --export-pack "iOS" "${IOS_PCK_FILE}"`,
      {
        stdio: "inherit",
        timeout: 120000,
      }
    );
    log(`Native export complete → ${IOS_PCK_FILE}`);
    return true;
  } catch (error) {
    log(`Native export failed: ${error.message}`);
    return false;
  }
}

function exportGodot(godotPath, { web = true, native = false } = {}) {
  let success = true;
  if (web) {
    success = exportGodotWeb(godotPath) && success;
  }
  if (native) {
    success = exportGodotNative(godotPath) && success;
  }
  return success;
}

function checkExport() {
  const sourceTime = getLatestModTime(
    GODOT_PROJECT,
    WATCH_EXTENSIONS,
    WATCH_ROOT_FILES
  );
  const outputTime = getOutputModTime();

  if (outputTime === 0) {
    console.log("Godot export missing - this is usually handled automatically by the watcher in 'pnpm dev'.");
    console.log("To build once manually: node scripts/export-godot.mjs --once");
    process.exit(1);
  }

  if (sourceTime > outputTime) {
    console.log("Godot export out of date - the watcher should be running. Check 'devmux status'.");
    console.log("To force a manual rebuild: node scripts/export-godot.mjs --once");
    process.exit(1);
  }

  console.log("Godot export is current");
  process.exit(0);
}

function startWatcher(godotPath) {
  log("Watching for Godot project changes...");
  log(`  Directories: ${WATCH_DIRS.join(", ")}`);
  log(`  Extensions: ${WATCH_EXTENSIONS.join(", ")}`);
  log(`  Root files: ${WATCH_ROOT_FILES.join(", ")}`);

  let debounceTimer = null;
  let isExporting = false;

  function scheduleExport() {
    log("Event: Change detected, scheduling export...");
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (!isExporting) {
        isExporting = true;
        log("Starting export...");
        const success = exportGodot(godotPath);
        isExporting = false;
        if (success) {
          log("Export finished successfully.");
        } else {
          log("Export failed.");
        }
      } else {
        log("Export already in progress, skipping...");
      }
    }, 500); // 500ms debounce
  }

  function shouldWatch(filename) {
    if (!filename) return false;
    if (WATCH_ROOT_FILES.includes(filename)) return true;
    return WATCH_EXTENSIONS.some((ext) => filename.endsWith(ext));
  }

  // Watch root files
  for (const file of WATCH_ROOT_FILES) {
    const filePath = join(GODOT_PROJECT, file);
    if (existsSync(filePath)) {
      fsWatch(filePath, () => {
        log(`Changed: ${file}`);
        scheduleExport();
      });
    }
  }

  // Watch subdirectories
  for (const subdir of WATCH_DIRS) {
    const dirPath = join(GODOT_PROJECT, subdir);
    if (existsSync(dirPath)) {
      fsWatch(dirPath, { recursive: true }, (eventType, filename) => {
        if (shouldWatch(filename)) {
          log(`Changed: ${subdir}/${filename}`);
          scheduleExport();
        }
      });
    }
  }

  // Keep process alive
  process.on("SIGINT", () => {
    log("Stopping watcher");
    process.exit(0);
  });
}

// Main
async function main() {
  if (checkMode) {
    checkExport();
    return;
  }

  const godotPath = findGodot();
  log(`Found Godot: ${godotPath}`);

  // Check if export is needed
  const sourceTime = getLatestModTime(
    GODOT_PROJECT,
    WATCH_EXTENSIONS,
    WATCH_ROOT_FILES
  );
  const outputTime = getOutputModTime();

  if (nativeMode) {
    const success = exportGodot(godotPath, { web: false, native: true });
    process.exit(success ? 0 : 1);
  }

  if (allMode) {
    const success = exportGodot(godotPath, { web: true, native: true });
    process.exit(success ? 0 : 1);
  }

  if (onceMode) {
    const success = exportGodot(godotPath, { web: true, native: false });
    process.exit(success ? 0 : 1);
  }

  // Watch mode (web only)
  if (sourceTime > outputTime || outputTime === 0) {
    log("Export out of date, rebuilding...");
    exportGodot(godotPath, { web: true, native: false });
  } else {
    log("Export is current");
  }

  if (watchMode) {
    startWatcher(godotPath);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
