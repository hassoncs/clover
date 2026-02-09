#!/usr/bin/env node

/**
 * Preflight check for native builds.
 *
 * Validates that the Metro port configuration is correct before building.
 * This catches misconfigurations that would produce a binary hardcoded to
 * the wrong port (8081 instead of 8085).
 *
 * Run automatically via package.json preios/preandroid/prepods hooks,
 * or manually: node scripts/preflight-check.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const EXPECTED_PORT = '8085';

let errors = [];
let warnings = [];

// 1. Check Podfile.properties.json
const podfilePropsPath = path.join(appRoot, 'ios', 'Podfile.properties.json');
if (fs.existsSync(podfilePropsPath)) {
  const props = JSON.parse(fs.readFileSync(podfilePropsPath, 'utf8'));

  if (props['ios.buildReactNativeFromSource'] !== 'true') {
    errors.push(
      `ios/Podfile.properties.json: "ios.buildReactNativeFromSource" is not "true".\n` +
      `  Prebuilt binaries have port 8081 hardcoded. Port ${EXPECTED_PORT} will NOT work.\n` +
      `  Fix: Run "npx expo prebuild --clean" to regenerate (withMetroPort plugin will set it).`
    );
  }
} else {
  warnings.push(
    `ios/Podfile.properties.json not found. If building iOS, run "npx expo prebuild" first.`
  );
}

// 2. Check Podfile has RCT_METRO_PORT
const podfilePath = path.join(appRoot, 'ios', 'Podfile');
if (fs.existsSync(podfilePath)) {
  const podfile = fs.readFileSync(podfilePath, 'utf8');

  if (!podfile.includes(`ENV['RCT_METRO_PORT']`)) {
    errors.push(
      `ios/Podfile: Missing RCT_METRO_PORT setting.\n` +
      `  Fix: Run "npx expo prebuild --clean" to regenerate (withMetroPort plugin will inject it).`
    );
  } else if (!podfile.includes(`ENV['RCT_METRO_PORT'] = '${EXPECTED_PORT}'`)) {
    errors.push(
      `ios/Podfile: RCT_METRO_PORT is set but not to "${EXPECTED_PORT}".\n` +
      `  Fix: Run "npx expo prebuild --clean" to regenerate.`
    );
  }
}

// 3. Check RCT_METRO_PORT env var at runtime
if (process.env.RCT_METRO_PORT && process.env.RCT_METRO_PORT !== EXPECTED_PORT) {
  errors.push(
    `RCT_METRO_PORT env var is "${process.env.RCT_METRO_PORT}" but expected "${EXPECTED_PORT}".`
  );
}

// 4. Check withMetroPort plugin is in app.json
const appJsonPath = path.join(appRoot, 'app.json');
if (fs.existsSync(appJsonPath)) {
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  const plugins = appJson?.expo?.plugins || [];
  const hasPlugin = plugins.some(p =>
    (typeof p === 'string' && p.includes('withMetroPort')) ||
    (Array.isArray(p) && typeof p[0] === 'string' && p[0].includes('withMetroPort'))
  );

  if (!hasPlugin) {
    errors.push(
      `app.json: "withMetroPort" plugin is missing from plugins array.\n` +
      `  Without it, "expo prebuild --clean" won't configure the port correctly.`
    );
  }
}

// Report
if (warnings.length > 0) {
  console.log('\n⚠️  Preflight warnings:');
  for (const w of warnings) console.log(`  ⚠️  ${w}`);
}

if (errors.length > 0) {
  console.error('\n❌ Preflight check FAILED:');
  for (const e of errors) console.error(`\n  ❌ ${e}`);
  console.error(
    `\n  The native build will produce a binary that connects to the WRONG Metro port.` +
    `\n  See docs/shared/reference/metro-port-configuration.md for details.\n`
  );
  process.exit(1);
} else {
  console.log(`✅ Preflight check passed (Metro port ${EXPECTED_PORT} configured correctly)`);
}
