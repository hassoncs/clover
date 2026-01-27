import { describe, it, expect, beforeEach } from 'vitest';
import { TagRegistry, getGlobalTagRegistry, resetGlobalTagRegistry } from '../TagRegistry';

describe('TagRegistry', () => {
  let registry: TagRegistry;

  beforeEach(() => {
    registry = new TagRegistry();
  });

  describe('intern', () => {
    it('should return a numeric ID for a new tag', () => {
      const id = registry.intern('test:tag');
      expect(typeof id).toBe('number');
      expect(id).toBeGreaterThanOrEqual(0);
    });

    it('should return the same ID for the same tag', () => {
      const id1 = registry.intern('test:tag');
      const id2 = registry.intern('test:tag');
      expect(id1).toBe(id2);
    });

    it('should return different IDs for different tags', () => {
      const id1 = registry.intern('tag:one');
      const id2 = registry.intern('tag:two');
      expect(id1).not.toBe(id2);
    });

    it('should handle namespaced tags', () => {
      const id = registry.intern('sys.match3:selected');
      expect(registry.getTag(id)).toBe('sys.match3:selected');
    });
  });

  describe('getId', () => {
    it('should return undefined for non-interned tag', () => {
      expect(registry.getId('nonexistent')).toBeUndefined();
    });

    it('should return the ID for an interned tag', () => {
      const id = registry.intern('test:tag');
      expect(registry.getId('test:tag')).toBe(id);
    });
  });

  describe('getTag', () => {
    it('should return undefined for non-existent ID', () => {
      expect(registry.getTag(999)).toBeUndefined();
    });

    it('should return the tag for a valid ID', () => {
      const id = registry.intern('test:tag');
      expect(registry.getTag(id)).toBe('test:tag');
    });
  });

  describe('has', () => {
    it('should return false for non-interned tag', () => {
      expect(registry.has('nonexistent')).toBe(false);
    });

    it('should return true for interned tag', () => {
      registry.intern('test:tag');
      expect(registry.has('test:tag')).toBe(true);
    });
  });

  describe('size', () => {
    it('should return 0 for empty registry', () => {
      expect(registry.size).toBe(0);
    });

    it('should return correct count after interning', () => {
      registry.intern('tag:one');
      registry.intern('tag:two');
      registry.intern('tag:one'); // duplicate
      expect(registry.size).toBe(2);
    });
  });

  describe('clear', () => {
    it('should remove all interned tags', () => {
      registry.intern('tag:one');
      registry.intern('tag:two');
      registry.clear();
      expect(registry.size).toBe(0);
      expect(registry.has('tag:one')).toBe(false);
    });

    it('should reset ID counter', () => {
      registry.intern('tag:one');
      registry.clear();
      const id = registry.intern('tag:new');
      expect(id).toBe(0);
    });
  });

  describe('getAllTags', () => {
    it('should return empty array for empty registry', () => {
      expect(registry.getAllTags()).toEqual([]);
    });

    it('should return all interned tags', () => {
      registry.intern('tag:one');
      registry.intern('tag:two');
      const tags = registry.getAllTags();
      expect(tags).toContain('tag:one');
      expect(tags).toContain('tag:two');
      expect(tags).toHaveLength(2);
    });
  });
});

describe('Global TagRegistry', () => {
  beforeEach(() => {
    resetGlobalTagRegistry();
  });

  it('should return the same instance', () => {
    const registry1 = getGlobalTagRegistry();
    const registry2 = getGlobalTagRegistry();
    expect(registry1).toBe(registry2);
  });

  it('should reset to a new instance', () => {
    const registry1 = getGlobalTagRegistry();
    registry1.intern('test');
    resetGlobalTagRegistry();
    const registry2 = getGlobalTagRegistry();
    expect(registry2.has('test')).toBe(false);
  });
});
