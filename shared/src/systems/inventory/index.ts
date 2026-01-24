import type { GameSystemDefinition } from '../types';
import type { InventoryDefinition, InventoryState, ResourceDefinition, ResourceState } from './types';

export const INVENTORY_SYSTEM_ID = 'inventory';
export const INVENTORY_VERSION = { major: 1, minor: 0, patch: 0 };

interface InventoryConfig {
  inventories: Record<string, InventoryDefinition>;
  resources: Record<string, ResourceDefinition>;
}

interface InventoryRuntimeState {
  inventories: Record<string, InventoryState>;
  resources: Record<string, ResourceState>;
}

export const inventorySystem: GameSystemDefinition<InventoryConfig, InventoryRuntimeState> = {
  id: INVENTORY_SYSTEM_ID,
  version: INVENTORY_VERSION,
  actionTypes: ['inventory_add', 'inventory_remove', 'inventory_transfer', 'inventory_clear', 'resource_modify', 'resource_spend'],
  behaviorTypes: ['collectible'],
  expressionFunctions: {
    inventoryHas: (args, ctx) => {
      if (args.length < 2) throw new Error('inventoryHas(inventoryId, itemId) requires 2 arguments');
      const inventoryId = String(args[0]);
      const itemId = String(args[1]);
      const states = (ctx.variables['__invStates'] as unknown as Record<string, InventoryState>) ?? {};
      const inv = states[inventoryId];
      return inv?.items[itemId]?.count > 0;
    },
    
    inventoryCount: (args, ctx) => {
      if (args.length < 2) throw new Error('inventoryCount(inventoryId, itemId) requires 2 arguments');
      const inventoryId = String(args[0]);
      const itemId = String(args[1]);
      const states = (ctx.variables['__invStates'] as unknown as Record<string, InventoryState>) ?? {};
      const inv = states[inventoryId];
      return inv?.items[itemId]?.count ?? 0;
    },
    
    inventoryTotalItems: (args, ctx) => {
      if (args.length < 1) throw new Error('inventoryTotalItems(inventoryId) requires 1 argument');
      const inventoryId = String(args[0]);
      const states = (ctx.variables['__invStates'] as unknown as Record<string, InventoryState>) ?? {};
      const inv = states[inventoryId];
      if (!inv) return 0;
      let total = 0;
      for (const item of Object.values(inv.items)) {
        total += item.count;
      }
      return total;
    },
    
    inventoryIsFull: (args, ctx) => {
      if (args.length < 1) throw new Error('inventoryIsFull(inventoryId) requires 1 argument');
      const inventoryId = String(args[0]);
      const states = (ctx.variables['__invStates'] as unknown as Record<string, InventoryState>) ?? {};
      const defs = (ctx.variables['__invDefs'] as unknown as Record<string, InventoryDefinition>) ?? {};
      const inv = states[inventoryId];
      const def = defs[inventoryId];
      if (!inv || !def || def.slots === undefined) return false;
      return Object.keys(inv.items).length >= def.slots;
    },
    
    inventoryIsEmpty: (args, ctx) => {
      if (args.length < 1) throw new Error('inventoryIsEmpty(inventoryId) requires 1 argument');
      const inventoryId = String(args[0]);
      const states = (ctx.variables['__invStates'] as unknown as Record<string, InventoryState>) ?? {};
      const inv = states[inventoryId];
      if (!inv) return true;
      return Object.keys(inv.items).length === 0;
    },
    
    resourceCurrent: (args, ctx) => {
      if (args.length < 1) throw new Error('resourceCurrent(resourceId) requires 1 argument');
      const resourceId = String(args[0]);
      const states = (ctx.variables['__resStates'] as unknown as Record<string, ResourceState>) ?? {};
      return states[resourceId]?.current ?? 0;
    },
    
    resourceMax: (args, ctx) => {
      if (args.length < 1) throw new Error('resourceMax(resourceId) requires 1 argument');
      const resourceId = String(args[0]);
      const states = (ctx.variables['__resStates'] as unknown as Record<string, ResourceState>) ?? {};
      return states[resourceId]?.max ?? 0;
    },
    
    resourcePercent: (args, ctx) => {
      if (args.length < 1) throw new Error('resourcePercent(resourceId) requires 1 argument');
      const resourceId = String(args[0]);
      const states = (ctx.variables['__resStates'] as unknown as Record<string, ResourceState>) ?? {};
      const res = states[resourceId];
      if (!res || res.max === 0) return 0;
      return res.current / res.max;
    },
    
    resourceIsFull: (args, ctx) => {
      if (args.length < 1) throw new Error('resourceIsFull(resourceId) requires 1 argument');
      const resourceId = String(args[0]);
      const states = (ctx.variables['__resStates'] as unknown as Record<string, ResourceState>) ?? {};
      const res = states[resourceId];
      return res ? res.current >= res.max : false;
    },
    
    resourceIsEmpty: (args, ctx) => {
      if (args.length < 1) throw new Error('resourceIsEmpty(resourceId) requires 1 argument');
      const resourceId = String(args[0]);
      const states = (ctx.variables['__resStates'] as unknown as Record<string, ResourceState>) ?? {};
      const res = states[resourceId];
      return res ? res.current <= res.min : true;
    },
    
    resourceCanAfford: (args, ctx) => {
      if (args.length < 2) throw new Error('resourceCanAfford(resourceId, cost) requires 2 arguments');
      const resourceId = String(args[0]);
      const cost = Number(args[1]);
      const states = (ctx.variables['__resStates'] as unknown as Record<string, ResourceState>) ?? {};
      const res = states[resourceId];
      return res ? res.current >= cost : false;
    },
  },
};

export * from './types';
