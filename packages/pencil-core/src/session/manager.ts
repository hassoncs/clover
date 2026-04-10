import { readdir } from "node:fs/promises";
import { relative, resolve } from "node:path";
import {
	createPencilSessionId,
	createSessionRuntimeUrls,
	type PencilSessionRecord,
	type PencilSessionRegistry,
} from "./registry";

export interface StartPencilSessionInput {
	readonly projectRoot: string;
	readonly filePath: string;
}

export interface LaunchPencilRuntimeInput {
	readonly sessionId: string;
	readonly projectRoot: string;
	readonly filePath: string;
	readonly port: number;
	readonly runtimeUrl: string;
	readonly wsUrl: string;
	readonly mcpUrl: string;
}

export interface LaunchPencilRuntimeResult {
	readonly pid?: number;
	readonly healthcheckPath?: string;
}

export interface PencilRuntimeLauncher {
	launch(input: LaunchPencilRuntimeInput): Promise<LaunchPencilRuntimeResult>;
	stop?(session: PencilSessionRecord): Promise<void>;
}

function isProcessAlive(pid: number | undefined): boolean {
	if (!pid) return false;
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}

async function discoverPenFilesRecursive(
	root: string,
	current = root,
): Promise<string[]> {
	const entries = await readdir(current, { withFileTypes: true });
	const nested = await Promise.all(
		entries.map(async (entry) => {
			const absolutePath = resolve(current, entry.name);
			if (entry.isDirectory()) {
				return discoverPenFilesRecursive(root, absolutePath);
			}
			if (!entry.name.endsWith(".pen")) return [] as string[];
			return [relative(root, absolutePath).replace(/\\/g, "/")];
		}),
	);
	return nested.flat().sort();
}

export class PencilSessionManager {
	constructor(
		private readonly registry: PencilSessionRegistry,
		private readonly launcher: PencilRuntimeLauncher,
	) {}

	async startSession(
		input: StartPencilSessionInput,
	): Promise<PencilSessionRecord> {
		const projectRoot = resolve(input.projectRoot);
		const filePath = input.filePath.replace(/\\/g, "/");
		const sessionId = createPencilSessionId(projectRoot, filePath);
		const existing = await this.registry.getSession(sessionId);
		if (existing?.status === "running" && isProcessAlive(existing.pid)) {
			return existing;
		}

		const port = await this.registry.reservePort(sessionId);
		const urls = createSessionRuntimeUrls(port);
		const launched = await this.launcher.launch({
			sessionId,
			projectRoot,
			filePath,
			port,
			...urls,
		});
		const now = Date.now();
		const session: PencilSessionRecord = {
			sessionId,
			projectRoot,
			filePath,
			port,
			status: "running",
			startedAt: existing?.startedAt ?? now,
			lastActivityAt: now,
			pid: launched.pid,
			...urls,
		};
		await this.registry.upsertSession(session);
		return session;
	}

	async listSessions(): Promise<PencilSessionRecord[]> {
		return this.registry.listSessions();
	}

	async attachSession(sessionId: string): Promise<PencilSessionRecord | null> {
		const session = await this.registry.getSession(sessionId);
		if (!session) return null;
		if (session.status === "running" && !isProcessAlive(session.pid)) {
			await this.registry.markStopped(sessionId);
			return this.registry.getSession(sessionId);
		}
		return session;
	}

	async stopSession(sessionId: string): Promise<PencilSessionRecord | null> {
		const session = await this.registry.getSession(sessionId);
		if (!session) return null;
		await this.launcher.stop?.(session);
		await this.registry.markStopped(sessionId);
		return this.registry.getSession(sessionId);
	}

	async discoverFiles(projectRoot: string): Promise<string[]> {
		return discoverPenFilesRecursive(resolve(projectRoot));
	}
}
