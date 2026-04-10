import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PenDocument } from "@slopcade/shared/types/pen";
import { afterEach, describe, expect, it } from "vitest";
import { FilesystemPencilDocumentStore } from "../local/filesystem-store";

const cleanupPaths: string[] = [];

async function createProjectRoot() {
	const root = await mkdtemp(join(tmpdir(), "pencil-core-store-"));
	cleanupPaths.push(root);
	await mkdir(join(root, "documents"), { recursive: true });
	return root;
}

function createFileRef(projectRoot: string, path: string) {
	return {
		session: {
			id: `session:${projectRoot}`,
			project: { root: projectRoot },
		},
		path,
	} as const;
}

function createDocument(id: string): PenDocument {
	return {
		version: 1,
		children: [
			{
				type: "frame",
				id,
				width: 100,
				height: 100,
				children: [],
			},
		],
	};
}

afterEach(async () => {
	await Promise.all(
		cleanupPaths
			.splice(0)
			.map((path) => rm(path, { recursive: true, force: true })),
	);
});

describe("FilesystemPencilDocumentStore", () => {
	it("reads and writes documents per project root", async () => {
		const projectA = await createProjectRoot();
		const projectB = await createProjectRoot();
		const store = new FilesystemPencilDocumentStore();

		await store.save(
			createFileRef(projectA, "documents/main.pen"),
			createDocument("screen-a"),
		);
		await store.save(
			createFileRef(projectB, "documents/main.pen"),
			createDocument("screen-b"),
		);

		await expect(
			store.load(createFileRef(projectA, "documents/main.pen")),
		).resolves.toMatchObject({
			children: [{ id: "screen-a" }],
		});
		await expect(
			store.load(createFileRef(projectB, "documents/main.pen")),
		).resolves.toMatchObject({
			children: [{ id: "screen-b" }],
		});
	});

	it("lists multiple .pen files under the project", async () => {
		const projectRoot = await createProjectRoot();
		const store = new FilesystemPencilDocumentStore();

		await store.save(
			createFileRef(projectRoot, "documents/one.pen"),
			createDocument("one"),
		);
		await store.save(
			createFileRef(projectRoot, "documents/nested/two.pen"),
			createDocument("two"),
		);

		await expect(store.listFiles({ root: projectRoot })).resolves.toEqual([
			"documents/nested/two.pen",
			"documents/one.pen",
		]);
	});

	it("rejects project-root traversal", async () => {
		const projectRoot = await createProjectRoot();
		const store = new FilesystemPencilDocumentStore();

		await expect(
			store.load(createFileRef(projectRoot, "../escape.pen")),
		).rejects.toThrow("Path escapes project root");
	});
});
