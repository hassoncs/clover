import { watch } from "node:fs";
import {
	mkdir,
	readdir,
	readFile,
	stat,
	unlink,
	writeFile,
} from "node:fs/promises";
import { dirname, extname, relative, resolve, sep } from "node:path";
import type { PenDocument } from "@slopcade/shared/types/pen";
import { parsePenDocument } from "@slopcade/shared/types/pen";
import type {
	PencilDocumentStore,
	PencilFileRef,
	PencilProjectRef,
} from "../contracts";
import { getPencilProjectLayout } from "./project-layout";

function ensureProjectPath(
	project: PencilProjectRef,
	candidatePath: string,
): string {
	const projectRoot = resolve(project.root);
	const absolutePath = resolve(projectRoot, candidatePath);
	const relativePath = relative(projectRoot, absolutePath);
	if (
		relativePath === "" ||
		relativePath === "." ||
		relativePath.startsWith(`..${sep}`) ||
		relativePath === ".."
	) {
		throw new Error(`Path escapes project root: ${candidatePath}`);
	}
	return absolutePath;
}

function normalizeRelativePenPath(filePath: string): string {
	const normalizedPath = filePath.replace(/\\/g, "/").replace(/^\.\//, "");
	if (!normalizedPath.endsWith(".pen")) {
		throw new Error(`Expected a .pen file path, received: ${filePath}`);
	}
	return normalizedPath;
}

async function collectPenFiles(
	directory: string,
	baseDirectory: string,
): Promise<string[]> {
	const entries = await readdir(directory, { withFileTypes: true });
	const files = await Promise.all(
		entries.map(async (entry) => {
			const absolutePath = resolve(directory, entry.name);
			if (entry.isDirectory()) {
				return collectPenFiles(absolutePath, baseDirectory);
			}
			if (extname(entry.name) !== ".pen") {
				return [] as string[];
			}
			return [relative(baseDirectory, absolutePath).replace(/\\/g, "/")];
		}),
	);
	return files.flat().sort();
}

export class FilesystemPencilDocumentStore implements PencilDocumentStore {
	async load(ref: PencilFileRef): Promise<PenDocument | null> {
		const filePath = this.resolveFilePath(ref);
		try {
			const raw = await readFile(filePath, "utf8");
			return parsePenDocument(JSON.parse(raw));
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") {
				return null;
			}
			throw error;
		}
	}

	async save(ref: PencilFileRef, document: PenDocument): Promise<void> {
		const filePath = this.resolveFilePath(ref);
		await mkdir(dirname(filePath), { recursive: true });
		await writeFile(filePath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
	}

	async exists(ref: PencilFileRef): Promise<boolean> {
		try {
			await stat(this.resolveFilePath(ref));
			return true;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") {
				return false;
			}
			throw error;
		}
	}

	watch(
		ref: PencilFileRef,
		callback: (document: PenDocument) => void,
	): () => void {
		const filePath = this.resolveFilePath(ref);
		const watcher = watch(filePath, async (eventType) => {
			if (eventType !== "change" && eventType !== "rename") return;
			const document = await this.load(ref);
			if (document) callback(document);
		});
		return () => watcher.close();
	}

	async listFiles(project: PencilProjectRef): Promise<string[]> {
		const layout = getPencilProjectLayout(project.root);
		try {
			return await collectPenFiles(layout.documentsDir, project.root);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") {
				return [];
			}
			throw error;
		}
	}

	async delete(ref: PencilFileRef): Promise<boolean> {
		try {
			await unlink(this.resolveFilePath(ref));
			return true;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") {
				return false;
			}
			throw error;
		}
	}

	private resolveFilePath(ref: PencilFileRef): string {
		const normalizedPath = normalizeRelativePenPath(ref.path);
		return ensureProjectPath(ref.session.project, normalizedPath);
	}
}
