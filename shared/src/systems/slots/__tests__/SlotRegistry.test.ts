import { describe, it, expect, beforeEach } from 'vitest';
import {
  SlotRegistry,
  getGlobalSlotRegistry,
  resetGlobalSlotRegistry,
} from '../SlotRegistry';
import {
  resolveSlots,
  resolveSlotRef,
  createSlotSelection,
} from '../resolver';
import type { SlotImplementation } from '../types';

function createMockImpl(
  id: string,
  systemId: string,
  slotName: string,
  compatibleWith: string[] = [systemId]
): SlotImplementation {
  return {
    id,
    version: { major: 1, minor: 0, patch: 0 },
    owner: { systemId, slotName },
    compatibleWith: compatibleWith.map((sysId) => ({ systemId: sysId, range: '>=1.0.0' })),
    run: () => undefined,
  };
}

describe('SlotRegistry', () => {
  let registry: SlotRegistry;

  beforeEach(() => {
    registry = new SlotRegistry();
  });

  describe('register', () => {
    it('should register a slot implementation', () => {
      const impl = createMockImpl('scoring.default', 'scoring', 'calculator');
      registry.register(impl);
      expect(registry.has('scoring.default')).toBe(true);
    });

    it('should throw when registering duplicate ID', () => {
      const impl = createMockImpl('scoring.default', 'scoring', 'calculator');
      registry.register(impl);
      expect(() => registry.register(impl)).toThrow("Slot implementation 'scoring.default' already registered");
    });
  });

  describe('get', () => {
    it('should return undefined for non-existent implementation', () => {
      expect(registry.get('nonexistent')).toBeUndefined();
    });

    it('should return the implementation for a valid ID', () => {
      const impl = createMockImpl('scoring.default', 'scoring', 'calculator');
      registry.register(impl);
      expect(registry.get('scoring.default')).toBe(impl);
    });
  });

  describe('has', () => {
    it('should return false for non-registered implementation', () => {
      expect(registry.has('nonexistent')).toBe(false);
    });

    it('should return true for registered implementation', () => {
      const impl = createMockImpl('scoring.default', 'scoring', 'calculator');
      registry.register(impl);
      expect(registry.has('scoring.default')).toBe(true);
    });
  });

  describe('unregister', () => {
    it('should remove a registered implementation', () => {
      const impl = createMockImpl('scoring.default', 'scoring', 'calculator');
      registry.register(impl);
      registry.unregister('scoring.default');
      expect(registry.has('scoring.default')).toBe(false);
    });

    it('should do nothing for non-existent implementation', () => {
      expect(() => registry.unregister('nonexistent')).not.toThrow();
    });
  });

  describe('listForSlot', () => {
    it('should return empty array when no implementations exist', () => {
      expect(registry.listForSlot('scoring', 'calculator')).toEqual([]);
    });

    it('should return implementations for a specific slot', () => {
      const impl1 = createMockImpl('scoring.default', 'scoring', 'calculator');
      const impl2 = createMockImpl('scoring.bonus', 'scoring', 'calculator');
      const impl3 = createMockImpl('physics.gravity', 'physics', 'gravity');

      registry.register(impl1);
      registry.register(impl2);
      registry.register(impl3);

      const scoringImpls = registry.listForSlot('scoring', 'calculator');
      expect(scoringImpls).toHaveLength(2);
      expect(scoringImpls).toContain(impl1);
      expect(scoringImpls).toContain(impl2);
    });

    it('should not return implementations for different slots', () => {
      const impl = createMockImpl('physics.gravity', 'physics', 'gravity');
      registry.register(impl);

      expect(registry.listForSlot('scoring', 'calculator')).toEqual([]);
    });
  });

  describe('validateSelection', () => {
    it('should return false for non-existent implementation', () => {
      expect(registry.validateSelection('scoring', 'calculator', 'nonexistent')).toBe(false);
    });

    it('should return false when owner does not match', () => {
      const impl = createMockImpl('scoring.default', 'scoring', 'calculator');
      registry.register(impl);
      expect(registry.validateSelection('physics', 'gravity', 'scoring.default')).toBe(false);
    });

    it('should return true for valid selection', () => {
      const impl = createMockImpl('scoring.default', 'scoring', 'calculator');
      registry.register(impl);
      expect(registry.validateSelection('scoring', 'calculator', 'scoring.default')).toBe(true);
    });

    it('should check compatibleWith for system compatibility', () => {
      const impl = createMockImpl('scoring.default', 'scoring', 'calculator', ['scoring', 'match3']);
      registry.register(impl);
      expect(registry.validateSelection('scoring', 'calculator', 'scoring.default')).toBe(true);
    });
  });

  describe('getAll', () => {
    it('should return empty array for empty registry', () => {
      expect(registry.getAll()).toEqual([]);
    });

    it('should return all registered implementations', () => {
      const impl1 = createMockImpl('scoring.default', 'scoring', 'calculator');
      const impl2 = createMockImpl('physics.gravity', 'physics', 'gravity');

      registry.register(impl1);
      registry.register(impl2);

      const all = registry.getAll();
      expect(all).toHaveLength(2);
      expect(all).toContain(impl1);
      expect(all).toContain(impl2);
    });
  });

  describe('clear', () => {
    it('should remove all implementations', () => {
      const impl1 = createMockImpl('scoring.default', 'scoring', 'calculator');
      const impl2 = createMockImpl('physics.gravity', 'physics', 'gravity');

      registry.register(impl1);
      registry.register(impl2);
      registry.clear();

      expect(registry.size).toBe(0);
      expect(registry.has('scoring.default')).toBe(false);
    });
  });

  describe('size', () => {
    it('should return 0 for empty registry', () => {
      expect(registry.size).toBe(0);
    });

    it('should return correct count', () => {
      registry.register(createMockImpl('impl1', 'sys', 'slot'));
      registry.register(createMockImpl('impl2', 'sys', 'slot'));
      expect(registry.size).toBe(2);
    });
  });
});

