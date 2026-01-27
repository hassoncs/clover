import type { SystemVersion } from '../types';

export type SlotRef = string;

export type SlotKind = 'pure' | 'policy' | 'hook';

export interface SlotContract {
  name: string;
  kind: SlotKind;
  description?: string;
  inputSchema?: unknown;
  outputSchema?: unknown;
}

export interface SlotOwner {
  systemId: string;
  slotName: string;
}

export interface SlotCompatibility {
  systemId: string;
  range: string;
}

export interface SlotImplementation<TInput = unknown, TOutput = unknown> {
  id: string;
  version: SystemVersion;
  owner: SlotOwner;
  compatibleWith: SlotCompatibility[];
  paramsSchema?: unknown;

  create?: (params: unknown, services: unknown) => unknown;
  run: (ctx: unknown, input: TInput) => TOutput;
}


