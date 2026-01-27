import { describe, it, expect } from 'vitest';
import {
  isLegacyUrl,
  isPassthroughUrl,
  isRelativePath,
  isStoredR2Key,
  constructAssetUrl,
  buildAssetPath,
  resolveAssetReference,
} from '../asset-url';

describe('isPassthroughUrl', () => {
  it('returns true for https URLs', () => {
    expect(isPassthroughUrl('https://example.com/asset.png')).toBe(true);
  });

  it('returns true for http URLs', () => {
    expect(isPassthroughUrl('http://example.com/asset.png')).toBe(true);
  });

  it('returns true for data URLs', () => {
    expect(isPassthroughUrl('data:image/png;base64,abc123')).toBe(true);
  });

  it('returns true for Godot res:// paths', () => {
    expect(isPassthroughUrl('res://sprites/player.png')).toBe(true);
  });

  it('returns false for /assets/ relative paths', () => {
    expect(isPassthroughUrl('/assets/generated/foo.png')).toBe(false);
  });

  it('returns false for stored R2 keys', () => {
    expect(isPassthroughUrl('generated/g1/p1/a1.png')).toBe(false);
  });

  it('returns false for UUID asset IDs', () => {
    expect(isPassthroughUrl('550e8400-e29b-41d4-a716-446655440000')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isPassthroughUrl('')).toBe(false);
  });

  it('is case-insensitive for protocol prefixes', () => {
    expect(isPassthroughUrl('HTTPS://example.com/asset.png')).toBe(true);
    expect(isPassthroughUrl('HTTP://example.com/asset.png')).toBe(true);
  });
});

describe('isRelativePath', () => {
  it('returns true for /assets/ relative paths', () => {
    expect(isRelativePath('/assets/generated/foo.png')).toBe(true);
  });

  it('returns false for absolute URLs', () => {
    expect(isRelativePath('https://example.com/asset.png')).toBe(false);
  });

  it('returns false for stored R2 keys', () => {
    expect(isRelativePath('generated/g1/p1/a1.png')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isRelativePath('')).toBe(false);
  });
});

describe('isStoredR2Key', () => {
  it('returns true for generated/ prefixed paths', () => {
    expect(isStoredR2Key('generated/g1/p1/a1.png')).toBe(true);
  });

  it('returns true for canonical asset paths', () => {
    expect(
      isStoredR2Key(
        'generated/550e8400-e29b-41d4-a716-446655440000/6ba7b810-9dad-11d1-80b4-00c04fd430c8/asset.png'
      )
    ).toBe(true);
  });

  it('returns false for absolute URLs containing generated/', () => {
    expect(isStoredR2Key('https://cdn.com/generated/g1/p1/a1.png')).toBe(false);
  });

  it('returns false for /assets/ relative paths', () => {
    expect(isStoredR2Key('/assets/generated/foo.png')).toBe(false);
  });

  it('returns false for UUID asset IDs', () => {
    expect(isStoredR2Key('550e8400-e29b-41d4-a716-446655440000')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isStoredR2Key('')).toBe(false);
  });
});

describe('isLegacyUrl', () => {
  it('returns true for https URLs', () => {
    expect(isLegacyUrl('https://example.com/asset.png')).toBe(true);
  });

  it('returns true for http URLs', () => {
    expect(isLegacyUrl('http://example.com/asset.png')).toBe(true);
  });

  it('returns true for /assets/ relative paths', () => {
    expect(isLegacyUrl('/assets/generated/foo.png')).toBe(true);
  });

  it('returns true for data URLs', () => {
    expect(isLegacyUrl('data:image/png;base64,abc123')).toBe(true);
  });

  it('returns true for Godot res:// paths', () => {
    expect(isLegacyUrl('res://sprites/player.png')).toBe(true);
  });

  it('returns false for stored R2 keys', () => {
    expect(isLegacyUrl('generated/g1/p1/a1.png')).toBe(false);
  });

  it('returns false for UUID asset IDs', () => {
    expect(isLegacyUrl('550e8400-e29b-41d4-a716-446655440000')).toBe(false);
  });

  it('returns false for simple asset IDs', () => {
    expect(isLegacyUrl('abc123')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isLegacyUrl('')).toBe(false);
  });

  it('is case-insensitive for protocol prefixes', () => {
    expect(isLegacyUrl('HTTPS://example.com/asset.png')).toBe(true);
    expect(isLegacyUrl('HTTP://example.com/asset.png')).toBe(true);
  });
});

