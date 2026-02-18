import type {
	ArtifactResolver,
	BuildManifest,
	LoadResult,
	PackageLoadState,
	PrefabInstantiateOpts,
	PrefabInstantiateResult,
	TagGroup,
	TagPayloads,
} from "@slopcade/shared";
import { TAG_GROUPS } from "@slopcade/shared";
import type { GodotBridge } from "@slopcade/godot-bridge";
import { PrefabInstantiator } from "./PrefabInstantiator";

const TAG_LOAD_ORDER: readonly TagGroup[] = TAG_GROUPS;

export class PackageRuntimeOrchestrator {
	private readonly bridge: GodotBridge;
	private readonly resolver: ArtifactResolver;
	private readonly prefabInstantiator: PrefabInstantiator;
	private state: PackageLoadState = {
		manifest: null,
		loadedTags: new Set(),
		artifactHashes: {},
		timeMode: "paused",
	};
	private resolvedArtifacts: Partial<Record<TagGroup, unknown>> = {};

	constructor(bridge: GodotBridge, resolver: ArtifactResolver) {
		this.bridge = bridge;
		this.resolver = resolver;
		this.prefabInstantiator = new PrefabInstantiator(bridge);
	}

	setTimeMode(mode: "paused" | "playing"): void {
		this.state.timeMode = mode;
		if (mode === "paused") {
			this.bridge.pausePhysics();
		} else {
			this.bridge.resumePhysics();
		}
	}

	async loadPackage(manifest: BuildManifest): Promise<LoadResult> {
		const startTime = Date.now();
		const errors: LoadResult["errors"] = [];
		const loadedTags: TagGroup[] = [];

		this.state.manifest = manifest;
		this.state.loadedTags.clear();
		this.resolvedArtifacts = {};

		for (const tag of TAG_LOAD_ORDER) {
			const artifact = manifest.artifacts.find((a) => a.tag === tag);
			if (!artifact) continue;

			try {
				const payload = await this.resolver.resolve(manifest, tag);
				this.resolvedArtifacts[tag] = payload;
				this.state.artifactHashes[tag] = artifact.hash;
				loadedTags.push(tag);
				this.state.loadedTags.add(tag);
			} catch (err) {
				errors.push({
					code: "ARTIFACT_NOT_FOUND",
					message: err instanceof Error ? err.message : String(err),
					tag,
				});
			}
		}

		try {
			this.applyWorldToBridge();
			this.applyPrefabsToBridge();
			this.applyEntitiesToBridge();
			await this.applyAssetsToBridge();
		} catch (err) {
			errors.push({
				code: "BRIDGE_ERROR",
				message: err instanceof Error ? err.message : String(err),
			});
			return {
				success: false,
				loadedTags,
				errors,
				durationMs: Date.now() - startTime,
			};
		}

		return {
			success: errors.length === 0,
			loadedTags,
			errors: errors.length > 0 ? errors : undefined,
			durationMs: Date.now() - startTime,
		};
	}

	async loadByTag(tag: TagGroup): Promise<LoadResult> {
		const startTime = Date.now();

		if (!this.state.manifest) {
			return {
				success: false,
				loadedTags: [],
				errors: [
					{
						code: "MANIFEST_INVALID",
						message: "No manifest loaded. Call loadPackage first.",
					},
				],
				durationMs: Date.now() - startTime,
			};
		}

		try {
			const payload = await this.resolver.resolve(this.state.manifest, tag);
			const artifact = this.state.manifest.artifacts.find((a) => a.tag === tag);
			this.resolvedArtifacts[tag] = payload;
			if (artifact) {
				this.state.artifactHashes[tag] = artifact.hash;
			}
			this.state.loadedTags.add(tag);
		} catch (err) {
			return {
				success: false,
				loadedTags: [],
				errors: [
					{
						code: "ARTIFACT_NOT_FOUND",
						message: err instanceof Error ? err.message : String(err),
						tag,
					},
				],
				durationMs: Date.now() - startTime,
			};
		}

		try {
			this.applyTagToBridge(tag);
			if (tag === "assets") {
				await this.applyAssetsToBridge();
			}
		} catch (err) {
			return {
				success: false,
				loadedTags: [tag],
				errors: [
					{
						code: "BRIDGE_ERROR",
						message: err instanceof Error ? err.message : String(err),
					},
				],
				durationMs: Date.now() - startTime,
			};
		}

		return {
			success: true,
			loadedTags: [tag],
			durationMs: Date.now() - startTime,
		};
	}

