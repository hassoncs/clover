import type { RuleAction, RuleCondition } from '../../types/rules';

export type TransitionTrigger =
  | { type: 'event'; eventName: string }
  | { type: 'condition'; condition: RuleCondition }
  | { type: 'manual' };

export interface StateDefinition {
  id: string;
  onEnter?: RuleAction[];
  onExit?: RuleAction[];
  onUpdate?: RuleAction[];
  timeout?: number;
  timeoutTransition?: string;
}

export interface TransitionDefinition {
  id: string;
  from: string | string[] | '*';
  to: string;
  trigger: TransitionTrigger;
  conditions?: RuleCondition[];
  actions?: RuleAction[];
}

export interface StateMachineDefinition {
  id: string;
  owner?: string;
  initialState: string;
  states: StateDefinition[];
  transitions: TransitionDefinition[];
}

export interface StateMachineState {
  currentState: string;
  previousState: string | null;
  stateEnteredAt: number;
  transitionCount: number;
}

export interface StateTransitionAction {
  type: 'state_transition';
  machineId: string;
  toState: string;
  force?: boolean;
}

export interface StateSendEventAction {
  type: 'state_send_event';
  machineId: string;
  eventName: string;
  data?: Record<string, unknown>;
}

export type StateMachineAction = StateTransitionAction | StateSendEventAction;
