import git, { TREE } from "isomorphic-git";
import { CachedR2Fs } from "@/services/git/CachedR2Fs";
import type { FsPromises } from "@/services/git/R2Fs";
import { R2Fs } from "@/services/git/R2Fs";

type R2Bucket = import("@cloudflare/workers-types").R2Bucket;

interface GameRepoEnv {
	ASSETS: R2Bucket;
}

interface GitFsClient {
	promises: FsPromises & {
		readlink?: (path: string) => Promise<string>;
		symlink?: (target: string, path: string) => Promise<void>;
	};
}

interface CommitRequestBody {
	files: Array<{ path: string; content: string }>;
	message: string;
	author: { name: string; email: string };
}

interface BranchRequestBody {
	name: string;
	ref?: string;
}

interface TagRequestBody {
	name: string;
	ref?: string;
}

function jsonResponse(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

function errorResponse(message: string, status: number): Response {
	return jsonResponse({ error: message }, status);
}

function isNotFoundError(err: unknown): boolean {
	if (err instanceof Error) {
		const code = (err as Error & { code?: string }).code;
		if (code === "ENOENT" || code === "NotFoundError") return true;
		const msg = err.message.toLowerCase();
		return (
			msg.includes("enoent") ||
			msg.includes("not found") ||
			msg.includes("could not find")
		);
	}
	return false;
}

export class GameRepoDO {
	private env: GameRepoEnv;
	private gitFs: GitFsClient | null = null;
	private cachedR2Fs: CachedR2Fs | null = null;
	private cache: object = {};
	private gameId: string | null = null;
	private workingTree: Map<string, string> | null = null;

	constructor(
		private state: DurableObjectState,
		env: unknown,
	) {
		this.env = env as GameRepoEnv;
	}

	private async getWorkingTree(): Promise<Map<string, string>> {
		if (!this.workingTree) {
			const entries = await this.state.storage.list({ prefix: "wt:" });
			this.workingTree = new Map();
			for (const [key, value] of entries) {
				this.workingTree.set(key.slice(3), value as string);
			}
		}
		return this.workingTree;
	}

	private async seedWorkingTreeFromHead(): Promise<void> {
		const fs = this.getFs();
		try {
			await git.resolveRef({ fs, dir: "/", ref: "HEAD" });
		} catch {
			return;
		}

		try {
			const files = await git.listFiles({
				fs,
				dir: "/",
				ref: "HEAD",
				cache: this.cache,
			});

			const wt = await this.getWorkingTree();
			const headOid = await git.resolveRef({ fs, dir: "/", ref: "HEAD" });

			for (const filepath of files) {
				const { blob } = await git.readBlob({
					fs,
					dir: "/",
					oid: headOid,
					filepath,
					cache: this.cache,
				});
				const content = new TextDecoder().decode(blob);
				wt.set(filepath, content);
				await this.state.storage.put(`wt:${filepath}`, content);
			}
		} catch {
			// HEAD exists but tree may be empty
		}
	}

	private computeRevisionHash(wt: Map<string, string>): string {
		const entries = Array.from(wt.entries()).sort((a, b) =>
			a[0].localeCompare(b[0]),
		);
		let hash = 0x811c9dc5;
		for (const [filename, content] of entries) {
			const str = `${filename}|${content.length}`;
			for (let i = 0; i < str.length; i++) {
				hash ^= str.charCodeAt(i);
				hash = Math.imul(hash, 0x01000193);
			}
		}
		return (hash >>> 0).toString(16).padStart(8, "0");
	}

	private getFs(): GitFsClient {
		if (!this.gitFs) {
			if (!this.gameId) {
				throw new Error("gameId not initialized");
			}
			const r2fs = new R2Fs(this.env.ASSETS, `repos/${this.gameId}/.git`);
			this.cachedR2Fs = new CachedR2Fs(r2fs);
			const inner = this.cachedR2Fs.promises;
			const wrapStat = (fn: typeof inner.stat) => async (path: string) => {
				const s = await fn(path);
				return {
					...s,
					ctimeMs: s.mtimeMs,
					isFile: s.isFile,
					isDirectory: s.isDirectory,
					isSymbolicLink: s.isSymbolicLink,
				};
			};
			this.gitFs = {
				promises: {
					...inner,
					stat: wrapStat(inner.stat),
					lstat: wrapStat(inner.lstat),
					readlink: async () => {
						throw Object.assign(new Error("ENOENT: readlink not supported"), {
							code: "ENOENT",
						});
					},
					symlink: async () => {
						throw new Error("symlink not supported");
					},
				},
			};
		}
		return this.gitFs;
	}

	async fetch(request: Request): Promise<Response> {
		try {
			const url = new URL(request.url);
			const pathname = url.pathname;

			if (!this.gameId) {
				const gameIdHeader = request.headers.get("X-Game-Id");
				if (gameIdHeader) {
					this.gameId = gameIdHeader;
				}
			}

			if (request.headers.get("Upgrade") === "websocket") {
				return this.handleWebSocketUpgrade();
			}

			const method = request.method;

			if (method === "POST" && pathname === "/init") {
				return await this.handleInit(request);
			}
			if (method === "POST" && pathname === "/commit") {
				return await this.handleCommit(request);
			}
			if (method === "GET" && pathname.startsWith("/read/")) {
				return await this.handleRead(url);
			}
			if (method === "GET" && pathname === "/tree") {
				return await this.handleTree(url);
			}
			if (method === "GET" && pathname === "/log") {
				return await this.handleLog(url);
			}
			if (method === "POST" && pathname === "/branch") {
				return await this.handleBranch(request);
			}
			if (method === "POST" && pathname === "/tag") {
				return await this.handleTag(request);
			}
			if (method === "GET" && pathname === "/diff") {
				return await this.handleDiff(url);
			}
			if (method === "POST" && pathname === "/write") {
				return await this.handleWrite(request);
			}
			if (method === "GET" && pathname === "/snapshot") {
				return await this.handleSnapshot(url);
			}

			return errorResponse("Not found", 404);
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Internal server error";
			const status = isNotFoundError(err) ? 404 : 500;
			return errorResponse(message, status);
		}
	}

	private handleWebSocketUpgrade(): Response {
		const [client, server] = Object.values(new WebSocketPair()) as [
			WebSocket,
			WebSocket,
		];
		this.state.acceptWebSocket(server);
		return new Response(null, { status: 101, webSocket: client });
	}

	async webSocketMessage(
		_ws: WebSocket,
		_message: string | ArrayBuffer,
	): Promise<void> {}

	async webSocketClose(
		_ws: WebSocket,
		_code: number,
		_reason: string,
		_wasClean: boolean,
	): Promise<void> {}

	private async handleInit(request: Request): Promise<Response> {
		const body = (await request.json().catch(() => ({}))) as {
			gameId?: string;
		};
		if (body.gameId) {
			this.gameId = body.gameId;
		}
		if (!this.gameId) {
			return errorResponse("gameId is required", 400);
		}

		const fs = this.getFs();
		await git.init({
			fs,
			dir: "/",
			bare: false,
			defaultBranch: "main",
		});

		await this.seedWorkingTreeFromHead();

		return jsonResponse({ ok: true });
	}

	private async handleCommit(request: Request): Promise<Response> {
		const body = await request.json<CommitRequestBody>().catch(() => null);
		if (!body) {
			return errorResponse("Invalid JSON body", 400);
		}
		if (!body.files || !Array.isArray(body.files) || body.files.length === 0) {
			return errorResponse(
				"files array is required and must not be empty",
				400,
			);
		}
		if (!body.message) {
			return errorResponse("message is required", 400);
		}
		if (!body.author?.name || !body.author?.email) {
			return errorResponse("author.name and author.email are required", 400);
		}

		const fs = this.getFs();
		const wt = await this.getWorkingTree();

		for (const file of body.files) {
			await fs.promises.writeFile(file.path, file.content);
			await git.add({
				fs,
				dir: "/",
				filepath: file.path,
				cache: this.cache,
			});

			wt.set(file.path, file.content);
			await this.state.storage.put(`wt:${file.path}`, file.content);
		}

		const sha = await git.commit({
			fs,
			dir: "/",
			message: body.message,
			author: {
				name: body.author.name,
				email: body.author.email,
			},
			cache: this.cache,
		});

		this.broadcastFileChanges(body.files);

		return jsonResponse({ sha });
	}

	private broadcastFileChanges(files: Array<{ path: string }>): void {
		const sockets = this.state.getWebSockets();
		if (sockets.length === 0) return;

		for (const file of files) {
			const message = JSON.stringify({
				type: "FILE_CHANGED",
				gameId: this.gameId,
				filename: file.path,
			});
			for (const ws of sockets) {
				try {
					ws.send(message);
				} catch {
					// ignored: socket may have closed
				}
			}
		}
	}

	private async handleRead(url: URL): Promise<Response> {
		const filepath = url.pathname.slice("/read/".length);
		if (!filepath) {
			return errorResponse("filepath is required", 400);
		}

		const ref = url.searchParams.get("ref");

		if (ref) {
			const fs = this.getFs();
			const oid = await git.resolveRef({ fs, dir: "/", ref });
			const { blob } = await git.readBlob({
				fs,
				dir: "/",
				oid,
				filepath,
				cache: this.cache,
			});
			const content = new TextDecoder().decode(blob);
			return jsonResponse({ content });
		}

		const wt = await this.getWorkingTree();
		const content = wt.get(filepath);
		if (content === undefined) {
			return errorResponse("File not found in working tree", 404);
		}
		return jsonResponse({ content });
	}

	private async handleTree(url: URL): Promise<Response> {
		const ref = url.searchParams.get("ref");

		if (ref) {
			const fs = this.getFs();
			const files = await git.listFiles({
				fs,
				dir: "/",
				ref,
				cache: this.cache,
			});
			return jsonResponse({ files });
		}

		const wt = await this.getWorkingTree();
		const files = Array.from(wt.keys()).sort();
		return jsonResponse({ files });
	}

	private async handleLog(url: URL): Promise<Response> {
		const depth = parseInt(url.searchParams.get("depth") ?? "20", 10);
		const fs = this.getFs();

		const commits = await git.log({
			fs,
			dir: "/",
			depth,
			cache: this.cache,
		});

		const result = commits.map((entry) => ({
			oid: entry.oid,
			message: entry.commit.message,
			author: entry.commit.author,
			committer: entry.commit.committer,
			parent: entry.commit.parent,
			tree: entry.commit.tree,
		}));

		return jsonResponse({ commits: result });
	}

	private async handleBranch(request: Request): Promise<Response> {
		const body = await request.json<BranchRequestBody>().catch(() => null);
		if (!body || !body.name) {
			return errorResponse("name is required", 400);
		}

		const fs = this.getFs();

		await git.branch({
			fs,
			dir: "/",
			ref: body.name,
			object: body.ref,
		});

		return jsonResponse({ ok: true });
	}

	private async handleTag(request: Request): Promise<Response> {
		const body = await request.json<TagRequestBody>().catch(() => null);
		if (!body || !body.name) {
			return errorResponse("name is required", 400);
		}

		const fs = this.getFs();

		await git.tag({
			fs,
			dir: "/",
			ref: body.name,
			object: body.ref,
		});

		return jsonResponse({ ok: true });
	}

	private async handleDiff(url: URL): Promise<Response> {
		const refA = url.searchParams.get("refA");
		const refB = url.searchParams.get("refB");

		if (!refA || !refB) {
			return errorResponse("refA and refB query params are required", 400);
		}

		const fs = this.getFs();

		const changes: Array<{
			path: string;
			type: "add" | "modify" | "delete";
		}> = [];

		await git.walk({
			fs,
			dir: "/",
			trees: [TREE({ ref: refA }), TREE({ ref: refB })],
			map: async (filepath, [entryA, entryB]) => {
				if (filepath === ".") return;

				const typeA = entryA ? await entryA.type() : null;
				const typeB = entryB ? await entryB.type() : null;

				if (typeA === "tree" || typeB === "tree") {
					return;
				}

				const oidA = entryA ? await entryA.oid() : null;
				const oidB = entryB ? await entryB.oid() : null;

				if (oidA === oidB) return;

				if (!oidA && oidB) {
					changes.push({ path: filepath, type: "add" });
				} else if (oidA && !oidB) {
					changes.push({ path: filepath, type: "delete" });
				} else {
					changes.push({ path: filepath, type: "modify" });
				}
			},
			cache: this.cache,
		});

		return jsonResponse({ changes });
	}

	private async handleWrite(request: Request): Promise<Response> {
		const body = await request
			.json<{ files: Array<{ path: string; content: string }> }>()
			.catch(() => null);
		if (!body?.files || !Array.isArray(body.files) || body.files.length === 0) {
			return errorResponse(
				"files array is required and must not be empty",
				400,
			);
		}

		const wt = await this.getWorkingTree();
		const written: string[] = [];

		for (const file of body.files) {
			wt.set(file.path, file.content);
			await this.state.storage.put(`wt:${file.path}`, file.content);
			written.push(file.path);
		}

		this.broadcastFileChanges(body.files);

		return jsonResponse({ ok: true, written });
	}

	private async handleSnapshot(url: URL): Promise<Response> {
		const sinceRevision = url.searchParams.get("sinceRevision");
		const wt = await this.getWorkingTree();
		const revision = this.computeRevisionHash(wt);

		if (sinceRevision && sinceRevision === revision) {
			return jsonResponse({ changed: false, revision });
		}

		const files: Array<{
			filename: string;
			content: string;
			contentHash: string;
			size: number;
		}> = [];

		for (const [filename, content] of wt) {
			let hash = 0x811c9dc5;
			for (let i = 0; i < content.length; i++) {
				hash ^= content.charCodeAt(i);
				hash = Math.imul(hash, 0x01000193);
			}
			files.push({
				filename,
				content,
				contentHash: (hash >>> 0).toString(16).padStart(8, "0"),
				size: content.length,
			});
		}

		return jsonResponse({ changed: true, revision, files });
	}
}
