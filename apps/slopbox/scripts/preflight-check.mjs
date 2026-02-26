#!/usr/bin/env node

/**
 * Preflight check for builds and dev server startup.
 *
 * Validates:
 * - Metro port configuration (8087 instead of default 8081)
 * - Required environment variables (Supabase credentials via hush)
 *
 * Run automatically via package.json pre* hooks,
 * or manually: node scripts/preflight-check.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const EXPECTED_PORT = "8087";

const errors = [];
const warnings = [];

// 1. Check Podfile.properties.json
const podfilePropsPath = path.join(appRoot, "ios", "Podfile.properties.json");
if (fs.existsSync(podfilePropsPath)) {
	const props = JSON.parse(fs.readFileSync(podfilePropsPath, "utf8"));

	if (props["ios.buildReactNativeFromSource"] !== "true") {
		errors.push(
			`ios/Podfile.properties.json: "ios.buildReactNativeFromSource" is not "true".\n` +
				`  Prebuilt binaries have port 8081 hardcoded. Port ${EXPECTED_PORT} will NOT work.\n` +
				`  Fix: Run "npx expo prebuild --clean" to regenerate (withMetroPort plugin will set it).`,
		);
	}
} else {
	warnings.push(
		`ios/Podfile.properties.json not found. If building iOS, run "npx expo prebuild" first.`,
	);
}

// 2. Check Podfile has RCT_METRO_PORT
const podfilePath = path.join(appRoot, "ios", "Podfile");
if (fs.existsSync(podfilePath)) {
	const podfile = fs.readFileSync(podfilePath, "utf8");

	if (!podfile.includes(`ENV['RCT_METRO_PORT']`)) {
		errors.push(
			`ios/Podfile: Missing RCT_METRO_PORT setting.\n` +
				`  Fix: Run "npx expo prebuild --clean" to regenerate (withMetroPort plugin will inject it).`,
		);
	} else if (!podfile.includes(`ENV['RCT_METRO_PORT'] = '${EXPECTED_PORT}'`)) {
		errors.push(
			`ios/Podfile: RCT_METRO_PORT is set but not to "${EXPECTED_PORT}".\n` +
				`  Fix: Run "npx expo prebuild --clean" to regenerate.`,
		);
	}
}

// 3. Check RCT_METRO_PORT env var at runtime
if (
	process.env.RCT_METRO_PORT &&
	process.env.RCT_METRO_PORT !== EXPECTED_PORT
) {
	errors.push(
		`RCT_METRO_PORT env var is "${process.env.RCT_METRO_PORT}" but expected "${EXPECTED_PORT}".`,
	);
}

// 4. Check withMetroPort plugin is in app.json
const appJsonPath = path.join(appRoot, "app.json");
if (fs.existsSync(appJsonPath)) {
	const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));
	const plugins = appJson?.expo?.plugins || [];
	const hasPlugin = plugins.some(
		(p) =>
			(typeof p === "string" && p.includes("withMetroPort")) ||
			(Array.isArray(p) &&
				typeof p[0] === "string" &&
				p[0].includes("withMetroPort")),
	);

	if (!hasPlugin) {
		errors.push(
			`app.json: "withMetroPort" plugin is missing from plugins array.\n` +
				`  Without it, "expo prebuild --clean" won't configure the port correctly.`,
		);
	}
}

// 5. Check Supabase credentials are present (injected by hush)
if (!process.env.EXPO_PUBLIC_SUPABASE_URL) {
	errors.push(
		`EXPO_PUBLIC_SUPABASE_URL is not set.\n` +
			`  Auth will fail at runtime ("Supabase client not initialized").\n` +
			`  Fix: Start Metro via devmux ("pnpm dev") or prefix with "npx hush run -t app --".`,
	);
}

if (!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
	errors.push(
		`EXPO_PUBLIC_SUPABASE_ANON_KEY is not set.\n` +
			`  Auth will fail at runtime ("Supabase client not initialized").\n` +
			`  Fix: Start Metro via devmux ("pnpm dev") or prefix with "npx hush run -t app --".`,
	);
}

// Report
if (warnings.length > 0) {
	console.log("\n⚠️  Preflight warnings:");
	for (const w of warnings) console.log(`  ⚠️  ${w}`);
}

if (errors.length > 0) {
	console.error("\n❌ Preflight check FAILED:");
	for (const e of errors) console.error(`\n  ❌ ${e}`);
	console.error(
		`\n  Fix: Use "pnpm dev" from the repo root to start services correctly.` +
			`\n  Never run "expo start" directly — it bypasses hush secret injection.\n`,
	);
	process.exit(1);
} else {
	console.log(
		`✅ Preflight check passed (port ${EXPECTED_PORT}, credentials ✓)`,
	);
}
