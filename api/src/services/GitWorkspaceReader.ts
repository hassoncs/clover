import type { GitService } from "./git/GitService";

export interface WorkspaceFile {
	path: string;
	content: string;
}

export interface WorkspaceReadResult {
	files: WorkspaceFile[];
	errors: string[];
}

export interface WorkspaceReader {
	listFiles(gameId: string): Promise<string[]>;
	readFile(gameId: string, filePath: string): Promise<string | null>;
	readAllFiles(gameId: string): Promise<WorkspaceReadResult>;
}

export class GitWorkspaceReader implements WorkspaceReader {
	constructor(private readonly gitService: GitService) {}

	async listFiles(gameId: string): Promise<string[]> {
		return this.gitService.listFiles(gameId);
	}

	async readFile(gameId: string, filePath: string): Promise<string | null> {
		const data = await this.gitService.readFile(gameId, filePath);
		if (!data) return null;
		return new TextDecoder().decode(data);
	}

	async readAllFiles(gameId: string): Promise<WorkspaceReadResult> {
		const files: WorkspaceFile[] = [];
		const errors: string[] = [];

		const paths = await this.listFiles(gameId);

		for (const filePath of paths) {
			try {
				const content = await this.readFile(gameId, filePath);
				if (content !== null) {
					files.push({ path: filePath, content });
				} else {
					errors.push(`File listed but not readable: ${filePath}`);
				}
			} catch (err) {
				errors.push(
					`Failed to read ${filePath}: ${err instanceof Error ? err.message : String(err)}`,
				);
			}
		}

		return { files, errors };
	}
}