	async reloadChangedTags(manifest: BuildManifest): Promise<LoadResult> {
		const startTime = Date.now();
		const changedTags: TagGroup[] = [];

		for (const artifact of manifest.artifacts) {
			const currentHash = this.state.artifactHashes[artifact.tag];
			if (currentHash !== artifact.hash) {
				changedTags.push(artifact.tag);
			}
		}

		if (changedTags.length === 0) {
			return {
				success: true,
				loadedTags: [],
				durationMs: Date.now() - startTime,
			};
		}

		this.state.manifest = manifest;

		for (const tag of changedTags) {
			try {
				const payload = await this.resolver.resolve(manifest, tag);
				this.resolvedArtifacts[tag] = payload;
				const artifact = manifest.artifacts.find((a) => a.tag === tag);
				if (artifact) {
					this.state.artifactHashes[tag] = artifact.hash;
				}
				this.state.loadedTags.add(tag);
			} catch (err) {
				return {
					success: false,
					loadedTags: changedTags.filter((t) => this.state.loadedTags.has(t)),
					errors: [
						{
							code: "ARTIFACT_NOT_FOUND",
							message: err instanceof Error ? err.message : String(err),
							tag,
						},
					],
					durationMs: Date.now() - startTime,
				};
			}
		}

		try {
			for (const tag of changedTags) {
				this.applyTagToBridge(tag);
				if (tag === "assets") {
					await this.applyAssetsToBridge();
				}
			}
		} catch (err) {
			return {
				success: false,
				loadedTags: changedTags,
				errors: [
					{
						code: "BRIDGE_ERROR",
						message: err instanceof Error ? err.message : String(err),
					},
				],
				durationMs: Date.now() - startTime,
			};
		}

		return {
			success: true,
			loadedTags: changedTags,
			durationMs: Date.now() - startTime,
		};
	}

	async instantiatePrefab(
		prefabId: string,
		opts?: PrefabInstantiateOpts,
	): Promise<PrefabInstantiateResult> {
		return this.prefabInstantiator.instantiate(prefabId, opts);
	}

	getPrefabInstantiator(): PrefabInstantiator {
		return this.prefabInstantiator;
	}

	getState(): Readonly<PackageLoadState> {
		return this.state;
	}

	private applyTagToBridge(tag: TagGroup): void {
		switch (tag) {
			case "world":
				this.applyWorldToBridge();
				break;
			case "prefabs":
				this.applyPrefabsToBridge();
				break;
			case "entities":
				this.bridge.clearEntities();
				this.applyEntitiesToBridge();
				break;
			case "scripts":
				break;
			case "assets":
				break;
		}
	}

	private applyWorldToBridge(): void {
		const worldPayload = this.resolvedArtifacts.world as
			| TagPayloads["world"]
			| undefined;
		const world = worldPayload?.world ?? {
			gravity: { x: 0, y: 10 },
			pixelsPerMeter: 50,
		};
		const background = worldPayload?.background;
		this.bridge.setupWorld(world, background);
	}

	private applyPrefabsToBridge(): void {
		const prefabsPayload = this.resolvedArtifacts.prefabs as
			| TagPayloads["prefabs"]
			| undefined;
		const prefabs = prefabsPayload?.prefabs ?? {};
		this.bridge.registerPrefabs(prefabs);

		this.prefabInstantiator.clearRegistry();
		for (const [id, prefab] of Object.entries(prefabs)) {
			this.prefabInstantiator.registerPrefab(id, {
				type: "data",
				id,
				entityPrefab: prefab,
			});
		}
	}

	private applyEntitiesToBridge(): void {
		const entitiesPayload = this.resolvedArtifacts.entities as
			| TagPayloads["entities"]
			| undefined;
		const entities = entitiesPayload?.entities ?? [];
		this.bridge.loadEntities(entities);
	}

	private async applyAssetsToBridge(): Promise<void> {
		const assetsPayload = this.resolvedArtifacts.assets as
			| TagPayloads["assets"]
			| undefined;
		if (!assetsPayload?.urls) return;
		const urls = Object.values(assetsPayload.urls);
		if (urls.length > 0) {
			await this.bridge.preloadTextures(urls);
		}
	}
}
