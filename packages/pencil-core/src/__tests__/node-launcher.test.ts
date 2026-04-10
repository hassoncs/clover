import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NodePencilRuntimeLauncher } from "../session/node-launcher";

const cleanupPaths: string[] = [];

async function createRepoRoot() {
	const root = await mkdtemp(join(tmpdir(), "pencil-core-launcher-"));
	cleanupPaths.push(root);
	return root;
}

afterEach(async () => {
	await Promise.all(
		cleanupPaths
			.splice(0)
			.map((path) => rm(path, { recursive: true, force: true })),
	);
});

describe("NodePencilRuntimeLauncher", () => {
	it("passes per-session server configuration through env", async () => {
		const repoRoot = await createRepoRoot();
		const spawnImpl = vi.fn(
			() =>
				({
					pid: 4321,
					exitCode: null,
					kill: vi.fn(),
					unref: vi.fn(),
				}) as never,
		);
		const fetchSpy = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue({ ok: true } as Response);
		const launcher = new NodePencilRuntimeLauncher({
			repoRoot,
			spawnImpl,
			waitForHealthcheckMs: 1_000,
		});

		const result = await launcher.launch({
			sessionId: "pen_a3f8b2c1",
			projectRoot: "/tmp/project-a",
			filePath: "documents/main.pen",
			port: 8123,
			runtimeUrl: "http://127.0.0.1:8123",
			wsUrl: "ws://127.0.0.1:8123/ws",
			mcpUrl: "http://127.0.0.1:8123/mcp",
		});

		expect(result).toMatchObject({
			pid: 4321,
			healthcheckPath: "http://127.0.0.1:8123/health",
		});
		expect(spawnImpl).toHaveBeenCalledWith(
			"pnpm",
			["exec", "tsx", "packages/pencil-server/src/index.ts"],
			expect.objectContaining({
				cwd: repoRoot,
				env: expect.objectContaining({
					PENCIL_SERVER_PORT: "8123",
					PENCIL_PROJECT_ROOT: "/tmp/project-a",
					PENCIL_CANVAS_FILE: "documents/main.pen",
					PENCIL_SESSION_ID: "pen_a3f8b2c1",
				}),
			}),
		);
		expect(fetchSpy).toHaveBeenCalledWith("http://127.0.0.1:8123/health");
		fetchSpy.mockRestore();
	});
});
