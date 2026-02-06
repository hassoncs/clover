import { nanoid } from 'nanoid';

type R2Bucket = import('@cloudflare/workers-types').R2Bucket;

export interface StoredDefinitionVersion {
  versionId: string;
  key: string;
  uploadedAt: number;
  size: number;
}

export interface PublishDefinitionResult {
  activeKey: string;
  archivedVersion: StoredDefinitionVersion | null;
}

export interface RollbackDefinitionResult {
  activeKey: string;
  archivedVersion: StoredDefinitionVersion | null;
}

function withNoTrailingSlash(value: string): string {
  return value.replace(/\/$/, '');
}

export class ArtifactManager {
  constructor(private readonly assets: R2Bucket) {}

  getRunFinalDefinitionKey(runId: string): string {
    return `agent-runs/${runId}/final/definition.json`;
  }

  getActiveDefinitionKey(gameId: string): string {
    return `games/${gameId}/definition.json`;
  }

  getVersionDefinitionKey(gameId: string, versionId: string): string {
    return `games/${gameId}/versions/${versionId}/definition.json`;
  }

  getVersionPrefix(gameId: string): string {
    return `games/${gameId}/versions/`;
  }

  getAssetUrl(appUrl: string, key: string): string {
    return `${withNoTrailingSlash(appUrl)}/assets/${key}`;
  }

  async readDefinitionText(key: string): Promise<string | null> {
    const object = await this.assets.get(key);
    if (!object) {
      return null;
    }
    return object.text();
  }

  async readRunFinalDefinition(runId: string): Promise<string | null> {
    return this.readDefinitionText(this.getRunFinalDefinitionKey(runId));
  }

  async listVersions(gameId: string, limit = 100): Promise<StoredDefinitionVersion[]> {
    const listed = await this.assets.list({ prefix: this.getVersionPrefix(gameId), limit });
    return listed.objects
      .filter((object) => object.key.endsWith('/definition.json'))
      .map((object) => {
        const withoutPrefix = object.key.slice(this.getVersionPrefix(gameId).length);
        const versionId = withoutPrefix.split('/')[0] ?? '';
        return {
          versionId,
          key: object.key,
          uploadedAt: object.uploaded.getTime(),
          size: object.size,
        };
      })
      .filter((version) => version.versionId.length > 0)
      .sort((a, b) => b.uploadedAt - a.uploadedAt);
  }

  async publishRunFinalDefinition(params: { runId: string; gameId: string }): Promise<PublishDefinitionResult> {
    const finalKey = this.getRunFinalDefinitionKey(params.runId);
    const finalDefinition = await this.readDefinitionText(finalKey);

    if (!finalDefinition) {
      throw new Error(`Missing final run definition artifact: ${finalKey}`);
    }

    const archivedVersion = await this.archiveCurrentActive(params.gameId);
    const activeKey = this.getActiveDefinitionKey(params.gameId);

    await this.assets.put(activeKey, finalDefinition, {
      httpMetadata: { contentType: 'application/json' },
    });

    return {
      activeKey,
      archivedVersion,
    };
  }

  async rollbackToVersion(params: { gameId: string; versionId: string }): Promise<RollbackDefinitionResult> {
    const sourceKey = this.getVersionDefinitionKey(params.gameId, params.versionId);
    const versionDefinition = await this.readDefinitionText(sourceKey);

    if (!versionDefinition) {
      throw new Error(`Version definition not found: ${sourceKey}`);
    }

    const archivedVersion = await this.archiveCurrentActive(params.gameId);
    const activeKey = this.getActiveDefinitionKey(params.gameId);
    await this.assets.put(activeKey, versionDefinition, {
      httpMetadata: { contentType: 'application/json' },
    });

    return {
      activeKey,
      archivedVersion,
    };
  }

  private async archiveCurrentActive(gameId: string): Promise<StoredDefinitionVersion | null> {
    const activeKey = this.getActiveDefinitionKey(gameId);
    const currentActive = await this.assets.get(activeKey);
    if (!currentActive) {
      return null;
    }

    const activeDefinition = await currentActive.text();
    const versionId = `${Date.now()}-${nanoid(6)}`;
    const key = this.getVersionDefinitionKey(gameId, versionId);

    await this.assets.put(key, activeDefinition, {
      httpMetadata: { contentType: 'application/json' },
    });

    return {
      versionId,
      key,
      uploadedAt: Date.now(),
      size: activeDefinition.length,
    };
  }
}
