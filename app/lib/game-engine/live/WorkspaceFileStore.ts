import type {
	WorkspaceSnapshot,
	WorkspaceSnapshotFile,
} from "@slopcade/shared";

export class WorkspaceFileStore {
	private snapshot: WorkspaceSnapshot | null = null;

	private fileMap = new Map<string, WorkspaceSnapshotFile>();

	update(snapshot: WorkspaceSnapshot): void {
		this.snapshot = snapshot;
		this.fileMap.clear();

		for (const file of snapshot.files) {
			this.fileMap.set(file.filename, file);
		}
	}

	getFile(filename: string): WorkspaceSnapshotFile | undefined {
		return this.fileMap.get(filename);
	}

	getFileContent(filename: string): string | undefined {
		return this.fileMap.get(filename)?.content;
	}

	getRevision(): string | null {
		return this.snapshot?.revision ?? null;
	}

	getAllFiles(): WorkspaceSnapshotFile[] {
		return this.snapshot?.files ?? [];
	}
}
