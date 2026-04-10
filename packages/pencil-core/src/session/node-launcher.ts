import { type ChildProcess, spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import type {
	LaunchPencilRuntimeInput,
	LaunchPencilRuntimeResult,
	PencilRuntimeLauncher,
} from "./manager";
import type { PencilSessionRecord } from "./registry";

export interface NodePencilRuntimeLauncherOptions {
	readonly repoRoot: string;
	readonly entryScript?: string;
	readonly waitForHealthcheckMs?: number;
	readonly logsDir?: string;
	readonly spawnImpl?: typeof spawn;
}

async function waitForHealthcheck(
	url: string,
	timeoutMs: number,
): Promise<void> {
	const startedAt = Date.now();
	while (Date.now() - startedAt < timeoutMs) {
		try {
			const response = await fetch(url);
			if (response.ok) {
				return;
			}
		} catch {}
		await new Promise((resolveWait) => setTimeout(resolveWait, 250));
	}
	throw new Error(`Timed out waiting for Pencil runtime healthcheck: ${url}`);
}

export class NodePencilRuntimeLauncher implements PencilRuntimeLauncher {
	private readonly children = new Map<string, ChildProcess>();
	private readonly spawnImpl: typeof spawn;
	private readonly entryScript: string;
	private readonly waitForHealthcheckMs: number;

	constructor(private readonly options: NodePencilRuntimeLauncherOptions) {
		this.spawnImpl = options.spawnImpl ?? spawn;
		this.entryScript =
			options.entryScript ?? "packages/pencil-server/src/index.ts";
		this.waitForHealthcheckMs = options.waitForHealthcheckMs ?? 10_000;
	}

	async launch(
		input: LaunchPencilRuntimeInput,
	): Promise<LaunchPencilRuntimeResult> {
		const existing = this.children.get(input.sessionId);
		if (existing && existing.exitCode === null) {
			return {
				pid: existing.pid,
				healthcheckPath: `${input.runtimeUrl}/health`,
			};
		}

		const logsDir = this.options.logsDir
			? resolve(this.options.logsDir)
			: resolve(
					this.options.repoRoot,
					".sisyphus/evidence/pencil-runtime-logs",
				);
		await mkdir(logsDir, { recursive: true });

		const child = this.spawnImpl("pnpm", ["exec", "tsx", this.entryScript], {
			cwd: this.options.repoRoot,
			env: {
				...process.env,
				PENCIL_SERVER_PORT: String(input.port),
				PENCIL_PROJECT_ROOT: input.projectRoot,
				PENCIL_CANVAS_FILE: input.filePath,
				PENCIL_SESSION_ID: input.sessionId,
				PENCIL_SERVER_HOST: "127.0.0.1",
			},
			stdio: "ignore",
			detached: true,
		});

		child.unref();
		this.children.set(input.sessionId, child);
		await waitForHealthcheck(
			`${input.runtimeUrl}/health`,
			this.waitForHealthcheckMs,
		);
		return {
			pid: child.pid,
			healthcheckPath: `${input.runtimeUrl}/health`,
		};
	}

	async stop(session: PencilSessionRecord): Promise<void> {
		const child = this.children.get(session.sessionId);
		if (child && child.exitCode === null) {
			child.kill("SIGTERM");
			this.children.delete(session.sessionId);
			return;
		}
		if (session.pid) {
			try {
				process.kill(session.pid, "SIGTERM");
			} catch {}
		}
	}
}
