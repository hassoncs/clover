import type { FsPromises, R2Fs } from "./R2Fs";

interface CacheEntry<V> {
	value: V;
	byteSize: number;
	expiresAt: number | null;
	prev: CacheEntry<V> | null;
	next: CacheEntry<V> | null;
	key: string;
}

class LRUCache<V> {
	private readonly maxBytes: number;
	private currentBytes = 0;
	private readonly map = new Map<string, CacheEntry<V>>();
	private head: CacheEntry<V> | null = null;
	private tail: CacheEntry<V> | null = null;

	constructor(maxBytes: number) {
		this.maxBytes = maxBytes;
	}

	get(key: string): V | undefined {
		const entry = this.map.get(key);
		if (!entry) return undefined;

		if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
			this.deleteEntry(entry);
			return undefined;
		}

		this.moveToHead(entry);
		return entry.value;
	}

	set(key: string, value: V, byteSize: number, ttlMs: number | null): void {
		const existing = this.map.get(key);
		if (existing) {
			this.currentBytes -= existing.byteSize;
			existing.value = value;
			existing.byteSize = byteSize;
			existing.expiresAt = ttlMs !== null ? Date.now() + ttlMs : null;
			this.currentBytes += byteSize;
			this.moveToHead(existing);
		} else {
			const entry: CacheEntry<V> = {
				key,
				value,
				byteSize,
				expiresAt: ttlMs !== null ? Date.now() + ttlMs : null,
				prev: null,
				next: null,
			};
			this.map.set(key, entry);
			this.currentBytes += byteSize;
			this.addToHead(entry);
		}

		while (this.currentBytes > this.maxBytes && this.tail) {
			this.deleteEntry(this.tail);
		}
	}

	delete(key: string): boolean {
		const entry = this.map.get(key);
		if (!entry) return false;
		this.deleteEntry(entry);
		return true;
	}

	clear(): void {
		this.map.clear();
		this.head = null;
		this.tail = null;
		this.currentBytes = 0;
	}

	get size(): number {
		return this.map.size;
	}

	get bytes(): number {
		return this.currentBytes;
	}

	private deleteEntry(entry: CacheEntry<V>): void {
		this.removeFromList(entry);
		this.map.delete(entry.key);
		this.currentBytes -= entry.byteSize;
	}

	private addToHead(entry: CacheEntry<V>): void {
		entry.prev = null;
		entry.next = this.head;
		if (this.head) {
			this.head.prev = entry;
		}
		this.head = entry;
		if (!this.tail) {
			this.tail = entry;
		}
	}

	private removeFromList(entry: CacheEntry<V>): void {
		if (entry.prev) {
			entry.prev.next = entry.next;
		} else {
			this.head = entry.next;
		}
		if (entry.next) {
			entry.next.prev = entry.prev;
		} else {
			this.tail = entry.prev;
		}
		entry.prev = null;
		entry.next = null;
	}

	private moveToHead(entry: CacheEntry<V>): void {
		if (this.head === entry) return;
		this.removeFromList(entry);
		this.addToHead(entry);
	}
}

type CachedData = Uint8Array | string;

interface StatResult {
	type: "file" | "dir";
	size: number;
	mtimeMs: number;
	isFile(): boolean;
	isDirectory(): boolean;
	isSymbolicLink(): boolean;
}

const REFS_TTL_MS = 5_000;
const DEFAULT_MAX_BYTES = 64 * 1024 * 1024; // 64MB — conservative for Workers 128MB limit

function estimateByteSize(data: CachedData): number {
	if (typeof data === "string") {
		return data.length * 2;
	}
	return data.byteLength;
}

function estimateStatByteSize(): number {
	return 128;
}

type PathCategory = "immutable" | "refs" | "other";

function categorize(path: string): PathCategory {
	if (
		path.startsWith("objects/") ||
		path.endsWith(".idx") ||
		path.endsWith(".pack")
	) {
		return "immutable";
	}
	if (path.startsWith("refs/") || path === "HEAD" || path === "packed-refs") {
		return "refs";
	}
	return "other";
}