describe('constructAssetUrl', () => {
  it('constructs full URL from components', () => {
    const url = constructAssetUrl('https://cdn.com', 'g1', 'p1', 'a1');
    expect(url).toBe('https://cdn.com/generated/g1/p1/a1.png');
  });

  it('handles trailing slash in base URL', () => {
    const url = constructAssetUrl('https://cdn.com/', 'g1', 'p1', 'a1');
    expect(url).toBe('https://cdn.com/generated/g1/p1/a1.png');
  });

  it('works with UUIDs', () => {
    const url = constructAssetUrl(
      'https://api.example.com/assets',
      '550e8400-e29b-41d4-a716-446655440000',
      '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      '7c9e6679-7425-40de-944b-e07fc1f90ae7'
    );
    expect(url).toBe(
      'https://api.example.com/assets/generated/550e8400-e29b-41d4-a716-446655440000/6ba7b810-9dad-11d1-80b4-00c04fd430c8/7c9e6679-7425-40de-944b-e07fc1f90ae7.png'
    );
  });
});

describe('buildAssetPath', () => {
  it('constructs R2 key path', () => {
    const path = buildAssetPath('g1', 'p1', 'a1');
    expect(path).toBe('generated/g1/p1/a1.png');
  });
});

describe('resolveAssetReference', () => {
  const baseUrl = 'https://api.example.com/assets';

  it('returns legacy full URLs as-is', () => {
    const url = resolveAssetReference('https://cdn.com/image.png', baseUrl);
    expect(url).toBe('https://cdn.com/image.png');
  });

  it('prepends base URL to relative /assets/ paths', () => {
    const url = resolveAssetReference('/assets/generated/old.png', baseUrl);
    expect(url).toBe('https://api.example.com/assets/assets/generated/old.png');
  });

  it('returns data URLs as-is', () => {
    const dataUrl = 'data:image/png;base64,abc123';
    const url = resolveAssetReference(dataUrl, baseUrl);
    expect(url).toBe(dataUrl);
  });

  it('returns res:// paths as-is', () => {
    const resUrl = 'res://sprites/player.png';
    const url = resolveAssetReference(resUrl, baseUrl);
    expect(url).toBe(resUrl);
  });

  it('resolves stored R2 keys by prepending base URL', () => {
    const url = resolveAssetReference('generated/g1/p1/a1.png', baseUrl);
    expect(url).toBe('https://api.example.com/assets/generated/g1/p1/a1.png');
  });

  it('resolves stored R2 keys with UUID components', () => {
    const r2Key =
      'generated/550e8400-e29b-41d4-a716-446655440000/6ba7b810-9dad-11d1-80b4-00c04fd430c8/asset.png';
    const url = resolveAssetReference(r2Key, baseUrl);
    expect(url).toBe(`https://api.example.com/assets/${r2Key}`);
  });

  it('handles trailing slash in base URL for R2 keys', () => {
    const url = resolveAssetReference(
      'generated/g1/p1/a1.png',
      'https://api.example.com/assets/'
    );
    expect(url).toBe('https://api.example.com/assets/generated/g1/p1/a1.png');
  });

  it('constructs URL from asset ID when gameId and packId provided', () => {
    const url = resolveAssetReference('uuid-123', baseUrl, 'g1', 'p1');
    expect(url).toBe('https://api.example.com/assets/generated/g1/p1/uuid-123.png');
  });

  it('throws when asset ID provided without gameId/packId', () => {
    expect(() => resolveAssetReference('uuid-123', baseUrl)).toThrow(
      'gameId and packId are required when resolving asset IDs'
    );
  });
});
