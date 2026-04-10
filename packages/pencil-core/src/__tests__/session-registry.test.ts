import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
	createPencilSessionId,
	createSessionRuntimeUrls,
	PencilSessionRegistry,
} from "../session/registry";

const cleanupPaths: string[] = [];

async function createRegistryPath() {
	const root = await mkdtemp(join(tmpdir(), "pencil-core-registry-"));
	cleanupPaths.push(root);
	return join(root, "registry.json");
}

afterEach(async () => {
	await Promise.all(
		cleanupPaths
			.splice(0)
			.map((path) => rm(path, { recursive: true, force: true })),
	);
});

describe("PencilSessionRegistry", () => {
	it("creates stable session ids from project and file", () => {
		expect(createPencilSessionId("/tmp/project-a", "documents/main.pen")).toBe(
			createPencilSessionId("/tmp/project-a", "documents/main.pen"),
		);
		expect(
			createPencilSessionId("/tmp/project-a", "documents/main.pen"),
		).not.toBe(createPencilSessionId("/tmp/project-b", "documents/main.pen"));
	});

	it("persists sessions and releases ports when stopped", async () => {
		const registryPath = await createRegistryPath();
		const registry = new PencilSessionRegistry(registryPath);
		const sessionId = createPencilSessionId(
			"/tmp/project-a",
			"documents/main.pen",
		);
		const port = await registry.reservePort();
		const urls = createSessionRuntimeUrls(port);

		await registry.upsertSession({
			sessionId,
			projectRoot: "/tmp/project-a",
			filePath: "documents/main.pen",
			port,
			status: "running",
			startedAt: 1,
			lastActivityAt: 1,
			...urls,
		});

		await expect(registry.getSession(sessionId)).resolves.toMatchObject({
			sessionId,
			status: "running",
			port,
		});

		await registry.markStopped(sessionId);

		await expect(registry.getSession(sessionId)).resolves.toMatchObject({
			sessionId,
			status: "stopped",
		});

		const reusedPort = await registry.reservePort();
		expect(reusedPort).toBe(port);
	});
});
