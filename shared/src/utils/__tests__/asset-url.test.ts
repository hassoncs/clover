import { describe, it, expect } from 'vitest';
import {
  buildR2Key,
  getAssetUrl,
  isR2Key,
} from '../asset-url';

describe('buildR2Key', () => {
  it('constructs R2 key path', () => {
    const path = buildR2Key('g1', 'p1', 'a1');
    expect(path).toBe('generated/g1/p1/a1.png');
  });

  it('works with UUIDs', () => {
    const path = buildR2Key(
      '550e8400-e29b-41d4-a716-446655440000',
      '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      '7c9e6679-7425-40de-944b-e07fc1f90ae7'
    );
    expect(path).toBe(
      'generated/550e8400-e29b-41d4-a716-446655440000/6ba7b810-9dad-11d1-80b4-00c04fd430c8/7c9e6679-7425-40de-944b-e07fc1f90ae7.png'
    );
  });
});

describe('getAssetUrl', () => {
  it('constructs full URL from R2 key', () => {
    const url = getAssetUrl('generated/g1/p1/a1.png', 'https://cdn.com');
    expect(url).toBe('https://cdn.com/generated/g1/p1/a1.png');
  });

  it('handles trailing slash in base URL', () => {
    const url = getAssetUrl('generated/g1/p1/a1.png', 'https://cdn.com/');
    expect(url).toBe('https://cdn.com/generated/g1/p1/a1.png');
  });
});

describe('isR2Key', () => {
  it('returns true for generated/ prefixed paths', () => {
    expect(isR2Key('generated/g1/p1/a1.png')).toBe(true);
  });

  it('returns false for absolute URLs', () => {
    expect(isR2Key('https://cdn.com/generated/g1/p1/a1.png')).toBe(false);
  });

  it('returns false for other paths', () => {
    expect(isR2Key('/assets/generated/foo.png')).toBe(false);
    expect(isR2Key('550e8400-e29b-41d4-a716-446655440000')).toBe(false);
  });
});
