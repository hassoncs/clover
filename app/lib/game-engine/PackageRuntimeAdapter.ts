import type {
	ArtifactResolver,
	BuildManifest,
	GameDefinition,
	LoadResult,
	PackageLoadState,
	PackageRuntimeFlags,
	TagGroup,
	TagPayloads,
} from "@slopcade/shared";
import { DEFAULT_PACKAGE_RUNTIME_FLAGS, TAG_GROUPS } from "@slopcade/shared";
import type { GodotBridge } from "../godot/types";
import { PackageRuntimeOrchestrator } from "./PackageRuntimeOrchestrator";

const TAG_LOAD_ORDER: readonly TagGroup[] = TAG_GROUPS;

export class PackageRuntimeAdapter {
	private readonly bridge: GodotBridge;
	private readonly resolver: ArtifactResolver;
	private flags: PackageRuntimeFlags;
	private orchestrator: PackageRuntimeOrchestrator | null = null;
	private state: PackageLoadState = {
		manifest: null,
		loadedTags: new Set(),
		artifactHashes: {},
		timeMode: "paused",
	};
	private resolvedArtifacts: Partial<Record<TagGroup, unknown>> = {};

	constructor(
		bridge: GodotBridge,
		resolver: ArtifactResolver,
		flags?: Partial<PackageRuntimeFlags>,
	) {
		this.bridge = bridge;
		this.resolver = resolver;
		this.flags = { ...DEFAULT_PACKAGE_RUNTIME_FLAGS, ...flags };
	}

	useNativeLoading(): boolean {
		return this.flags.tagNativeLoading;
	}

	setFlags(flags: Partial<PackageRuntimeFlags>): void {
		this.flags = { ...this.flags, ...flags };
		if (this.flags.tagNativeLoading) {
			this.ensureOrchestrator();
		}
	}

	setTimeMode(mode: "paused" | "playing"): void {
		if (this.flags.tagNativeLoading) {
			this.ensureOrchestrator().setTimeMode(mode);
			this.syncStateFromOrchestrator();
		} else {
			this.state.timeMode = mode;
			if (mode === "paused") {
				this.bridge.pausePhysics();
			} else {
				this.bridge.resumePhysics();
			}
		}
	}

	private ensureOrchestrator(): PackageRuntimeOrchestrator {
		if (!this.orchestrator) {
			this.orchestrator = new PackageRuntimeOrchestrator(
				this.bridge,
				this.resolver,
			);
		}
		return this.orchestrator;
	}

	async loadPackage(manifest: BuildManifest): Promise<LoadResult> {
		if (this.flags.tagNativeLoading) {
			const result = await this.ensureOrchestrator().loadPackage(manifest);
			this.syncStateFromOrchestrator();
			return result;
		}

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

		const definition = this.artifactsToGameDefinition(manifest);

		try {
			const assetUrls = this.getAssetUrls();
			if (assetUrls.length > 0) {
				await this.bridge.preloadTextures(assetUrls);
			}
			await this.bridge.loadGame(definition);
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
		if (this.flags.tagNativeLoading) {
			const result = await this.ensureOrchestrator().loadByTag(tag);
			this.syncStateFromOrchestrator();
			return result;
		}

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

		// Phase 1: reload full game on any tag change
		const definition = this.artifactsToGameDefinition(this.state.manifest);
		try {
			this.bridge.clearGame();
			await this.bridge.loadGame(definition);
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
		if (this.flags.tagNativeLoading) {
			const result =
				await this.ensureOrchestrator().reloadChangedTags(manifest);
			this.syncStateFromOrchestrator();
			return result;
		}

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

		// Phase 1: full reload on any change
		const definition = this.artifactsToGameDefinition(manifest);
		try {
			this.bridge.clearGame();
			await this.bridge.loadGame(definition);
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

	getState(): Readonly<PackageLoadState> {
		if (this.flags.tagNativeLoading && this.orchestrator) {
			return this.orchestrator.getState();
		}
		return this.state;
	}

	private syncStateFromOrchestrator(): void {
		if (this.orchestrator) {
			const orchState = this.orchestrator.getState();
			this.state = {
				manifest: orchState.manifest,
				loadedTags: new Set(orchState.loadedTags),
				artifactHashes: { ...orchState.artifactHashes },
				timeMode: orchState.timeMode,
			};
		}
	}

	private artifactsToGameDefinition(manifest: BuildManifest): GameDefinition {
		const worldPayload = this.resolvedArtifacts.world as
			| TagPayloads["world"]
			| undefined;
		const prefabsPayload = this.resolvedArtifacts.prefabs as
			| TagPayloads["prefabs"]
			| undefined;
		const entitiesPayload = this.resolvedArtifacts.entities as
			| TagPayloads["entities"]
			| undefined;
		const scriptsPayload = this.resolvedArtifacts.scripts as
			| TagPayloads["scripts"]
			| undefined;

		const pkg = manifest.packageManifest;

		const definition: GameDefinition = {
			metadata: {
				id: pkg.id,
				title: pkg.name,
				version: pkg.version,
				slug: pkg.slug,
				description: pkg.description,
				author: pkg.author,
			},
			world: worldPayload?.world ?? {
				gravity: { x: 0, y: 10 },
				pixelsPerMeter: 50,
			},
			background: worldPayload?.background,
			prefabs: prefabsPayload?.prefabs ?? {},
			entities: entitiesPayload?.entities ?? [],
		};

		return definition;
	}

	private getAssetUrls(): string[] {
		const assetsPayload = this.resolvedArtifacts.assets as
			| TagPayloads["assets"]
			| undefined;
		if (!assetsPayload?.urls) return [];
		return Object.values(assetsPayload.urls);
	}
}
