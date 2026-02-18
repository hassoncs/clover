import type {
  ArtifactResolver,
  BuildManifest,
  TagGroup,
  TagPayload,
  PackageArtifact,
} from '@slopcade/shared';

export type ArtifactFetcher = (url: string) => Promise<unknown>;

export interface R2ArtifactResolverOptions {
  baseUrl: string;
  fetcher?: ArtifactFetcher;
}

/** URL pattern: `{baseUrl}/games/{gameId}/build/{buildId}/{tag}.json`. Caches by `{buildId}:{tag}`. */
export class R2ArtifactResolver implements ArtifactResolver {
  private readonly baseUrl: string;
  private readonly fetcher: ArtifactFetcher;
  private readonly cache = new Map<string, { hash: string; data: unknown }>();

  constructor(options: R2ArtifactResolverOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.fetcher = options.fetcher ?? defaultFetcher;
  }

  async resolve<T extends TagGroup>(
    manifest: BuildManifest,
    tag: T,
  ): Promise<TagPayload<T>> {
    const artifact = manifest.artifacts.find(a => a.tag === tag);
    if (!artifact) {
      throw new ArtifactNotFoundError(tag, manifest.buildId);
    }

    const cacheKey = `${manifest.buildId}:${tag}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.hash === artifact.hash) {
      return cached.data as TagPayload<T>;
    }

    const gameId = manifest.packageManifest.id;
    const url = `${this.baseUrl}/games/${gameId}/build/${manifest.buildId}/${tag}.json`;

    const data = await this.fetcher(url);
    this.cache.set(cacheKey, { hash: artifact.hash, data });

    return data as TagPayload<T>;
  }

  isCached(manifest: BuildManifest, tag: TagGroup): boolean {
    const artifact = manifest.artifacts.find(a => a.tag === tag);
    if (!artifact) return false;
    const cached = this.cache.get(`${manifest.buildId}:${tag}`);
    return cached !== undefined && cached.hash === artifact.hash;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getArtifact(manifest: BuildManifest, tag: TagGroup): PackageArtifact | undefined {
    return manifest.artifacts.find(a => a.tag === tag);
  }
}

export class InMemoryArtifactResolver implements ArtifactResolver {
  private readonly data: Map<string, unknown>;

  constructor(artifacts: Partial<Record<TagGroup, unknown>> = {}) {
    this.data = new Map(Object.entries(artifacts));
  }

  async resolve<T extends TagGroup>(
    _manifest: BuildManifest,
    tag: T,
  ): Promise<TagPayload<T>> {
    const payload = this.data.get(tag);
    if (payload === undefined) {
      throw new ArtifactNotFoundError(tag, _manifest.buildId);
    }
    return payload as TagPayload<T>;
  }

  set<T extends TagGroup>(tag: T, data: TagPayload<T>): void {
    this.data.set(tag, data);
  }
}

export class ArtifactNotFoundError extends Error {
  readonly tag: TagGroup;
  readonly buildId: string;

  constructor(tag: TagGroup, buildId: string) {
    super(`Artifact not found for tag "${tag}" in build "${buildId}"`);
    this.name = 'ArtifactNotFoundError';
    this.tag = tag;
    this.buildId = buildId;
  }
}

async function defaultFetcher(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch artifact: ${response.status} ${response.statusText} (${url})`);
  }
  return response.json();
}