describe('Global SlotRegistry', () => {
  beforeEach(() => {
    resetGlobalSlotRegistry();
  });

  it('should return the same instance', () => {
    const registry1 = getGlobalSlotRegistry();
    const registry2 = getGlobalSlotRegistry();
    expect(registry1).toBe(registry2);
  });

  it('should reset to a new instance', () => {
    const registry1 = getGlobalSlotRegistry();
    registry1.register(createMockImpl('test', 'sys', 'slot'));
    resetGlobalSlotRegistry();
    const registry2 = getGlobalSlotRegistry();
    expect(registry2.has('test')).toBe(false);
  });
});

describe('resolveSlots', () => {
  let registry: SlotRegistry;

  beforeEach(() => {
    registry = new SlotRegistry();
  });

  it('should resolve valid slot selections', () => {
    const impl = createMockImpl('scoring.default', 'scoring', 'calculator');
    registry.register(impl);

    const selections = {
      mainScoring: createSlotSelection('scoring', 'calculator', 'scoring.default'),
    };

    const result = resolveSlots(selections, registry);

    expect(result.errors).toHaveLength(0);
    expect(result.slots.size).toBe(1);
    expect(result.slots.get('mainScoring')?.implementation).toBe(impl);
  });

  it('should report error for missing implementation', () => {
    const selections = {
      mainScoring: createSlotSelection('scoring', 'calculator', 'nonexistent'),
    };

    const result = resolveSlots(selections, registry);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("not found");
    expect(result.slots.size).toBe(0);
  });

  it('should report error for invalid selection', () => {
    const impl = createMockImpl('scoring.default', 'scoring', 'calculator');
    registry.register(impl);

    const selections = {
      wrongSlot: createSlotSelection('physics', 'gravity', 'scoring.default'),
    };

    const result = resolveSlots(selections, registry);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("not valid");
    expect(result.slots.size).toBe(0);
  });

  it('should preserve params in resolved slots', () => {
    const impl = createMockImpl('scoring.default', 'scoring', 'calculator');
    registry.register(impl);

    const selections = {
      mainScoring: createSlotSelection('scoring', 'calculator', 'scoring.default', {
        multiplier: 2,
      }),
    };

    const result = resolveSlots(selections, registry);

    expect(result.slots.get('mainScoring')?.params).toEqual({ multiplier: 2 });
  });

  it('should resolve multiple selections', () => {
    const impl1 = createMockImpl('scoring.default', 'scoring', 'calculator');
    const impl2 = createMockImpl('physics.standard', 'physics', 'gravity');
    registry.register(impl1);
    registry.register(impl2);

    const selections = {
      scoring: createSlotSelection('scoring', 'calculator', 'scoring.default'),
      physics: createSlotSelection('physics', 'gravity', 'physics.standard'),
    };

    const result = resolveSlots(selections, registry);

    expect(result.errors).toHaveLength(0);
    expect(result.slots.size).toBe(2);
  });
});

describe('resolveSlotRef', () => {
  let registry: SlotRegistry;

  beforeEach(() => {
    registry = new SlotRegistry();
  });

  it('should return undefined for non-existent ref', () => {
    expect(resolveSlotRef('nonexistent', registry)).toBeUndefined();
  });

  it('should return implementation for valid ref', () => {
    const impl = createMockImpl('scoring.default', 'scoring', 'calculator');
    registry.register(impl);
    expect(resolveSlotRef('scoring.default', registry)).toBe(impl);
  });
});

describe('createSlotSelection', () => {
  it('should create a slot selection object', () => {
    const selection = createSlotSelection('scoring', 'calculator', 'scoring.default');
    expect(selection).toEqual({
      systemId: 'scoring',
      slotName: 'calculator',
      implId: 'scoring.default',
      params: undefined,
    });
  });

  it('should include params when provided', () => {
    const selection = createSlotSelection('scoring', 'calculator', 'scoring.default', {
      multiplier: 2,
    });
    expect(selection.params).toEqual({ multiplier: 2 });
  });
});
