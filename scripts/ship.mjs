#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const mode = args[0];

function run(cmd, cmdArgs, opts = {}) {
  console.log(`\x1b[36m> ${cmd} ${cmdArgs.join(" ")}\x1b[0m`);
  const result = spawnSync(cmd, cmdArgs, {
    stdio: "inherit",
    shell: true,
    ...opts
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!mode || ["help", "--help", "-h"].includes(mode)) {
  console.log(`
\x1b[1mSlopcade Deployment Engine\x1b[0m

Usage:
  \x1b[32mpnpm ship native\x1b[0m     - Build & push to TestFlight (Native Changes)
  \x1b[32mpnpm ship update\x1b[0m     - Push JS-only EAS Update (Web/Logic Changes)
  \x1b[32mpnpm ship metadata\x1b[0m   - Sync App Store metadata via Fastlane
  \x1b[32mpnpm ship web\x1b[0m        - Deploy to Cloudflare Pages (Web version)

Prerequisites:
  - Expo Login: \x1b[34mnpx eas login\x1b[0m
  - Fastlane (for metadata): \x1b[34mbrew install fastlane\x1b[0m
`);
  process.exit(0);
}

const APP_DIR = "app";
const EAS_BIN = "/Users/hassoncs/Library/pnpm/eas";

switch (mode) {
  case "native":
    console.log("🚀 Starting Native Build & TestFlight Submission...");
    run(EAS_BIN, ["build", "--platform", "ios", "--profile", "production", "--auto-submit"], { cwd: APP_DIR });
    break;

  case "update":
    console.log("✨ Pushing JS-only EAS Update...");
    run(EAS_BIN, ["update", "--platform", "ios", "--channel", "production"], { cwd: APP_DIR });
    break;

  case "metadata":
    console.log("📦 Syncing App Store Metadata...");
    run("fastlane", ["deliver_metadata"], { cwd: APP_DIR });
    break;

  case "web":
    console.log("🌐 Deploying to Cloudflare Pages...");
    run("pnpm", ["run", "deploy"], { cwd: APP_DIR });
    break;

  default:
    console.error(`\x1b[31mUnknown mode: ${mode}\x1b[0m`);
    process.exit(1);
}
