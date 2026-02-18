import type {
	WorkspaceSnapshot,
	WorkspaceSnapshotFile,
	WorkspaceTag,
} from "@slopcade/shared";
import { inferTagHints, TAG_GROUPS } from "@slopcade/shared";
import type { GodotBridge } from "@/lib/godot/types";
import { trpc } from "@/lib/trpc/client";
import { HotReloadOrchestrator } from "./HotReloadOrchestrator";
import { TagPayloadResolver } from "./TagPayloadResolver";
import type { HotReloadContext } from "./tag-handlers/types";
import { WorkspaceFileStore } from "./WorkspaceFileStore";

export type PreviewLoadState = "idle" | "loading" | "loaded" | "error";
export type PreviewMode = "author" | "live";

export interface LivePreviewState {
	loadState: PreviewLoadState;
	mode: PreviewMode;
	revision: string | null;
	lastError: string | null;
	isPolling: boolean;
}

interface InitializeOptions {
	pollIntervalMs?: number;
	mode?: PreviewMode;
	activeScene?: string | null;
	runtime?: HotReloadContext["runtime"];
}

interface PollOptions {
	sinceRevision?: string;
	forceFullReset?: boolean;
}

type WorkspaceSnapshotResult =
	| { changed: false }
	| { changed: true; snapshot: WorkspaceSnapshot };

type WorkspaceSnapshotQueryClient = {
	chatThreads: {
		getWorkspaceSnapshot: {
			query: (input: {
				gameId: string;
				sinceRevision?: string;
			}) => Promise<WorkspaceSnapshotResult>;
		};
	};
};

const DEFAULT_POLL_INTERVAL_MS = 1000;

const ALL_TAGS: WorkspaceTag[] = [...TAG_GROUPS];

const DEFAULT_RUNTIME: HotReloadContext["runtime"] = {
	applyScript: async () => undefined,
	applyModules: async () => undefined,
};

function inferTagsFromPaths(paths: string[]): WorkspaceTag[] {
	const tags = new Set<WorkspaceTag>();

	for (const path of paths) {
		for (const tag of inferTagHints(path)) {
			tags.add(tag);
		}
	}

	if (tags.size === 0) {
		return [...ALL_TAGS];
	}

	return ALL_TAGS.filter((tag) => tags.has(tag));
}

function computeTagHashes(
	files: WorkspaceSnapshotFile[],
): Map<WorkspaceTag, string> {
	const hashMap = new Map<WorkspaceTag, string>();

	for (const tag of ALL_TAGS) {
		const fingerprint = files
			.filter((file) => inferTagHints(file.filename).includes(tag))
			.sort((a, b) => a.filename.localeCompare(b.filename))
			.map((file) => `${file.filename}:${file.contentHash}`)
			.join("|");

		hashMap.set(tag, fingerprint);
	}

	return hashMap;
}

function changedPaths(
	previous: WorkspaceSnapshotFile[],
	current: WorkspaceSnapshotFile[],
): string[] {
	const previousHashes = new Map<string, string>();
	const currentHashes = new Map<string, string>();

	for (const file of previous) {
		previousHashes.set(file.filename, file.contentHash);
	}

	for (const file of current) {
		currentHashes.set(file.filename, file.contentHash);
	}

	const paths = new Set<string>();

	for (const [filename, hash] of currentHashes) {
		if (previousHashes.get(filename) !== hash) {
			paths.add(filename);
		}
	}

	for (const filename of previousHashes.keys()) {
		if (!currentHashes.has(filename)) {
			paths.add(filename);
		}
	}

	return [...paths];
}

export class LivePreviewController {
	private static instance: LivePreviewController | null = null;

	private readonly fileStore = new WorkspaceFileStore();

	private readonly resolver = new TagPayloadResolver(this.fileStore);

	private state: LivePreviewState = {
		loadState: "idle",
		mode: "author",
		revision: null,
		lastError: null,
		isPolling: false,
	};

	private pollIntervalMs = DEFAULT_POLL_INTERVAL_MS;

	private gameId: string | null = null;

	private lastSnapshot: WorkspaceSnapshot | null = null;

	private context: HotReloadContext | null = null;

	private orchestrator: HotReloadOrchestrator | null = null;

	private pollTimer: ReturnType<typeof setTimeout> | null = null;

	private pollInFlight = false;

	private constructor() {}

	static getInstance(): LivePreviewController {
		if (!LivePreviewController.instance) {
			LivePreviewController.instance = new LivePreviewController();
		}

		return LivePreviewController.instance;
	}

	static destroy(): void {
		LivePreviewController.instance?.dispose();
		LivePreviewController.instance = null;
	}

