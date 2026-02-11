type R2Bucket = import('@cloudflare/workers-types').R2Bucket;

import type { BuildManifest, TagGroup } from '@slopcade/shared';

export interface WriteArtifactParams {
  gameId: string;
  buildId: string;
  tag: TagGroup;
  data: unknown;
  hash: string;
}

export interface WriteBuildResult {
  manifestKey: string;
  artifactKeys: string[];
}

export class BuildArtifactWriter {
  constructor(private readonly bucket: R2Bucket) {}

  private buildKey(gameId: string, buildId: string, filename: string): string {
    return `games/${gameId}/build/${buildId}/${filename}`;
  }

  private artifactFilename(tag: TagGroup): string {
    return `${tag}.json`;
  }

  async writeArtifact(params: WriteArtifactParams): Promise<string> {
    const filename = this.artifactFilename(params.tag);
    const key = this.buildKey(params.gameId, params.buildId, filename);
    const json = JSON.stringify(params.data);

    await this.bucket.put(key, json, {
      httpMetadata: { contentType: 'application/json' },
      customMetadata: {
        tag: params.tag,
        hash: params.hash,
        buildId: params.buildId,
      },
    });

    return key;
  }

  async writeManifest(
    gameId: string,
    buildId: string,
    manifest: BuildManifest,
  ): Promise<string> {
    const key = this.buildKey(gameId, buildId, 'manifest.json');
    const json = JSON.stringify(manifest);

    await this.bucket.put(key, json, {
      httpMetadata: { contentType: 'application/json' },
      customMetadata: { buildId },
    });

    return key;
  }

  async writeBuild(
    gameId: string,
    buildId: string,
    manifest: BuildManifest,
    artifacts: Array<{ tag: TagGroup; data: unknown; hash: string }>,
  ): Promise<WriteBuildResult> {
    const artifactKeys: string[] = [];

    for (const artifact of artifacts) {
      const key = await this.writeArtifact({
        gameId,
        buildId,
        tag: artifact.tag,
        data: artifact.data,
        hash: artifact.hash,
      });
      artifactKeys.push(key);
    }

    const manifestKey = await this.writeManifest(gameId, buildId, manifest);

    return { manifestKey, artifactKeys };
  }
}
