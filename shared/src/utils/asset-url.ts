const LEGACY_URL_PREFIXES = [
  'http://',
  'https://',
  '/assets/',
  'data:',
  'res://',
] as const;

export function isLegacyUrl(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }

  const lowerValue = value.toLowerCase();
  return LEGACY_URL_PREFIXES.some(prefix => lowerValue.startsWith(prefix));
}

export function constructAssetUrl(
  baseUrl: string,
  gameId: string,
  packId: string,
  assetId: string
): string {
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${cleanBaseUrl}/generated/${gameId}/${packId}/${assetId}.png`;
}

export function buildAssetPath(
  gameId: string,
  packId: string,
  assetId: string
): string {
  return `generated/${gameId}/${packId}/${assetId}.png`;
}

export function resolveAssetReference(
  value: string,
  baseUrl: string,
  gameId?: string,
  packId?: string
): string {
  if (isLegacyUrl(value)) {
    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:') || value.startsWith('res://')) {
      return value;
    }
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return `${cleanBaseUrl}${value}`;
  }

  if (!gameId || !packId) {
    throw new Error('gameId and packId are required when resolving asset IDs');
  }

  return constructAssetUrl(baseUrl, gameId, packId, value);
}
