import type {
	BackgroundConfig,
	EntityPrefab,
	GameEntity,
	TagPayloads,
	WorkspaceTag,
	WorldConfig,
} from "@slopcade/shared";
import type { WorkspaceFileStore } from "./WorkspaceFileStore";

const PREFABS_PREFIX = "prefabs/";
const SCRIPTS_PREFIX = "scripts/";
const SHADERS_PREFIX = "shaders/";
const SCENES_PREFIX = "scenes/";

const SCENE_LOCAL_JSON_TAGS: ReadonlySet<WorkspaceTag> = new Set([
	"world",
	"prefabs",
	"entities",
	"effects",
]);

export class TagPayloadResolver {
	constructor(private readonly store: WorkspaceFileStore) {}

	resolve<T>(tag: WorkspaceTag, activeScene?: string | null): T | null {
		try {
			switch (tag) {
				case "world":
					return this.resolveWorld(activeScene) as T;
				case "prefabs":
					return this.resolvePrefabs(activeScene) as T;
				case "entities":
					return this.resolveEntities(activeScene) as T;
				case "scripts":
					return this.resolveScripts() as T;
				case "effects":
					return this.resolveEffects(activeScene) as T;
				case "assets":
					return this.resolveAssets() as T;
				default:
					return null;
			}
		} catch {
			return null;
		}
	}

	private getFilePath(tag: WorkspaceTag, activeScene?: string | null): string {
		if (activeScene && SCENE_LOCAL_JSON_TAGS.has(tag)) {
			const scenePath = `${SCENES_PREFIX}${activeScene}/${tag}.json`;
			if (this.store.getFile(scenePath)) {
				return scenePath;
			}
		}

		return `${tag}.json`;
	}

	private resolveWorld(
		activeScene?: string | null,
	): TagPayloads["world"] | null {
		const content = this.store.getFileContent(
			this.getFilePath("world", activeScene),
		);
		if (!content) {
			return null;
		}

		const parsed = JSON.parse(content) as unknown;
		if (!parsed || typeof parsed !== "object") {
			return null;
		}

		const worldContainer = parsed as {
			world?: WorldConfig;
			background?: BackgroundConfig;
		};

		if (worldContainer.world) {
			return {
				world: worldContainer.world,
				background: worldContainer.background,
			};
		}

		return {
			world: parsed as WorldConfig,
			background: undefined,
		};
	}

	private resolvePrefabs(
		activeScene?: string | null,
	): TagPayloads["prefabs"] | null {
		const jsonContent = this.store.getFileContent(
			this.getFilePath("prefabs", activeScene),
		);
		if (jsonContent) {
			const parsed = JSON.parse(jsonContent) as unknown;
			const prefabsFromJson = this.parsePrefabsJson(parsed);
			if (prefabsFromJson) {
				return { prefabs: prefabsFromJson };
			}
		}

		const prefabs: Record<string, EntityPrefab> = {};
		const scenePrefix = activeScene
			? `${SCENES_PREFIX}${activeScene}/${PREFABS_PREFIX}`
			: null;
		const sourcePrefix =
			scenePrefix && this.hasFilesForPrefix(scenePrefix)
				? scenePrefix
				: PREFABS_PREFIX;

		for (const file of this.store.getAllFiles()) {
			if (
				!file.filename.startsWith(sourcePrefix) ||
				!file.filename.endsWith(".json")
			) {
				continue;
			}

			const parsed = JSON.parse(file.content) as EntityPrefab;
			const inferredId = this.inferBaseName(file.filename);
			const prefabId = parsed.id || inferredId;
			prefabs[prefabId] = {
				...parsed,
				id: prefabId,
			};
		}

		return { prefabs };
	}

	private resolveEntities(
		activeScene?: string | null,
	): TagPayloads["entities"] | null {
		const content = this.store.getFileContent(
			this.getFilePath("entities", activeScene),
		);
		if (!content) {
			return null;
		}

		const parsed = JSON.parse(content) as unknown;
		if (Array.isArray(parsed)) {
			return { entities: parsed as GameEntity[] };
		}

		const wrapped = parsed as { entities?: GameEntity[] };
		if (Array.isArray(wrapped.entities)) {
			return { entities: wrapped.entities };
		}

		return null;
	}

