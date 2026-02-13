import type {
	BackgroundConfig,
	BuildManifest,
	EntityPrefab,
	GameEntity,
	PackageArtifact,
	TagGroup,
	TagPayloads,
	WorkspaceManifest,
	WorldConfig,
} from "@slopcade/shared";

type GameRule = Record<string, unknown>;

import { TAG_GROUPS, WORKSPACE_CONVENTIONS } from "@slopcade/shared";
import type { BuildArtifactWriter } from "./BuildArtifactWriter";
import type { WorkspaceFile, WorkspaceReader } from "./GitWorkspaceReader";

export interface CompileDiagnostic {
	severity: "error" | "warning";
	message: string;
	file?: string;
	tag?: TagGroup;
}

export interface CompileResult {
	buildId: string;
	manifest: BuildManifest;
	diagnostics: CompileDiagnostic[];
	processedFiles: string[];
	success: boolean;
	artifactData?: Array<{ tag: TagGroup; data: unknown; hash: string }>;
}

interface ParsedWorkspace {
	manifest: WorkspaceManifest | null;
	world: { world: WorldConfig; background?: BackgroundConfig } | null;
	prefabs: Record<string, EntityPrefab>;
	entities: GameEntity[];
	rules: GameRule[];
	scripts: string;
	assetUrls: Record<string, string>;
	diagnostics: CompileDiagnostic[];
	processedFiles: string[];
}

function contentHash(data: unknown): string {
	const json = JSON.stringify(data);
	let hash = 0;
	for (let i = 0; i < json.length; i++) {
		const char = json.charCodeAt(i);
		hash = ((hash << 5) - hash + char) | 0;
	}
	return Math.abs(hash).toString(16).padStart(8, "0");
}

function generateBuildId(): string {
	const now = Date.now();
	const random = Math.random().toString(36).slice(2, 8);
	return `${now}-${random}`;
}

function tryParseJson(
	content: string,
	filePath: string,
): { data: unknown; error?: CompileDiagnostic } {
	try {
		return { data: JSON.parse(content) };
	} catch (err) {
		return {
			data: null,
			error: {
				severity: "error",
				message: `Invalid JSON in ${filePath}: ${err instanceof Error ? err.message : String(err)}`,
				file: filePath,
			},
		};
	}
}

