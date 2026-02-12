type DurableObjectNamespace =
	import("@cloudflare/workers-types").DurableObjectNamespace;

interface FileChange {
	path: string;
	content: string;
}

interface Author {
	name: string;
	email: string;
}

interface Commit {
	oid: string;
	message: string;
	author: { name: string; email: string; timestamp: number };
	committer?: { name: string; email: string; timestamp: number };
	parent?: string[];
	tree?: string;
}

interface FileDiff {
	path: string;
	type: "add" | "modify" | "delete";
}

export class GitService {
	constructor(private doNamespace: DurableObjectNamespace) {}

	private getDO(gameId: string) {
		const id = this.doNamespace.idFromName(gameId);
		return this.doNamespace.get(id);
	}

	private async doFetch(
		gameId: string,
		path: string,
		init?: RequestInit,
	): Promise<Response> {
		const stub = this.getDO(gameId);
		return stub.fetch(
			new Request(`https://git-repo${path}`, {
				...init,
				headers: { "X-Game-Id": gameId, ...(init?.headers || {}) },
			}),
		);
	}

	async initRepo(gameId: string): Promise<void> {
		const response = await this.doFetch(gameId, "/init", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ gameId }),
		});

		if (!response.ok) {
			const error = (await response
				.json<{ error?: string }>()
				.catch(() => ({}))) as { error?: string };
			throw new Error(
				error.error || `Failed to initialize repo: ${response.statusText}`,
			);
		}
	}

	async commitFiles(
		gameId: string,
		files: FileChange[],
		message: string,
		author: Author,
	): Promise<string> {
		const response = await this.doFetch(gameId, "/commit", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ files, message, author }),
		});

		if (!response.ok) {
			const error = (await response
				.json<{ error?: string }>()
				.catch(() => ({}))) as { error?: string };
			throw new Error(
				error.error || `Failed to commit files: ${response.statusText}`,
			);
		}

		const result = await response.json<{ sha: string }>();
		return result.sha;
	}

	async readFile(
		gameId: string,
		path: string,
		ref?: string,
	): Promise<Uint8Array | null> {
		const url = `/read/${path}${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`;
		const response = await this.doFetch(gameId, url, {
			method: "GET",
		});

		if (response.status === 404) {
			return null;
		}

		if (!response.ok) {
			const error = (await response
				.json<{ error?: string }>()
				.catch(() => ({}))) as { error?: string };
			throw new Error(
				error.error || `Failed to read file: ${response.statusText}`,
			);
		}

		const result = await response.json<{ content: string }>();
		return new TextEncoder().encode(result.content);
	}

	async listFiles(gameId: string, ref?: string): Promise<string[]> {
		const url = `/tree${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`;
		const response = await this.doFetch(gameId, url, {
			method: "GET",
		});

		if (!response.ok) {
			const error = (await response
				.json<{ error?: string }>()
				.catch(() => ({}))) as { error?: string };
			throw new Error(
				error.error || `Failed to list files: ${response.statusText}`,
			);
		}

		const result = await response.json<{ files: string[] }>();
		return result.files;
	}

	async log(gameId: string, depth?: number): Promise<Commit[]> {
		const url = `/log${depth ? `?depth=${depth}` : ""}`;
		const response = await this.doFetch(gameId, url, {
			method: "GET",
		});

		if (!response.ok) {
			const error = (await response
				.json<{ error?: string }>()
				.catch(() => ({}))) as { error?: string };
			throw new Error(
				error.error || `Failed to get log: ${response.statusText}`,
			);
		}

		const result = await response.json<{ commits: Commit[] }>();
		return result.commits;
	}

	async createBranch(
		gameId: string,
		name: string,
		ref?: string,
	): Promise<void> {
		const response = await this.doFetch(gameId, "/branch", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name, ref }),
		});

		if (!response.ok) {
			const error = (await response
				.json<{ error?: string }>()
				.catch(() => ({}))) as { error?: string };
			throw new Error(
				error.error || `Failed to create branch: ${response.statusText}`,
			);
		}
	}

	async createTag(gameId: string, name: string, ref?: string): Promise<void> {
		const response = await this.doFetch(gameId, "/tag", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name, ref }),
		});

		if (!response.ok) {
			const error = (await response
				.json<{ error?: string }>()
				.catch(() => ({}))) as { error?: string };
			throw new Error(
				error.error || `Failed to create tag: ${response.statusText}`,
			);
		}
	}

	async diffTrees(
		gameId: string,
		refA: string,
		refB: string,
	): Promise<FileDiff[]> {
		const url = `/diff?refA=${encodeURIComponent(refA)}&refB=${encodeURIComponent(refB)}`;
		const response = await this.doFetch(gameId, url, {
			method: "GET",
		});

		if (!response.ok) {
			const error = (await response
				.json<{ error?: string }>()
				.catch(() => ({}))) as { error?: string };
			throw new Error(
				error.error || `Failed to diff trees: ${response.statusText}`,
			);
		}

		const result = await response.json<{ changes: FileDiff[] }>();
		return result.changes;
	}
}
