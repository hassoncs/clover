import type { Value } from '../../expressions/types';

export interface InventoryDefinition {
  id: string;
  owner?: string;
  slots?: number;
  stackable?: boolean;
  categories?: string[];
}

export interface ItemDefinition {
  id: string;
  name: string;
  category?: string;
  maxStack?: number;
  data?: Record<string, unknown>;
}

export interface ResourceDefinition {
  id: string;
  name: string;
  min?: number;
  max?: number;
  initial: number;
  regenRate?: number;
  regenDelay?: number;
}

export interface InventoryItem {
  itemId: string;
  count: number;
  data?: unknown;
}

export interface InventoryState {
  items: Record<string, InventoryItem>;
}

export interface ResourceState {
  current: number;
  max: number;
  min: number;
  regenTimer?: number;
}

export interface InventoryAddAction {
  type: 'inventory_add';
  inventoryId: string;
  itemId: string;
  count?: Value<number>;
  data?: Record<string, unknown>;
}

export interface InventoryRemoveAction {
  type: 'inventory_remove';
  inventoryId: string;
  itemId: string;
  count?: Value<number>;
}

export interface InventoryTransferAction {
  type: 'inventory_transfer';
  fromInventory: string;
  toInventory: string;
  itemId: string;
  count?: Value<number>;
}

export interface InventoryClearAction {
  type: 'inventory_clear';
  inventoryId: string;
  category?: string;
}

export interface ResourceModifyAction {
  type: 'resource_modify';
  resourceId: string;
  operation: 'add' | 'subtract' | 'set' | 'fill' | 'drain';
  value: Value<number>;
}

export interface ResourceSpendAction {
  type: 'resource_spend';
  resourceId: string;
  cost: Value<number>;
  failEvent?: string;
}

export type InventoryAction = 
  | InventoryAddAction 
  | InventoryRemoveAction 
  | InventoryTransferAction 
  | InventoryClearAction 
  | ResourceModifyAction 
  | ResourceSpendAction;
