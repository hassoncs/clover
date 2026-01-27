import type { GameSystemDefinition } from '../types';

export const SPATIAL_QUERY_SYSTEM_ID = 'spatial-query';
export const SPATIAL_QUERY_VERSION = { major: 1, minor: 0, patch: 0 };

export const spatialQuerySystem: GameSystemDefinition = {
  id: SPATIAL_QUERY_SYSTEM_ID,
  version: SPATIAL_QUERY_VERSION,
  actionTypes: ['target_nearest', 'target_all_in_radius'],
  behaviorTypes: [],
  expressionFunctions: {},
};

export * from './types';
