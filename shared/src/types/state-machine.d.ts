export interface StateMachineDefinition {
    id: string;
    owner?: string;
    stateVar?: string;
    initialState: string;
    states: StateDefinition[];
    transitions: TransitionDefinition[];
}
export interface StateDefinition {
    id: string;
    timeout?: number;
    timeoutTransition?: string;
}
export interface TransitionDefinition {
    id: string;
    from: string | string[] | "*";
    to: string;
    trigger: TransitionTrigger;
}
export type TransitionTrigger = {
    type: "event";
    eventName: string;
} | {
    type: "manual";
};
export declare function getStateVar(def: StateMachineDefinition): string;
//# sourceMappingURL=state-machine.d.ts.map