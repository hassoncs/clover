const PASSTHROUGH_PREFIXES = [
  'http://',
  'https://',
  'data:',
  'res://',
] as const;

const RELATIVE_PATH_PREFIXES = ['/assets/'] as const;

const R2_KEY_PREFIX = 'generated/' as const;

export function isPassthroughUrl(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }

  const lowerValue = value.toLowerCase();
  return PASSTHROUGH_PREFIXES.some(prefix => lowerValue.startsWith(prefix));
}

export function isRelativePath(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }

  return RELATIVE_PATH_PREFIXES.some(prefix => value.startsWith(prefix));
}

export function isStoredR2Key(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }

  return value.startsWith(R2_KEY_PREFIX);
}

export function isLegacyUrl(value: string): boolean {
  return isPassthroughUrl(value) || isRelativePath(value);
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
  if (isPassthroughUrl(value)) {
    return value;
  }

  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  if (isRelativePath(value)) {
    return `${cleanBaseUrl}${value}`;
  }

  if (isStoredR2Key(value)) {
    return `${cleanBaseUrl}/${value}`;
  }

  if (!gameId || !packId) {
    throw new Error('gameId and packId are required when resolving asset IDs');
  }

  return constructAssetUrl(baseUrl, gameId, packId, value);
}
