import { describe, it, expect } from 'vitest';
import { PropertyRegistry } from '../PropertyRegistry';

describe('PropertyRegistry', () => {
  describe('getMetadata', () => {
    it('returns metadata for known properties', () => {
      const metadata = PropertyRegistry.getMetadata('velocity.x');
      expect(metadata).toEqual({
        scope: 'entity',
        source: 'physics',
        frequency: 'frame',
        type: 'number',
      });
    });

    it('returns undefined for unknown properties', () => {
      const metadata = PropertyRegistry.getMetadata('unknownProperty');
      expect(metadata).toBeUndefined();
    });
  });

  describe('isKnownProperty', () => {
    it('returns true for known properties', () => {
      expect(PropertyRegistry.isKnownProperty('transform.x')).toBe(true);
      expect(PropertyRegistry.isKnownProperty('velocity.y')).toBe(true);
      expect(PropertyRegistry.isKnownProperty('health')).toBe(true);
    });

    it('returns false for unknown properties', () => {
      expect(PropertyRegistry.isKnownProperty('foo.bar')).toBe(false);
    });
  });

  describe('getAllProperties', () => {
    it('returns all registered properties', () => {
      const properties = PropertyRegistry.getAllProperties();
      expect(properties).toContain('transform.x');
      expect(properties).toContain('velocity.x');
      expect(properties).toContain('health');
      expect(properties.length).toBeGreaterThan(0);
    });
  });

  describe('getPropertiesByScope', () => {
    it('returns entity-scoped properties', () => {
      const properties = PropertyRegistry.getPropertiesByScope('entity');
      expect(properties).toContain('transform.x');
      expect(properties).toContain('velocity.x');
      expect(properties).toContain('health');
      expect(properties).not.toContain('score');
    });

    it('returns global-scoped properties', () => {
      const properties = PropertyRegistry.getPropertiesByScope('global');
      expect(properties).toContain('score');
      expect(properties).toContain('lives');
      expect(properties).toContain('time');
      expect(properties).not.toContain('transform.x');
    });
  });

  describe('getPropertiesBySource', () => {
    it('returns physics-sourced properties', () => {
      const properties = PropertyRegistry.getPropertiesBySource('physics');
      expect(properties).toContain('transform.x');
      expect(properties).toContain('velocity.x');
      expect(properties).not.toContain('health');
    });

    it('returns game-sourced properties', () => {
      const properties = PropertyRegistry.getPropertiesBySource('game');
      expect(properties).toContain('health');
      expect(properties).toContain('score');
      expect(properties).not.toContain('velocity.x');
    });
  });

  describe('getPropertiesByFrequency', () => {
    it('returns frame-synced properties', () => {
      const properties = PropertyRegistry.getPropertiesByFrequency('frame');
      expect(properties).toContain('transform.x');
      expect(properties).toContain('velocity.x');
      expect(properties).toContain('time');
    });

    it('returns change-synced properties', () => {
      const properties = PropertyRegistry.getPropertiesByFrequency('change');
      expect(properties).toContain('health');
      expect(properties).toContain('score');
    });

    it('returns static properties', () => {
      const properties = PropertyRegistry.getPropertiesByFrequency('static');
      expect(properties).toContain('maxHealth');
    });
  });

  describe('registerCustomProperty', () => {
    it('registers a new custom property', () => {
      PropertyRegistry.registerCustomProperty('customProp', {
        scope: 'entity',
        source: 'game',
        frequency: 'change',
        type: 'number',
      });

      expect(PropertyRegistry.isKnownProperty('customProp')).toBe(true);
      expect(PropertyRegistry.getMetadata('customProp')).toEqual({
        scope: 'entity',
        source: 'game',
        frequency: 'change',
        type: 'number',
      });
    });

    it('throws when registering duplicate property', () => {
      expect(() => {
        PropertyRegistry.registerCustomProperty('transform.x', {
          scope: 'entity',
          source: 'game',
          frequency: 'frame',
          type: 'number',
        });
      }).toThrow();
    });
  });
});
