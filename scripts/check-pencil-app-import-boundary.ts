#!/usr/bin/env npx tsx
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROUTE_ROOT = "apps/pencil/app";
const FORBIDDEN_IMPORTS = [
	"@shopify/react-native-skia",
	"@slopcade/design-canvas",
] as const;

export interface ImportBoundaryViolation {
	filePath: string;
	moduleSpecifier: (typeof FORBIDDEN_IMPORTS)[number];
	line: number;
}

function walkFiles(dir: string): string[] {
	const entries = readdirSync(dir);
	const files: string[] = [];

	for (const entry of entries) {
		const fullPath = join(dir, entry);
		const stat = statSync(fullPath);

		if (stat.isDirectory()) {
			files.push(...walkFiles(fullPath));
			continue;
		}

		if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry)) {
			files.push(fullPath);
		}
	}

	return files;
}

function findForbiddenImport(
	line: string,
): (typeof FORBIDDEN_IMPORTS)[number] | null {
	for (const moduleSpecifier of FORBIDDEN_IMPORTS) {
		if (
			line.includes(`"${moduleSpecifier}"`) ||
			line.includes(`'${moduleSpecifier}'`)
		) {
			return moduleSpecifier;
		}
	}

	return null;
}

export function findPencilAppImportBoundaryViolations(
	rootDir: string,
): ImportBoundaryViolation[] {
	const routeDir = join(rootDir, ROUTE_ROOT);
	if (!existsSync(routeDir)) {
		return [];
	}
	const files = walkFiles(routeDir);
	const violations: ImportBoundaryViolation[] = [];

	for (const filePath of files) {
		const content = readFileSync(filePath, "utf8");
		const lines = content.split(/\r?\n/);

		for (const [index, line] of lines.entries()) {
			const moduleSpecifier = findForbiddenImport(line);
			if (!moduleSpecifier) continue;

			violations.push({
				filePath: relative(rootDir, filePath),
				moduleSpecifier,
				line: index + 1,
			});
		}
	}

	return violations;
}

function main() {
	const rootDir = process.cwd();
	const violations = findPencilAppImportBoundaryViolations(rootDir);

	if (violations.length === 0) {
		console.log(
			`✅ No forbidden Skia/design-canvas imports found in ${ROUTE_ROOT}.`,
		);
		return;
	}

	console.error(`❌ Forbidden imports found in ${ROUTE_ROOT}:`);
	for (const violation of violations) {
		console.error(
			`- ${violation.filePath}:${violation.line} imports ${violation.moduleSpecifier}`,
		);
	}
	console.error(
		"Move Skia/design-canvas imports behind a route-local lazy boundary outside apps/pencil/app/.",
	);
	process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}
