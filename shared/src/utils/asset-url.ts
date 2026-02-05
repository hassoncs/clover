export interface AssetUrlConfig {
  offlineMode?: boolean;
  localServerUrl?: string;
}

export function buildR2Key(packId: string, assetId: string): string {
  return `packs/${packId}/${assetId}.png`;
}

export function getAssetUrl(
  r2Key: string,
  cdnBaseUrl: string,
  config?: AssetUrlConfig
): string {
  if (config?.offlineMode && config.localServerUrl) {
    const base = config.localServerUrl.replace(/\/$/, '');
    return `${base}/${r2Key}`;
  }
  return `${cdnBaseUrl.replace(/\/$/, '')}/${r2Key}`;
}

export function buildGameFileKey(gameId: string, path: string): string {
  return `games/${gameId}/${path}`;
}

export function resolveFileUrl(r2Key: string, baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, '')}/${r2Key}`;
}
