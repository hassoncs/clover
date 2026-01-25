#!/usr/bin/env node
/**
 * Fix Hermes dSYM for TestFlight uploads
 * 
 * React Native 0.81.x prebuilt Hermes doesn't include dSYMs.
 * This script downloads the artifacts, generates the dSYM, and injects
 * it into your most recent Xcode archive.
 * 
 * Usage:
 *   pnpm fix:hermes-dsym          # Auto-inject into latest archive
 *   pnpm fix:hermes-dsym --list   # List available archives
 *   pnpm fix:hermes-dsym --help   # Show help
 */
import { execSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync, cpSync, rmSync } from "node:fs";
import { join, basename } from "node:path";
import { tmpdir } from "node:os";

const RN_VERSION = "0.81.5";
const MAVEN_URL = `https://repo1.maven.org/maven2/com/facebook/react/react-native-artifacts/${RN_VERSION}/react-native-artifacts-${RN_VERSION}-hermes-ios-release.tar.gz`;
const ARCHIVES_DIR = join(process.env.HOME, "Library/Developer/Xcode/Archives");

const COLORS = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  bold: "\x1b[1m",
};

function log(msg, color = "reset") {
  console.log(`${COLORS[color]}${msg}${COLORS.reset}`);
}

function run(cmd, opts = {}) {
  log(`> ${cmd}`, "cyan");
  try {
    return execSync(cmd, { stdio: "inherit", ...opts });
  } catch (e) {
    if (!opts.ignoreError) {
      log(`Command failed: ${cmd}`, "red");
      process.exit(1);
    }
  }
}

function findArchives() {
  if (!existsSync(ARCHIVES_DIR)) {
    return [];
  }
  
  const archives = [];
  const dateDirs = readdirSync(ARCHIVES_DIR).filter(d => 
    statSync(join(ARCHIVES_DIR, d)).isDirectory()
  );
  
  for (const dateDir of dateDirs) {
    const datePath = join(ARCHIVES_DIR, dateDir);
    const xcarchives = readdirSync(datePath).filter(f => f.endsWith(".xcarchive"));
    for (const archive of xcarchives) {
      const archivePath = join(datePath, archive);
      const stat = statSync(archivePath);
      archives.push({
        name: archive,
        path: archivePath,
        date: stat.mtime,
      });
    }
  }
  
  return archives.sort((a, b) => b.date - a.date);
}

function showHelp() {
  console.log(`
${COLORS.bold}Hermes dSYM Fixer${COLORS.reset}

Fixes the "archive did not include a dSYM for hermes.framework" error
when uploading to TestFlight.

${COLORS.bold}Usage:${COLORS.reset}
  ${COLORS.green}pnpm fix:hermes-dsym${COLORS.reset}          Auto-inject into latest archive
  ${COLORS.green}pnpm fix:hermes-dsym --list${COLORS.reset}   List available archives
  ${COLORS.green}pnpm fix:hermes-dsym <path>${COLORS.reset}   Inject into specific archive

${COLORS.bold}What it does:${COLORS.reset}
  1. Downloads Hermes artifacts for React Native ${RN_VERSION}
  2. Generates dSYM using dsymutil
  3. Injects into the .xcarchive's dSYMs folder
  4. Cleans up temp files

After running, retry your TestFlight upload from Xcode Organizer.
`);
}

function listArchives() {
  const archives = findArchives();
  if (archives.length === 0) {
    log("No archives found in ~/Library/Developer/Xcode/Archives", "yellow");
    return;
  }
  
  log("\nAvailable archives (most recent first):\n", "bold");
  archives.slice(0, 10).forEach((a, i) => {
    const date = a.date.toLocaleString();
    const marker = i === 0 ? " ← latest" : "";
    console.log(`  ${i + 1}. ${a.name}`);
    console.log(`     ${COLORS.cyan}${date}${COLORS.reset}${COLORS.green}${marker}${COLORS.reset}`);
    console.log(`     ${a.path}\n`);
  });
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes("--help") || args.includes("-h")) {
    showHelp();
    return;
  }
  
  if (args.includes("--list") || args.includes("-l")) {
    listArchives();
    return;
  }
  
  let archivePath = args[0];
  
  if (!archivePath) {
    const archives = findArchives();
    if (archives.length === 0) {
      log("No archives found. Build and archive your app in Xcode first.", "red");
      process.exit(1);
    }
    archivePath = archives[0].path;
    log(`Using latest archive: ${basename(archivePath)}`, "green");
  }
  
  if (!existsSync(archivePath)) {
    log(`Archive not found: ${archivePath}`, "red");
    process.exit(1);
  }
  
  const dsymsDir = join(archivePath, "dSYMs");
  if (!existsSync(dsymsDir)) {
    log(`dSYMs folder not found in archive. Is this a valid .xcarchive?`, "red");
    process.exit(1);
  }
  
  const targetDsym = join(dsymsDir, "hermes.framework.dSYM");
  if (existsSync(targetDsym)) {
    log(`hermes.framework.dSYM already exists in archive. Removing old one...`, "yellow");
    rmSync(targetDsym, { recursive: true });
  }
  
  const tmpDir = join(tmpdir(), `hermes-dsym-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
  
  log("\n📥 Downloading Hermes artifacts...", "bold");
  const tarFile = join(tmpDir, "hermes.tar.gz");
  run(`curl -L -o "${tarFile}" "${MAVEN_URL}"`);
  
  log("\n📦 Extracting...", "bold");
  run(`tar -xzf "${tarFile}" -C "${tmpDir}"`);
  
  const hermesFramework = join(
    tmpDir,
    "destroot/Library/Frameworks/universal/hermes.xcframework/ios-arm64/hermes.framework"
  );
  
  if (!existsSync(hermesFramework)) {
    log(`Hermes framework not found at expected path`, "red");
    log(`Looking in: ${hermesFramework}`, "yellow");
    rmSync(tmpDir, { recursive: true });
    process.exit(1);
  }
  
  log("\n🔧 Generating dSYM...", "bold");
  const generatedDsym = join(tmpDir, "hermes.framework.dSYM");
  run(`dsymutil "${join(hermesFramework, "hermes")}" -o "${generatedDsym}"`);
  
  if (!existsSync(generatedDsym)) {
    log(`Failed to generate dSYM`, "red");
    rmSync(tmpDir, { recursive: true });
    process.exit(1);
  }
  
  log("\n💉 Injecting into archive...", "bold");
  cpSync(generatedDsym, targetDsym, { recursive: true });
  
  log("\n🧹 Cleaning up...", "bold");
  rmSync(tmpDir, { recursive: true });
  
  log("\n✅ Success!", "green");
  log(`\nHermes dSYM injected into:\n  ${archivePath}`, "cyan");
  log(`\nNext steps:`, "bold");
  log(`  1. Open Xcode → Window → Organizer`);
  log(`  2. Select your archive`);
  log(`  3. Click "Distribute App" and retry TestFlight upload`);
}

main().catch(e => {
  log(`Error: ${e.message}`, "red");
  process.exit(1);
});
