import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PencilSessionManager } from "../session/manager";
import { PencilSessionRegistry } from "../session/registry";

const cleanupPaths: string[] = [];

async function createProjectRoot() {
	const root = await mkdtemp(join(tmpdir(), "pencil-core-manager-"));
	cleanupPaths.push(root);
	await mkdir(join(root, "documents", "nested"), { recursive: true });
	await writeFile(
		join(root, "documents", "main.pen"),
		'{"version":1,"children":[]}\n',
	);
	await writeFile(
		join(root, "documents", "nested", "other.pen"),
		'{"version":1,"children":[]}\n',
	);
	return root;
}

afterEach(async () => {
	await Promise.all(
		cleanupPaths
			.splice(0)
			.map((path) => rm(path, { recursive: true, force: true })),
	);
});

describe("PencilSessionManager", () => {
	it("starts, lists, attaches, and stops sessions", async () => {
		const root = await createProjectRoot();
		const registry = new PencilSessionRegistry(
			join(root, ".pencil-registry.json"),
		);
		const launch = vi.fn(async () => ({ pid: undefined }));
		const stop = vi.fn(async () => undefined);
		const manager = new PencilSessionManager(registry, { launch, stop });

		const session = await manager.startSession({
			projectRoot: root,
			filePath: "documents/main.pen",
		});

		expect(launch).toHaveBeenCalledOnce();
		await expect(manager.listSessions()).resolves.toHaveLength(1);
		await expect(
			manager.attachSession(session.sessionId),
		).resolves.toMatchObject({
			sessionId: session.sessionId,
			runtimeUrl: `http://127.0.0.1:${session.port}`,
		});

		await expect(manager.stopSession(session.sessionId)).resolves.toMatchObject(
			{
				status: "stopped",
			},
		);
		expect(stop).toHaveBeenCalledOnce();
	});

	it("discovers .pen files in nested project folders", async () => {
		const root = await createProjectRoot();
		const registry = new PencilSessionRegistry(
			join(root, ".pencil-registry.json"),
		);
		const manager = new PencilSessionManager(registry, {
			launch: async () => ({ pid: undefined }),
		});

		await expect(manager.discoverFiles(root)).resolves.toEqual([
			"documents/main.pen",
			"documents/nested/other.pen",
		]);
	});
});