function parseWorkspace(files: WorkspaceFile[]): ParsedWorkspace {
	const diagnostics: CompileDiagnostic[] = [];
	const processedFiles: string[] = [];

	let manifest: WorkspaceManifest | null = null;
	let world: ParsedWorkspace["world"] = null;
	const prefabs: Record<string, EntityPrefab> = {};
	let entities: GameEntity[] = [];
	let rules: GameRule[] = [];
	const scriptParts: string[] = [];
	const assetUrls: Record<string, string> = {};

	const fileMap = new Map<string, string>();
	for (const f of files) {
		fileMap.set(f.path, f.content);
	}

	const manifestContent = fileMap.get(WORKSPACE_CONVENTIONS.manifest);
	if (manifestContent) {
		processedFiles.push(WORKSPACE_CONVENTIONS.manifest);
		const result = tryParseJson(
			manifestContent,
			WORKSPACE_CONVENTIONS.manifest,
		);
		if (result.error) {
			diagnostics.push(result.error);
		} else {
			manifest = result.data as WorkspaceManifest;
		}
	}

	const worldContent = fileMap.get(WORKSPACE_CONVENTIONS.world);
	if (worldContent) {
		processedFiles.push(WORKSPACE_CONVENTIONS.world);
		const result = tryParseJson(worldContent, WORKSPACE_CONVENTIONS.world);
		if (result.error) {
			diagnostics.push(result.error);
		} else {
			const parsed = result.data as Record<string, unknown>;
			const worldConfig: WorldConfig = {
				gravity: (parsed.gravity as WorldConfig["gravity"]) ?? { x: 0, y: 10 },
				pixelsPerMeter: (parsed.pixelsPerMeter as number) ?? 50,
			};
			if (parsed.bounds) {
				worldConfig.bounds = parsed.bounds as WorldConfig["bounds"];
			}
			world = {
				world: worldConfig,
				background: parsed.background as BackgroundConfig | undefined,
			};
		}
	}

	const entitiesContent = fileMap.get(WORKSPACE_CONVENTIONS.entities);
	if (entitiesContent) {
		processedFiles.push(WORKSPACE_CONVENTIONS.entities);
		const result = tryParseJson(
			entitiesContent,
			WORKSPACE_CONVENTIONS.entities,
		);
		if (result.error) {
			diagnostics.push(result.error);
		} else {
			const parsed = result.data;
			entities = Array.isArray(parsed) ? (parsed as GameEntity[]) : [];
		}
	}

	const rulesContent = fileMap.get(WORKSPACE_CONVENTIONS.rules);
	if (rulesContent) {
		processedFiles.push(WORKSPACE_CONVENTIONS.rules);
		const result = tryParseJson(rulesContent, WORKSPACE_CONVENTIONS.rules);
		if (result.error) {
			diagnostics.push(result.error);
		} else {
			const parsed = result.data;
			rules = Array.isArray(parsed) ? (parsed as GameRule[]) : [];
		}
	}

	const prefabsDir = WORKSPACE_CONVENTIONS.prefabsDir;
	for (const file of files) {
		if (file.path.startsWith(prefabsDir) && file.path.endsWith(".json")) {
			processedFiles.push(file.path);
			const result = tryParseJson(file.content, file.path);
			if (result.error) {
				diagnostics.push(result.error);
				continue;
			}

			const parsed = result.data;
			if (Array.isArray(parsed)) {
				for (const item of parsed) {
					const prefab = item as EntityPrefab;
					if (prefab.id) {
						if (prefabs[prefab.id]) {
							diagnostics.push({
								severity: "warning",
								message: `Duplicate prefab ID "${prefab.id}" in ${file.path}`,
								file: file.path,
								tag: "prefabs",
							});
						}
						prefabs[prefab.id] = prefab;
					}
				}
			} else if (parsed && typeof parsed === "object") {
				const prefab = parsed as EntityPrefab;
				if (prefab.id) {
					if (prefabs[prefab.id]) {
						diagnostics.push({
							severity: "warning",
							message: `Duplicate prefab ID "${prefab.id}" in ${file.path}`,
							file: file.path,
							tag: "prefabs",
						});
					}
					prefabs[prefab.id] = prefab;
				}
			}
		}
	}

	const scriptsDir = WORKSPACE_CONVENTIONS.scriptsDir;
	const scriptFiles = files
		.filter((f) => f.path.startsWith(scriptsDir) && f.path.endsWith(".js"))
		.sort((a, b) => a.path.localeCompare(b.path));

	for (const file of scriptFiles) {
		processedFiles.push(file.path);
		const basename = file.path.slice(scriptsDir.length).replace(/\.js$/, "");
		scriptParts.push(`// --- ${basename} ---\n${file.content}`);
	}

	const singleScript = fileMap.get("script.js");
	if (singleScript) {
		processedFiles.push("script.js");
		if (scriptParts.length === 0) {
			scriptParts.push(singleScript);
		} else {
			scriptParts.unshift(`// --- main ---\n${singleScript}`);
		}
	}

	const assetsDir = WORKSPACE_CONVENTIONS.assetsDir;
	const assetsJsonContent = fileMap.get("assets.json");
	if (assetsJsonContent) {
		processedFiles.push("assets.json");
		const result = tryParseJson(assetsJsonContent, "assets.json");
		if (result.error) {
			diagnostics.push(result.error);
		} else if (result.data && typeof result.data === "object") {
			const parsed = result.data as Record<
				string,
				{ url?: string; remoteUrl?: string; path?: string }
			>;
			for (const [id, entry] of Object.entries(parsed)) {
				const url = entry.url ?? entry.remoteUrl ?? entry.path;
				if (url) {
					assetUrls[id] = url;
				}
			}
		}
	}

	for (const file of files) {
		if (file.path.startsWith(assetsDir) && !file.path.endsWith(".json")) {
			processedFiles.push(file.path);
		}
	}

	const scripts = scriptParts.join("\n\n");

	return {
		manifest,
		world,
		prefabs,
		entities,
		rules,
		scripts,
		assetUrls,
		diagnostics,
		processedFiles,
	};
}

