import type { ActionExecutor } from './ActionExecutor';
import type { HapticAction } from '@slopcade/shared';
import type { RuleContext } from '../types';

export class HapticActionExecutor implements ActionExecutor<HapticAction> {
  execute(action: HapticAction, context: RuleContext): void {
    const hapticType = action.hapticType ?? 'impact';

    if (hapticType === 'selection') {
      if (!context.hapticSelection) return;
      context.hapticSelection();
      return;
    }

    if (hapticType === 'notification') {
      if (!context.hapticNotification) return;
      context.hapticNotification(action.notificationStyle);
      return;
    }

    if (!context.haptic) return;
    context.haptic(action.style);
  }
}
