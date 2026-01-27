import type { Value } from '../../expressions/types';
import type { EntityTarget } from '../../types/rules';

export interface TargetNearestAction {
  type: 'target_nearest';
  source: EntityTarget;
  targetTags: string[];
  maxRadius?: Value<number>;
  storeIn: string;
}

export interface TargetAllInRadiusAction {
  type: 'target_all_in_radius';
  source: EntityTarget;
  radius: Value<number>;
  targetTags: string[];
  storeIn: string;
}

export type SpatialQueryAction = TargetNearestAction | TargetAllInRadiusAction;