	private resolveScripts(): TagPayloads["scripts"] {
		const scriptFiles = this.store
			.getAllFiles()
			.filter(
				(file) =>
					file.filename.startsWith(SCRIPTS_PREFIX) &&
					file.filename.endsWith(".js"),
			)
			.sort((a, b) => a.filename.localeCompare(b.filename));

		const modules: Record<string, string> = {};
		for (const file of scriptFiles) {
			const basename = file.filename
				.slice(SCRIPTS_PREFIX.length)
				.replace(/\.js$/, "");
			modules[basename] = file.content;
		}

		const sortedKeys = Object.keys(modules).sort();
		const sortedModules: Record<string, string> = {};
		for (const key of sortedKeys) {
			sortedModules[key] = modules[key];
		}

		const entrypoint = sortedKeys.includes("main") ? "main" : sortedKeys[0];

		return {
			modules: sortedModules,
			entrypoint,
		};
	}

	private resolveEffects(activeScene?: string | null): TagPayloads["effects"] {
		const jsonContent = this.store.getFileContent(
			this.getFilePath("effects", activeScene),
		);
		if (jsonContent) {
			const parsed = JSON.parse(jsonContent) as unknown;
			const effectPayload = this.parseEffectsJson(parsed);
			if (effectPayload) {
				return effectPayload;
			}
		}

		const shaders: Record<string, string> = {};
		const scenePrefix = activeScene
			? `${SCENES_PREFIX}${activeScene}/${SHADERS_PREFIX}`
			: null;
		const sourcePrefix =
			scenePrefix && this.hasFilesForPrefix(scenePrefix)
				? scenePrefix
				: SHADERS_PREFIX;

		for (const file of this.store.getAllFiles()) {
			if (
				!file.filename.startsWith(sourcePrefix) ||
				!file.filename.endsWith(".gdshader")
			) {
				continue;
			}

			const shaderId = this.inferBaseName(file.filename);
			shaders[shaderId] = file.content;
		}

		return {
			plans: {},
			shaders,
		};
	}

	private parsePrefabsJson(
		parsed: unknown,
	): Record<string, EntityPrefab> | null {
		if (!parsed || typeof parsed !== "object") {
			return null;
		}

		if (Array.isArray(parsed)) {
			const prefabs: Record<string, EntityPrefab> = {};
			for (const prefab of parsed as EntityPrefab[]) {
				const prefabId = prefab.id;
				if (!prefabId) {
					continue;
				}
				prefabs[prefabId] = prefab;
			}
			return prefabs;
		}

		const wrapped = parsed as {
			prefabs?: Record<string, EntityPrefab>;
		};
		if (wrapped.prefabs && typeof wrapped.prefabs === "object") {
			return wrapped.prefabs;
		}

		return parsed as Record<string, EntityPrefab>;
	}

	private parseEffectsJson(parsed: unknown): TagPayloads["effects"] | null {
		if (!parsed || typeof parsed !== "object") {
			return null;
		}

		const wrapped = parsed as {
			plans?: TagPayloads["effects"]["plans"];
			shaders?: Record<string, unknown>;
		};

		const shaders: Record<string, string> = {};
		if (wrapped.shaders) {
			for (const [id, value] of Object.entries(wrapped.shaders)) {
				if (typeof value === "string") {
					shaders[id] = value;
				} else if (
					value &&
					typeof value === "object" &&
					"glsl" in value &&
					typeof (value as { glsl: unknown }).glsl === "string"
				) {
					shaders[id] = (value as { glsl: string }).glsl;
				}
			}
		}

		return {
			plans: wrapped.plans ?? {},
			shaders,
		};
	}

	private hasFilesForPrefix(prefix: string): boolean {
		return this.store
			.getAllFiles()
			.some((file) => file.filename.startsWith(prefix));
	}

	private resolveAssets(): TagPayloads["assets"] {
		return {
			urls: {},
		};
	}

	private inferBaseName(filename: string): string {
		const slashIndex = filename.lastIndexOf("/");
		const dotIndex = filename.lastIndexOf(".");
		const start = slashIndex >= 0 ? slashIndex + 1 : 0;

		if (dotIndex <= start) {
			return filename.slice(start);
		}

		return filename.slice(start, dotIndex);
	}
}