function buildTagPayloads(parsed: ParsedWorkspace): Map<TagGroup, unknown> {
	const payloads = new Map<TagGroup, unknown>();

	const worldPayload: TagPayloads["world"] = {
		world: parsed.world?.world ?? {
			gravity: { x: 0, y: 10 },
			pixelsPerMeter: 50,
		},
		background: parsed.world?.background,
	};
	payloads.set("world", worldPayload);

	const prefabsPayload: TagPayloads["prefabs"] = {
		prefabs: parsed.prefabs,
	};
	payloads.set("prefabs", prefabsPayload);

	const entitiesPayload: TagPayloads["entities"] = {
		entities: parsed.entities,
	};
	payloads.set("entities", entitiesPayload);

	const rulesPayload: TagPayloads["rules"] = {
		rules: parsed.rules,
	};
	payloads.set("rules", rulesPayload);

	const scriptsPayload: TagPayloads["scripts"] = {
		script: parsed.scripts,
	};
	payloads.set("scripts", scriptsPayload);

	const assetsPayload: TagPayloads["assets"] = {
		urls: parsed.assetUrls,
	};
	payloads.set("assets", assetsPayload);

	return payloads;
}

export class PackageCompiler {
	constructor(
		private readonly reader: WorkspaceReader,
		private readonly writer: BuildArtifactWriter,
	) {}

	async compile(gameId: string): Promise<CompileResult> {
		const buildId = generateBuildId();
		const allDiagnostics: CompileDiagnostic[] = [];

		const readResult = await this.reader.readAllFiles(gameId);
		for (const err of readResult.errors) {
			allDiagnostics.push({ severity: "error", message: err });
		}

		if (readResult.files.length === 0) {
			allDiagnostics.push({
				severity: "error",
				message: `No workspace files found for game ${gameId}`,
			});
			return {
				buildId,
				manifest: this.emptyManifest(gameId, buildId),
				diagnostics: allDiagnostics,
				processedFiles: [],
				success: false,
			};
		}

		const parsed = parseWorkspace(readResult.files);
		allDiagnostics.push(...parsed.diagnostics);

		const workspaceManifest: WorkspaceManifest = parsed.manifest ?? {
			id: gameId,
			name: gameId,
			version: "0.0.0",
		};

		const tagPayloads = buildTagPayloads(parsed);

		const artifacts: PackageArtifact[] = [];
		const artifactData: Array<{ tag: TagGroup; data: unknown; hash: string }> =
			[];

		for (const tag of TAG_GROUPS) {
			const payload = tagPayloads.get(tag);
			if (!payload) continue;

			const hash = contentHash(payload);
			const json = JSON.stringify(payload);

			artifacts.push({
				tag,
				hash,
				sizeBytes: new TextEncoder().encode(json).length,
			});

			artifactData.push({ tag, data: payload, hash });
		}

		const buildManifest: BuildManifest = {
			packageManifest: workspaceManifest,
			buildId,
			createdAt: Date.now(),
			artifacts,
		};

		try {
			await this.writer.writeBuild(
				gameId,
				buildId,
				buildManifest,
				artifactData,
			);
		} catch (err) {
			allDiagnostics.push({
				severity: "error",
				message: `Failed to write build artifacts: ${err instanceof Error ? err.message : String(err)}`,
			});
			return {
				buildId,
				manifest: buildManifest,
				diagnostics: allDiagnostics,
				processedFiles: parsed.processedFiles,
				success: false,
				artifactData,
			};
		}

		const hasErrors = allDiagnostics.some((d) => d.severity === "error");

		return {
			buildId,
			manifest: buildManifest,
			diagnostics: allDiagnostics,
			processedFiles: parsed.processedFiles,
			success: !hasErrors,
			artifactData,
		};
	}

	private emptyManifest(gameId: string, buildId: string): BuildManifest {
		return {
			packageManifest: { id: gameId, name: gameId, version: "0.0.0" },
			buildId,
			createdAt: Date.now(),
			artifacts: [],
		};
	}
}

export { parseWorkspace, buildTagPayloads, contentHash, generateBuildId };
