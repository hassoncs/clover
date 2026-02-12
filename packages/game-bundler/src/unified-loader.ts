import type { GameDefinition } from "@slopcade/shared";
import { existsSync, statSync } from "fs";
import { basename, join } from "path";
import { compileBundle } from "./compiler";

export type GameFormat = "bundle" | "unknown";

export interface LoadGameResult {
	success: boolean;
	gameDefinition: GameDefinition | null;
	metadata: { title: string; description?: string } | null;
	format: GameFormat;
	errors: string[];
}

export function detectGameFormat(gamePath: string): GameFormat {
	if (!existsSync(gamePath)) {
		return "unknown";
	}

	const stat = statSync(gamePath);

	if (stat.isFile()) {
		return "unknown";
	}

	if (stat.isDirectory()) {
		const manifestPath = join(gamePath, "manifest.json");
		if (existsSync(manifestPath)) {
			return "bundle";
		}

		const bundleSubdir = join(gamePath, ".bundle", "manifest.json");
		if (existsSync(bundleSubdir)) {
			return "bundle";
		}
	}

	return "unknown";
}

export function loadGameFromPath(gamePath: string): LoadGameResult {
	const format = detectGameFormat(gamePath);

	if (format === "unknown") {
		return {
			success: false,
			gameDefinition: null,
			metadata: null,
			format,
			errors: [`Unable to detect game format at: ${gamePath}`],
		};
	}

	if (format === "bundle") {
		let bundlePath = gamePath;

		if (!existsSync(join(gamePath, "manifest.json"))) {
			const bundleSubdir = join(gamePath, ".bundle");
			if (existsSync(join(bundleSubdir, "manifest.json"))) {
				bundlePath = bundleSubdir;
			}
		}

		const result = compileBundle(bundlePath);

		const manifest = result.rawData.manifest || {};
		const metadata = {
			title:
				(manifest.title as string) ||
				(manifest.name as string) ||
				basename(gamePath),
			description: manifest.description as string | undefined,
		};

		return {
			success: result.success,
			gameDefinition: result.gameDefinition,
			metadata,
			format,
			errors: result.errors.map((e) => e.message),
		};
	}

	return {
		success: false,
		gameDefinition: null,
		metadata: null,
		format: "unknown",
		errors: ["Unexpected format"],
	};
}

export interface ScanGamesResult {
	id: string;
	path: string;
	format: GameFormat;
}

export function scanGamesDirectory(
	baseDir: string,
	options?: { includeSubdirs?: string[] },
): ScanGamesResult[] {
	const results: ScanGamesResult[] = [];
	const subdirs = options?.includeSubdirs || [""];

	for (const subdir of subdirs) {
		const dir = subdir ? join(baseDir, subdir) : baseDir;
		if (!existsSync(dir)) continue;

		const stat = statSync(dir);
		if (!stat.isDirectory()) continue;

		const { readdirSync } = require("fs");
		const entries = readdirSync(dir, { withFileTypes: true });

		for (const entry of entries) {
			if (!entry.isDirectory()) continue;

			const gamePath = join(dir, entry.name);
			const format = detectGameFormat(gamePath);

			if (format !== "unknown") {
				results.push({
					id: entry.name,
					path: gamePath,
					format,
				});
			}
		}
	}

	return results.sort((a, b) => a.id.localeCompare(b.id));
}
