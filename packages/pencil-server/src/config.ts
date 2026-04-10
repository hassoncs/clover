import path from "node:path";

export interface PencilServerConfig {
	readonly port: number;
	readonly canvasFile: string;
	readonly sessionId: string | null;
	readonly projectRoot: string | null;
	readonly host: string;
}

function parsePort(value: string | undefined, fallback: number): number {
	if (!value) return fallback;
	const port = Number.parseInt(value, 10);
	if (!Number.isFinite(port) || port <= 0) {
		throw new Error(`Invalid PENCIL_SERVER_PORT: ${value}`);
	}
	return port;
}

export function resolvePencilServerConfig(
	env: NodeJS.ProcessEnv = process.env,
): PencilServerConfig {
	const cwd = env.PENCIL_PROJECT_ROOT
		? path.resolve(env.PENCIL_PROJECT_ROOT)
		: process.cwd();
	const canvasFile = env.PENCIL_CANVAS_FILE
		? path.resolve(cwd, env.PENCIL_CANVAS_FILE)
		: path.join(cwd, "canvas.pen");
	return {
		port: parsePort(env.PENCIL_SERVER_PORT, 8090),
		canvasFile,
		sessionId: env.PENCIL_SESSION_ID?.trim() || null,
		projectRoot: env.PENCIL_PROJECT_ROOT ? cwd : null,
		host: env.PENCIL_SERVER_HOST?.trim() || "127.0.0.1",
	};
}
