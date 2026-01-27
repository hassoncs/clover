import { describe, it, expect } from 'vitest';
import { TypeCoercion } from '../TypeCoercion';
import type { PropertyMetadata } from '../types';

describe('TypeCoercion', () => {
  describe('coerceToNumber', () => {
    it('should pass through valid numbers', () => {
      expect(TypeCoercion.coerceToNumber(42)).toBe(42);
      expect(TypeCoercion.coerceToNumber(3.14)).toBe(3.14);
      expect(TypeCoercion.coerceToNumber(0)).toBe(0);
      expect(TypeCoercion.coerceToNumber(-10.5)).toBe(-10.5);
    });

    it('should convert numeric strings', () => {
      expect(TypeCoercion.coerceToNumber('42')).toBe(42);
      expect(TypeCoercion.coerceToNumber('3.14')).toBe(3.14);
      expect(TypeCoercion.coerceToNumber('-10.5')).toBe(-10.5);
    });

    it('should convert booleans', () => {
      expect(TypeCoercion.coerceToNumber(true)).toBe(1);
      expect(TypeCoercion.coerceToNumber(false)).toBe(0);
    });

    it('should reject invalid numbers', () => {
      expect(TypeCoercion.coerceToNumber(NaN)).toBeUndefined();
      expect(TypeCoercion.coerceToNumber(Infinity)).toBeUndefined();
      expect(TypeCoercion.coerceToNumber('not a number')).toBeUndefined();
      expect(TypeCoercion.coerceToNumber({})).toBeUndefined();
    });
  });

  describe('coerceToString', () => {
    it('should pass through valid strings', () => {
      expect(TypeCoercion.coerceToString('hello')).toBe('hello');
      expect(TypeCoercion.coerceToString('')).toBe('');
    });

    it('should convert numbers', () => {
      expect(TypeCoercion.coerceToString(42)).toBe('42');
      expect(TypeCoercion.coerceToString(3.14)).toBe('3.14');
    });

    it('should convert booleans', () => {
      expect(TypeCoercion.coerceToString(true)).toBe('true');
      expect(TypeCoercion.coerceToString(false)).toBe('false');
    });

    it('should stringify objects', () => {
      expect(TypeCoercion.coerceToString({ x: 1, y: 2 })).toBe('{"x":1,"y":2}');
    });
  });

  describe('coerceToBoolean', () => {
    it('should pass through valid booleans', () => {
      expect(TypeCoercion.coerceToBoolean(true)).toBe(true);
      expect(TypeCoercion.coerceToBoolean(false)).toBe(false);
    });

    it('should convert numbers', () => {
      expect(TypeCoercion.coerceToBoolean(1)).toBe(true);
      expect(TypeCoercion.coerceToBoolean(0)).toBe(false);
      expect(TypeCoercion.coerceToBoolean(42)).toBe(true);
      expect(TypeCoercion.coerceToBoolean(-1)).toBe(true);
    });

    it('should convert strings', () => {
      expect(TypeCoercion.coerceToBoolean('true')).toBe(true);
      expect(TypeCoercion.coerceToBoolean('TRUE')).toBe(true);
      expect(TypeCoercion.coerceToBoolean('1')).toBe(true);
      expect(TypeCoercion.coerceToBoolean('false')).toBe(false);
      expect(TypeCoercion.coerceToBoolean('FALSE')).toBe(false);
      expect(TypeCoercion.coerceToBoolean('0')).toBe(false);
    });

    it('should reject invalid strings', () => {
      expect(TypeCoercion.coerceToBoolean('yes')).toBeUndefined();
      expect(TypeCoercion.coerceToBoolean('no')).toBeUndefined();
    });
  });

  describe('coerceToVec2', () => {
    it('should pass through valid Vec2', () => {
      const vec = { x: 1, y: 2 };
      expect(TypeCoercion.coerceToVec2(vec)).toEqual(vec);
    });

    it('should convert objects with x/y', () => {
      expect(TypeCoercion.coerceToVec2({ x: '5', y: '10' })).toEqual({ x: 5, y: 10 });
      expect(TypeCoercion.coerceToVec2({ x: true, y: false })).toEqual({ x: 1, y: 0 });
    });

    it('should reject invalid objects', () => {
      expect(TypeCoercion.coerceToVec2({ x: 1 })).toBeUndefined();
      expect(TypeCoercion.coerceToVec2({ y: 2 })).toBeUndefined();
      expect(TypeCoercion.coerceToVec2({ x: 'bad', y: 'values' })).toBeUndefined();
      expect(TypeCoercion.coerceToVec2(42)).toBeUndefined();
    });
  });

  describe('coerceToExpectedType', () => {
    it('should coerce to number type', () => {
      const metadata: PropertyMetadata = {
        scope: 'entity',
        source: 'game',
        frequency: 'frame',
        type: 'number',
      };

      expect(TypeCoercion.coerceToExpectedType(42, metadata)).toBe(42);
      expect(TypeCoercion.coerceToExpectedType('42', metadata)).toBe(42);
      expect(TypeCoercion.coerceToExpectedType(true, metadata)).toBe(1);
    });

    it('should coerce to string type', () => {
      const metadata: PropertyMetadata = {
        scope: 'entity',
        source: 'game',
        frequency: 'frame',
        type: 'string',
      };

      expect(TypeCoercion.coerceToExpectedType('hello', metadata)).toBe('hello');
      expect(TypeCoercion.coerceToExpectedType(42, metadata)).toBe('42');
      expect(TypeCoercion.coerceToExpectedType(true, metadata)).toBe('true');
    });

    it('should coerce to boolean type', () => {
      const metadata: PropertyMetadata = {
        scope: 'entity',
        source: 'game',
        frequency: 'frame',
        type: 'boolean',
      };

      expect(TypeCoercion.coerceToExpectedType(true, metadata)).toBe(true);
      expect(TypeCoercion.coerceToExpectedType(1, metadata)).toBe(true);
      expect(TypeCoercion.coerceToExpectedType('true', metadata)).toBe(true);
    });

    it('should coerce to vec2 type', () => {
      const metadata: PropertyMetadata = {
        scope: 'entity',
        source: 'physics',
        frequency: 'frame',
        type: 'vec2',
      };

      expect(TypeCoercion.coerceToExpectedType({ x: 1, y: 2 }, metadata)).toEqual({ x: 1, y: 2 });
      expect(TypeCoercion.coerceToExpectedType({ x: '5', y: '10' }, metadata)).toEqual({ x: 5, y: 10 });
    });
  });

  describe('validate', () => {
    it('should validate number types', () => {
      const metadata: PropertyMetadata = {
        scope: 'entity',
        source: 'game',
        frequency: 'frame',
        type: 'number',
      };

      expect(TypeCoercion.validate(42, metadata).valid).toBe(true);
      expect(TypeCoercion.validate('42', metadata).valid).toBe(false);
      expect(TypeCoercion.validate(NaN, metadata).valid).toBe(false);
      expect(TypeCoercion.validate(Infinity, metadata).valid).toBe(false);
    });

    it('should validate string types', () => {
      const metadata: PropertyMetadata = {
        scope: 'entity',
        source: 'game',
        frequency: 'frame',
        type: 'string',
      };

      expect(TypeCoercion.validate('hello', metadata).valid).toBe(true);
      expect(TypeCoercion.validate(42, metadata).valid).toBe(false);
    });

    it('should validate boolean types', () => {
      const metadata: PropertyMetadata = {
        scope: 'entity',
        source: 'game',
        frequency: 'frame',
        type: 'boolean',
      };

      expect(TypeCoercion.validate(true, metadata).valid).toBe(true);
      expect(TypeCoercion.validate(false, metadata).valid).toBe(true);
      expect(TypeCoercion.validate(1, metadata).valid).toBe(false);
    });

    it('should validate vec2 types', () => {
      const metadata: PropertyMetadata = {
        scope: 'entity',
        source: 'physics',
        frequency: 'frame',
        type: 'vec2',
      };

      expect(TypeCoercion.validate({ x: 1, y: 2 }, metadata).valid).toBe(true);
      expect(TypeCoercion.validate({ x: 1 } as any, metadata).valid).toBe(false);
      expect(TypeCoercion.validate('not a vec2' as any, metadata).valid).toBe(false);
    });

    it('should allow undefined values', () => {
      const metadata: PropertyMetadata = {
        scope: 'entity',
        source: 'game',
        frequency: 'frame',
        type: 'number',
      };

      expect(TypeCoercion.validate(undefined, metadata).valid).toBe(true);
    });
  });

  describe('inferType', () => {
    it('should infer number type', () => {
      expect(TypeCoercion.inferType(42)).toBe('number');
      expect(TypeCoercion.inferType(3.14)).toBe('number');
    });

    it('should infer string type', () => {
      expect(TypeCoercion.inferType('hello')).toBe('string');
      expect(TypeCoercion.inferType('')).toBe('string');
    });

    it('should infer boolean type', () => {
      expect(TypeCoercion.inferType(true)).toBe('boolean');
      expect(TypeCoercion.inferType(false)).toBe('boolean');
    });

    it('should infer vec2 type', () => {
      expect(TypeCoercion.inferType({ x: 1, y: 2 })).toBe('vec2');
    });

    it('should default to string for unknown types', () => {
      expect(TypeCoercion.inferType({ x: 1 })).toBe('string');
      expect(TypeCoercion.inferType([])).toBe('string');
      expect(TypeCoercion.inferType(null)).toBe('string');
    });
  });
});
