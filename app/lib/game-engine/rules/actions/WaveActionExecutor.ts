import type { ActionExecutor } from './ActionExecutor';
import type { WaveStartAction, WaveNextAction } from '@slopcade/shared';
import type { RuleContext } from '../types';

type WaveAction = WaveStartAction | WaveNextAction;

export class WaveActionExecutor implements ActionExecutor<WaveAction> {
  execute(action: WaveAction, context: RuleContext): void {
    switch (action.type) {
      case 'wave_start': this.executeStart(action, context); break;
      case 'wave_next': this.executeNext(action, context); break;
    }
  }

  private getWaveState(waveDefId: string, context: RuleContext): { currentWave: number; isActive: boolean; spawnedEntityIds: string[]; waveStartTime: number } {
    const stateKey = '__waveStates';
    let states = context.mutator.getVariable(stateKey) as Record<string, { currentWave: number; isActive: boolean; spawnedEntityIds: string[]; waveStartTime: number }> | undefined;
    if (!states) states = {};
    if (!states[waveDefId]) states[waveDefId] = { currentWave: 0, isActive: false, spawnedEntityIds: [], waveStartTime: 0 };
    return states[waveDefId];
  }

  private saveWaveState(waveDefId: string, state: { currentWave: number; isActive: boolean; spawnedEntityIds: string[]; waveStartTime: number }, context: RuleContext): void {
    const stateKey = '__waveStates';
    let states = context.mutator.getVariable(stateKey) as Record<string, typeof state> | undefined;
    if (!states) states = {};
    states[waveDefId] = state;
    context.mutator.setVariable(stateKey, states as unknown as number);
  }

  private executeStart(action: WaveStartAction, context: RuleContext): void {
    const state = this.getWaveState(action.waveDefId, context);
    state.currentWave = 1;
    state.isActive = true;
    state.spawnedEntityIds = [];
    state.waveStartTime = context.elapsed;
    this.saveWaveState(action.waveDefId, state, context);
    context.mutator.triggerEvent(`wave_started_${action.waveDefId}`, { wave: 1 });
  }

  private executeNext(action: WaveNextAction, context: RuleContext): void {
    const state = this.getWaveState(action.waveDefId, context);
    if (!state.isActive) return;
    state.currentWave += 1;
    state.spawnedEntityIds = [];
    state.waveStartTime = context.elapsed;
    this.saveWaveState(action.waveDefId, state, context);
    context.mutator.triggerEvent(`wave_started_${action.waveDefId}`, { wave: state.currentWave });
  }
}