function ttlForCategory(category: PathCategory): number | null {
	switch (category) {
		case "immutable":
			return null;
		case "refs":
			return REFS_TTL_MS;
		case "other":
			return null;
	}
}

function shouldCache(category: PathCategory): boolean {
	return category === "immutable" || category === "refs";
}

export class CachedR2Fs {
	private readonly inner: R2Fs;
	private readonly dataCache: LRUCache<CachedData>;
	private readonly statCache: LRUCache<StatResult>;

	constructor(inner: R2Fs, maxCacheBytes: number = DEFAULT_MAX_BYTES) {
		this.inner = inner;
		this.dataCache = new LRUCache<CachedData>(maxCacheBytes);
		this.statCache = new LRUCache<StatResult>(Math.floor(maxCacheBytes / 8));
	}

	clearCache(): void {
		this.dataCache.clear();
		this.statCache.clear();
	}

	get cacheSize(): number {
		return this.dataCache.size + this.statCache.size;
	}

	get cacheBytes(): number {
		return this.dataCache.bytes + this.statCache.bytes;
	}

	get promises(): FsPromises {
		return {
			readFile: async (
				path: string,
				options?: { encoding?: string } | string,
			): Promise<Uint8Array | string> => {
				const category = categorize(path);
				const encoding =
					typeof options === "string" ? options : options?.encoding;
				const cacheKey = encoding ? `${path}::${encoding}` : path;

				if (shouldCache(category)) {
					const cached = this.dataCache.get(cacheKey);
					if (cached !== undefined) {
						return cached;
					}
				}

				const result = await this.inner.promises.readFile(path, options);

				if (shouldCache(category)) {
					this.dataCache.set(
						cacheKey,
						result,
						estimateByteSize(result),
						ttlForCategory(category),
					);
				}

				return result;
			},

			writeFile: async (
				path: string,
				data: Uint8Array | string,
				options?: { encoding?: string; mode?: number } | string,
			): Promise<void> => {
				await this.inner.promises.writeFile(path, data, options);

				this.invalidatePath(path);

				const category = categorize(path);
				if (shouldCache(category)) {
					const ttl = ttlForCategory(category);
					const size = estimateByteSize(data);

					if (typeof data === "string") {
						this.dataCache.set(path, data, size, ttl);
						this.dataCache.set(`${path}::utf8`, data, size, ttl);
						this.dataCache.set(`${path}::utf-8`, data, size, ttl);
					} else {
						this.dataCache.set(path, data, size, ttl);
					}
				}
			},

			unlink: async (path: string): Promise<void> => {
				await this.inner.promises.unlink(path);
				this.invalidatePath(path);
			},

			readdir: async (path: string, options?: unknown): Promise<string[]> => {
				return this.inner.promises.readdir(path, options);
			},

			mkdir: async (
				path: string,
				options?: { recursive?: boolean } | number,
			): Promise<void> => {
				return this.inner.promises.mkdir(path, options);
			},

			rmdir: async (path: string, options?: unknown): Promise<void> => {
				return this.inner.promises.rmdir(path, options);
			},

			stat: async (path: string): Promise<StatResult> => {
				const category = categorize(path);
				const statKey = `stat::${path}`;

				if (shouldCache(category)) {
					const cached = this.statCache.get(statKey);
					if (cached !== undefined) {
						return cached;
					}
				}

				const result = await this.inner.promises.stat(path);

				if (shouldCache(category)) {
					this.statCache.set(
						statKey,
						result,
						estimateStatByteSize(),
						ttlForCategory(category),
					);
				}

				return result;
			},

			lstat: async (path: string): Promise<StatResult> => {
				return this.promises.stat(path);
			},
		};
	}

	private invalidatePath(path: string): void {
		this.dataCache.delete(path);
		this.dataCache.delete(`${path}::utf8`);
		this.dataCache.delete(`${path}::utf-8`);
		this.statCache.delete(`stat::${path}`);
	}
}
