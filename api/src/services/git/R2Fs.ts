type R2Bucket = import("@cloudflare/workers-types").R2Bucket;

class R2FsError extends Error {
	code: string;

	constructor(code: string, message: string) {
		super(message);
		this.name = "R2FsError";
		this.code = code;
	}
}

interface StatResult {
	type: "file" | "dir";
	size: number;
	mtimeMs: number;
	isFile(): boolean;
	isDirectory(): boolean;
	isSymbolicLink(): boolean;
}

function createStat(
	type: "file" | "dir",
	size: number,
	mtimeMs: number,
): StatResult {
	return {
		type,
		size,
		mtimeMs,
		isFile: () => type === "file",
		isDirectory: () => type === "dir",
		isSymbolicLink: () => false,
	};
}

function normalizePath(p: string): string {
	const cleaned = p.replace(/^\/+|\/+$/g, "");
	if (cleaned === "." || cleaned === "") return "";
	return cleaned;
}

export interface FsPromises {
	readFile(
		path: string,
		options?: { encoding?: string } | string,
	): Promise<Uint8Array | string>;
	writeFile(
		path: string,
		data: Uint8Array | string,
		options?: { encoding?: string; mode?: number } | string,
	): Promise<void>;
	unlink(path: string): Promise<void>;
	readdir(path: string, options?: unknown): Promise<string[]>;
	mkdir(
		path: string,
		options?: { recursive?: boolean } | number,
	): Promise<void>;
	rmdir(path: string, options?: unknown): Promise<void>;
	stat(path: string): Promise<StatResult>;
	lstat(path: string): Promise<StatResult>;
}

export class R2Fs {
	private readonly bucket: R2Bucket;
	private readonly prefix: string;

	constructor(bucket: R2Bucket, prefix: string) {
		this.bucket = bucket;
		const normalized = normalizePath(prefix);
		this.prefix = normalized ? normalized + "/" : "";
	}

	private fullKey(path: string): string {
		const normalized = normalizePath(path);
		return this.prefix + normalized;
	}

	get promises(): FsPromises {
		return {
			readFile: async (
				path: string,
				options?: { encoding?: string } | string,
			): Promise<Uint8Array | string> => {
				const key = this.fullKey(path);
				const obj = await this.bucket.get(key);
				if (!obj) {
					throw new R2FsError(
						"ENOENT",
						`ENOENT: no such file or directory, open '${path}'`,
					);
				}

				const encoding =
					typeof options === "string" ? options : options?.encoding;

				if (encoding === "utf8" || encoding === "utf-8") {
					return await obj.text();
				}

				const buffer = await obj.arrayBuffer();
				return new Uint8Array(buffer);
			},

			writeFile: async (
				path: string,
				data: Uint8Array | string,
			): Promise<void> => {
				const key = this.fullKey(path);
				await this.bucket.put(key, data);
			},

			unlink: async (path: string): Promise<void> => {
				const key = this.fullKey(path);
				await this.bucket.delete(key);
			},

			readdir: async (path: string): Promise<string[]> => {
				const normalized = normalizePath(path);
				const dirPrefix = this.prefix + (normalized ? normalized + "/" : "");

				const entries: string[] = [];
				let cursor: string | undefined;

				do {
					const listed = await this.bucket.list({
						prefix: dirPrefix,
						delimiter: "/",
						cursor,
					});

					for (const obj of listed.objects) {
						const name = obj.key.slice(dirPrefix.length);
						if (name && !name.includes("/")) {
							entries.push(name);
						}
					}

					for (const dp of listed.delimitedPrefixes) {
						const name = dp.slice(dirPrefix.length).replace(/\/$/, "");
						if (name) {
							entries.push(name);
						}
					}

					cursor = listed.truncated ? listed.cursor : undefined;
				} while (cursor);

				return entries;
			},

			mkdir: async (): Promise<void> => {
				// no-op: R2 is flat, directories are implicit
			},

			rmdir: async (): Promise<void> => {
				// no-op: R2 is flat, directories are implicit
			},

			stat: async (path: string): Promise<StatResult> => {
				const key = this.fullKey(path);

				const head = await this.bucket.head(key);
				if (head) {
					return createStat("file", head.size, head.uploaded.getTime());
				}

				const dirPrefix = key + "/";
				const listed = await this.bucket.list({
					prefix: dirPrefix,
					limit: 1,
				});

				if (listed.objects.length > 0 || listed.delimitedPrefixes.length > 0) {
					return createStat("dir", 0, 0);
				}

				throw new R2FsError(
					"ENOENT",
					`ENOENT: no such file or directory, stat '${path}'`,
				);
			},

			lstat: async (path: string): Promise<StatResult> => {
				return this.promises.stat(path);
			},
		};
	}
}
