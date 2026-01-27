import type { ActionExecutor } from './ActionExecutor';
import type { SoundAction } from '@slopcade/shared';
import type { RuleContext } from '../types';

export class SoundActionExecutor implements ActionExecutor<SoundAction> {
  execute(action: SoundAction, context: RuleContext): void {
    console.log('[SoundAction] Playing sound:', action.soundId);
    if (!context.playSound) {
      console.warn('[SoundAction] No playSound callback available');
      return;
    }
    context.playSound(action.soundId, action.volume);
  }
}
