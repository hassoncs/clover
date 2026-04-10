#!/usr/bin/env node

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
	buildPencilRuntimeRoute,
	NodePencilRuntimeLauncher,
	PencilSessionManager,
	PencilSessionRegistry,
} from "@slopcade/pencil-core";

type Command =
	| "list"
	| "start"
	| "stop"
	| "attach"
	| "discover"
	| "status"
	| "render";

function parseFlags(args: string[]) {
	const flags = new Map<string, string | boolean>();
	const positionals: string[] = [];
	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];
		if (!arg.startsWith("--")) {
			positionals.push(arg);
			continue;
		}
		const key = arg.slice(2);
		const next = args[index + 1];
		if (!next || next.startsWith("--")) {
			flags.set(key, true);
			continue;
		}
		flags.set(key, next);
		index += 1;
	}
	return { flags, positionals };
}

function getStringFlag(
	flags: Map<string, string | boolean>,
	name: string,
): string | null {
	const value = flags.get(name);
	return typeof value === "string" ? value : null;
}

function printJson(value: unknown) {
	process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
	const [, , commandArg, ...rest] = process.argv;
	const command = commandArg as Command | undefined;
	if (!command) {
		throw new Error(
			"Usage: pencil-session <list|start|stop|attach|discover|status|render> [...args]",
		);
	}

	const repoRoot = resolve(__dirname, "../../..");
	const registry = new PencilSessionRegistry();
	const manager = new PencilSessionManager(
		registry,
		new NodePencilRuntimeLauncher({ repoRoot }),
	);
	const { flags, positionals } = parseFlags(rest);

	if (command === "list") {
		printJson(await manager.listSessions());
		return;
	}

	if (command === "status") {
		const sessions = await manager.listSessions();
		printJson({
			registryPath: registry["registryPath" as never] ?? null,
			sessionCount: sessions.length,
			sessions,
		});
		return;
	}

	if (command === "discover") {
		const projectRoot = resolve(positionals[0] ?? process.cwd());
		printJson({ projectRoot, files: await manager.discoverFiles(projectRoot) });
		return;
	}

	if (command === "start") {
		const fileArg = positionals[0];
		if (!fileArg) {
			throw new Error("Usage: pencil-session start <file> [--project <root>]");
		}
		const projectRoot = resolve(
			getStringFlag(flags, "project") ?? process.cwd(),
		);
		const filePath = getStringFlag(flags, "project")
			? fileArg
			: existsSync(resolve(projectRoot, fileArg))
				? fileArg
				: positionals[0];
		printJson(await manager.startSession({ projectRoot, filePath }));
		return;
	}

	if (command === "attach") {
		const sessionId = positionals[0];
		if (!sessionId) {
			throw new Error("Usage: pencil-session attach <session-id>");
		}
		printJson(await manager.attachSession(sessionId));
		return;
	}

	if (command === "stop") {
		const sessionId = positionals[0];
		if (!sessionId) {
			throw new Error("Usage: pencil-session stop <session-id>");
		}
		printJson(await manager.stopSession(sessionId));
		return;
	}

	if (command === "render") {
		const sessionId = getStringFlag(flags, "session") ?? positionals[0];
		const filePath = getStringFlag(flags, "file");
		const targetId = getStringFlag(flags, "target");
		if (!sessionId || !filePath) {
			throw new Error(
				"Usage: pencil-session render --session <id> --file <path> [--target <node-id>] [--mode prism]",
			);
		}
		const session = await manager.attachSession(sessionId);
		if (!session) {
			throw new Error(`Unknown session: ${sessionId}`);
		}
		printJson({
			sessionId,
			url: buildPencilRuntimeRoute({
				baseUrl: session.runtimeUrl,
				sessionId,
				projectRoot: session.projectRoot,
				filePath,
				mode:
					(getStringFlag(flags, "mode") as
						| "editor"
						| "embed"
						| "prism"
						| null) ?? "prism",
				targetId,
			}),
		});
		return;
	}

	throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
	const message = error instanceof Error ? error.message : String(error);
	process.stderr.write(`${message}\n`);
	process.exitCode = 1;
});
