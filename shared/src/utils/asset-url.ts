const R2_PREFIX = 'generated/';

export interface AssetUrlConfig {
  offlineMode?: boolean;
  localServerUrl?: string;   // "http://localhost:8765" or file:// path
  gameId?: string;
}

export function buildR2Key(gameId: string, packId: string, assetId: string): string {
  return `${R2_PREFIX}${gameId}/${packId}/${assetId}.png`;
}

export function getAssetUrl(
  r2Key: string, 
  cdnBaseUrl: string,
  config?: AssetUrlConfig
): string {
  if (config?.offlineMode && config.gameId && config.localServerUrl) {
    // Return local URL for offline mode
    // Ensure localServerUrl doesn't have trailing slash
    const base = config.localServerUrl.replace(/\/$/, '');
    return `${base}/${config.gameId}/${r2Key}`;
  }
  return `${cdnBaseUrl.replace(/\/$/, '')}/${r2Key}`;
}

export function isR2Key(value: string): boolean {
  return value.startsWith(R2_PREFIX);
}
