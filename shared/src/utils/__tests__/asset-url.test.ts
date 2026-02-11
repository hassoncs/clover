import { describe, it, expect } from 'vitest';
import {
  buildR2Key,
  getAssetUrl,
} from '../asset-url';

describe('buildR2Key', () => {
  it('constructs R2 key path', () => {
    const path = buildR2Key('p1', 'a1');
    expect(path).toBe('packs/p1/a1.png');
  });

  it('works with UUIDs', () => {
    const path = buildR2Key(
      '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      '7c9e6679-7425-40de-944b-e07fc1f90ae7'
    );
    expect(path).toBe(
      'packs/6ba7b810-9dad-11d1-80b4-00c04fd430c8/7c9e6679-7425-40de-944b-e07fc1f90ae7.png'
    );
  });
});

describe('getAssetUrl', () => {
  it('constructs full URL from R2 key', () => {
    const url = getAssetUrl('p1/a1.png', 'https://cdn.com');
    expect(url).toBe('https://cdn.com/p1/a1.png');
  });

  it('handles trailing slash in base URL', () => {
    const url = getAssetUrl('p1/a1.png', 'https://cdn.com/');
    expect(url).toBe('https://cdn.com/p1/a1.png');
  });

  it('returns local URL in offline mode', () => {
    const url = getAssetUrl('p1/a1.png', 'https://cdn.com', {
      offlineMode: true,
      localServerUrl: 'http://localhost:8765',
    });
    expect(url).toBe('http://localhost:8765/p1/a1.png');
  });
});
