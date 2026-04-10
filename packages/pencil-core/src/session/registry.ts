import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";

export type PencilSessionStatus =
	| "starting"
	| "running"
	| "stopping"
	| "stopped"
	| "error";

export interface PencilSessionRecord {
	readonly sessionId: string;
	readonly projectRoot: string;
	readonly filePath: string;
	readonly port: number;
	readonly status: PencilSessionStatus;
	readonly startedAt: number;
	readonly lastActivityAt: number;
	readonly pid?: number;
	readonly runtimeUrl: string;
	readonly wsUrl: string;
	readonly mcpUrl: string;
	readonly error?: string;
}

export interface PencilRegistryFile {
	readonly version: 1;
	readonly sessions: PencilSessionRecord[];
	readonly portAllocations: Record<string, string>;
	readonly updatedAt: number;
}

export const PENCIL_SESSION_PORT_RANGE = {
	start: 8100,
	end: 8199,
} as const;

export function getDefaultPencilRegistryPath(): string {
	return resolve(homedir(), ".local/share/pencil/registry.json");
}

export function createPencilSessionId(
	projectRoot: string,
	filePath: string,
): string {
	const source = `${resolve(projectRoot)}::${filePath}`;
	let hash = 5381;
	for (let index = 0; index < source.length; index += 1) {
		hash = (hash * 33) ^ source.charCodeAt(index);
	}
	return `pen_${(hash >>> 0).toString(16)}`;
}

function createEmptyRegistry(): PencilRegistryFile {
	return {
		version: 1,
		sessions: [],
		portAllocations: {},
		updatedAt: Date.now(),
	};
}

export class PencilSessionRegistry {
	constructor(private readonly registryPath = getDefaultPencilRegistryPath()) {}

	async read(): Promise<PencilRegistryFile> {
		try {
			const raw = await readFile(this.registryPath, "utf8");
			return JSON.parse(raw) as PencilRegistryFile;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") {
				return createEmptyRegistry();
			}
			throw error;
		}
	}

	async write(registry: PencilRegistryFile): Promise<void> {
		await mkdir(dirname(this.registryPath), { recursive: true });
		const nextRegistry: PencilRegistryFile = {
			...registry,
			updatedAt: Date.now(),
		};
		const tempPath = `${this.registryPath}.tmp`;
		await writeFile(
			tempPath,
			`${JSON.stringify(nextRegistry, null, 2)}\n`,
			"utf8",
		);
		await rename(tempPath, this.registryPath);
	}

	async listSessions(): Promise<PencilSessionRecord[]> {
		const registry = await this.read();
		return registry.sessions;
	}

	async getSession(sessionId: string): Promise<PencilSessionRecord | null> {
		const registry = await this.read();
		return (
			registry.sessions.find((session) => session.sessionId === sessionId) ??
			null
		);
	}

	async reservePort(preferredSessionId?: string): Promise<number> {
		const registry = await this.read();
		if (preferredSessionId) {
			const existingSession = registry.sessions.find(
				(session) => session.sessionId === preferredSessionId,
			);
			if (existingSession) return existingSession.port;
		}
		for (
			let port = PENCIL_SESSION_PORT_RANGE.start;
			port <= PENCIL_SESSION_PORT_RANGE.end;
			port += 1
		) {
			if (!registry.portAllocations[String(port)]) {
				return port;
			}
		}
		throw new Error("No Pencil session ports available");
	}

	async upsertSession(record: PencilSessionRecord): Promise<void> {
		const registry = await this.read();
		const sessions = registry.sessions.filter(
			(session) => session.sessionId !== record.sessionId,
		);
		sessions.push(record);
		await this.write({
			...registry,
			sessions: sessions.sort(
				(left, right) => left.startedAt - right.startedAt,
			),
			portAllocations: {
				...registry.portAllocations,
				[String(record.port)]: record.sessionId,
			},
		});
	}

	async markStopped(sessionId: string): Promise<void> {
		const registry = await this.read();
		const target = registry.sessions.find(
			(session) => session.sessionId === sessionId,
		);
		if (!target) return;
		const nextSessions = registry.sessions.map((session) =>
			session.sessionId === sessionId
				? {
						...session,
						status: "stopped" as const,
						lastActivityAt: Date.now(),
					}
				: session,
		);
		const { [String(target.port)]: _removed, ...remainingPorts } =
			registry.portAllocations;
		await this.write({
			...registry,
			sessions: nextSessions,
			portAllocations: remainingPorts,
		});
	}

	async removeSession(sessionId: string): Promise<void> {
		const registry = await this.read();
		const target = registry.sessions.find(
			(session) => session.sessionId === sessionId,
		);
		if (!target) return;
		const { [String(target.port)]: _removed, ...remainingPorts } =
			registry.portAllocations;
		await this.write({
			...registry,
			sessions: registry.sessions.filter(
				(session) => session.sessionId !== sessionId,
			),
			portAllocations: remainingPorts,
		});
	}
}

export function createSessionRuntimeUrls(port: number) {
	return {
		runtimeUrl: `http://127.0.0.1:${port}`,
		wsUrl: `ws://127.0.0.1:${port}/ws`,
		mcpUrl: `http://127.0.0.1:${port}/mcp`,
	};
}
