import type { ActionExecutor } from './ActionExecutor';
import type { InventoryAddAction, InventoryRemoveAction, ResourceModifyAction } from '@slopcade/shared';
import type { RuleContext } from '../types';
import { resolveNumber } from '../utils';

type InventoryAction = InventoryAddAction | InventoryRemoveAction | ResourceModifyAction;

export class InventoryActionExecutor implements ActionExecutor<InventoryAction> {
  execute(action: InventoryAction, context: RuleContext): void {
    switch (action.type) {
      case 'inventory_add': this.executeAdd(action, context); break;
      case 'inventory_remove': this.executeRemove(action, context); break;
      case 'resource_modify': this.executeResourceModify(action, context); break;
    }
  }

  private executeAdd(action: InventoryAddAction, context: RuleContext): void {
    const stateKey = '__invStates';
    let states = context.mutator.getVariable(stateKey) as Record<string, { items: Record<string, { count: number }> }> | undefined;
    if (!states) states = {};
    if (!states[action.inventoryId]) states[action.inventoryId] = { items: {} };
    
    const inv = states[action.inventoryId];
    const count = action.count ? resolveNumber(action.count, context) : 1;
    if (!inv.items[action.itemId]) inv.items[action.itemId] = { count: 0 };
    inv.items[action.itemId].count += count;
    
    context.mutator.setVariable(stateKey, states as unknown as number);
  }

  private executeRemove(action: InventoryRemoveAction, context: RuleContext): void {
    const stateKey = '__invStates';
    let states = context.mutator.getVariable(stateKey) as Record<string, { items: Record<string, { count: number }> }> | undefined;
    if (!states) return;
    
    const inv = states[action.inventoryId];
    if (!inv?.items[action.itemId]) return;
    
    const count = action.count ? resolveNumber(action.count, context) : 1;
    inv.items[action.itemId].count = Math.max(0, inv.items[action.itemId].count - count);
    if (inv.items[action.itemId].count === 0) delete inv.items[action.itemId];
    
    context.mutator.setVariable(stateKey, states as unknown as number);
  }

  private executeResourceModify(action: ResourceModifyAction, context: RuleContext): void {
    const stateKey = '__resStates';
    let states = context.mutator.getVariable(stateKey) as Record<string, { current: number; max: number; min: number }> | undefined;
    if (!states) states = {};
    if (!states[action.resourceId]) states[action.resourceId] = { current: 0, max: 9999, min: 0 };
    
    const res = states[action.resourceId];
    const amount = resolveNumber(action.amount, context);
    
    switch (action.operation) {
      case 'add': res.current = Math.min(res.max, res.current + amount); break;
      case 'subtract': res.current = Math.max(res.min, res.current - amount); break;
      case 'set': res.current = Math.max(res.min, Math.min(res.max, amount)); break;
    }
    
    context.mutator.setVariable(stateKey, states as unknown as number);
  }
}