	async initialize(
		gameId: string,
		bridge: GodotBridge,
		options: InitializeOptions = {},
	): Promise<void> {
		this.stopPolling();

		this.pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
		this.gameId = gameId;
		this.lastSnapshot = null;
		this.state.mode = options.mode ?? this.state.mode;
		this.state.revision = null;
		this.state.lastError = null;
		this.state.loadState = "loading";

		this.context = {
			mode: this.state.mode,
			activeScene: options.activeScene ?? null,
			bridge,
			runtime: options.runtime ?? DEFAULT_RUNTIME,
		};
		this.orchestrator = new HotReloadOrchestrator(this.context, this.resolver);

		bridge.setInspectMode(this.state.mode === "author");

		try {
			await this.pollSnapshot({ forceFullReset: true });
			this.state.loadState = "loaded";
		} catch (error) {
			this.state.loadState = "error";
			this.state.lastError =
				error instanceof Error ? error.message : "Failed to initialize preview";
			throw error;
		}

		this.startPolling();
	}

	dispose(): void {
		this.stopPolling();
		this.gameId = null;
		this.lastSnapshot = null;
		this.context = null;
		this.orchestrator = null;
		this.state.revision = null;
		this.state.loadState = "idle";
		this.state.lastError = null;
	}

	async reset(): Promise<void> {
		if (!this.gameId || !this.context) {
			return;
		}

		this.state.loadState = "loading";
		this.state.lastError = null;
		this.state.revision = null;
		this.lastSnapshot = null;
		this.orchestrator = new HotReloadOrchestrator(this.context, this.resolver);

		await this.pollSnapshot({ forceFullReset: true });
		this.state.loadState = "loaded";
	}

	async setMode(mode: PreviewMode): Promise<void> {
		if (!this.context || !this.orchestrator || this.state.mode === mode) {
			return;
		}

		this.state.mode = mode;
		this.context.mode = mode;
		this.context.bridge.setInspectMode(mode === "author");

		if (mode === "live" && this.lastSnapshot) {
			this.state.loadState = "loading";
			await this.orchestrator.fullReset(ALL_TAGS);
			this.state.loadState = "loaded";
		}
	}

	getState(): LivePreviewState {
		return { ...this.state };
	}

	isInitialized(): boolean {
		return this.context !== null;
	}

	getGameId(): string | null {
		return this.gameId;
	}

	private startPolling(): void {
		this.state.isPolling = true;
		this.scheduleNextPoll();
	}

	private stopPolling(): void {
		if (this.pollTimer) {
			clearTimeout(this.pollTimer);
			this.pollTimer = null;
		}
		this.state.isPolling = false;
	}

	private scheduleNextPoll(delay = this.pollIntervalMs): void {
		if (!this.state.isPolling) {
			return;
		}

		this.pollTimer = setTimeout(() => {
			void this.pollTick();
		}, delay);
	}

	private async pollTick(): Promise<void> {
		if (this.pollInFlight) {
			this.scheduleNextPoll();
			return;
		}

		this.pollInFlight = true;
		try {
			await this.pollSnapshot({
				sinceRevision: this.state.revision ?? undefined,
			});
		} catch (error) {
			this.state.loadState = "error";
			this.state.lastError =
				error instanceof Error ? error.message : "Failed to poll preview";
		} finally {
			this.pollInFlight = false;
			if (this.state.isPolling) {
				this.scheduleNextPoll();
			}
		}
	}

	private async pollSnapshot({
		sinceRevision,
		forceFullReset,
	}: PollOptions): Promise<void> {
		if (!this.gameId || !this.orchestrator) {
			return;
		}

		const snapshotQueryClient = trpc as unknown as WorkspaceSnapshotQueryClient;
		const result =
			await snapshotQueryClient.chatThreads.getWorkspaceSnapshot.query({
				gameId: this.gameId,
				sinceRevision,
			});

		if (!result.changed) {
			return;
		}

		const previousSnapshot = this.lastSnapshot;
		const snapshot = result.snapshot;

		this.lastSnapshot = snapshot;
		this.state.revision = snapshot.revision;
		this.fileStore.update(snapshot);

		if (forceFullReset) {
			await this.orchestrator.fullReset(ALL_TAGS);
			return;
		}

		if (this.state.mode === "live") {
			await this.orchestrator.fullReset(ALL_TAGS);
			return;
		}

		const paths = previousSnapshot
			? changedPaths(previousSnapshot.files, snapshot.files)
			: snapshot.files.map((file) => file.filename);

		const changedTags = inferTagsFromPaths(paths);
		const hashes = computeTagHashes(snapshot.files);
		await this.orchestrator.reloadTags(changedTags, hashes);
	}
}
