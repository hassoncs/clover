import type { Vec2 } from '../../types/common';
import type { Value } from '../../expressions/types';
import type { EntityTarget } from '../../types/rules';

interface BaseBehavior {
  type: string;
  enabled?: boolean;
}

export interface PathDefinition {
  id: string;
  type: 'linear' | 'bezier' | 'catmull-rom';
  points: Vec2[];
  controlPoints?: Vec2[];
  loop?: boolean;
  tags?: string[];
  events?: PathEvent[];
}

export interface PathEvent {
  progress: number;
  eventName: string;
  data?: Record<string, unknown>;
}

export interface PathNode {
  id: string;
  position: Vec2;
  type: 'start' | 'end' | 'junction' | 'checkpoint';
}

export interface PathConnection {
  fromNode: string;
  toNode: string;
  pathId: string;
  direction: 'forward' | 'backward' | 'both';
}

export interface PathNetwork {
  id: string;
  paths: PathDefinition[];
  nodes: PathNode[];
  connections: PathConnection[];
}

export interface PathStartAction {
  type: 'path_start';
  target: EntityTarget;
  pathId: string;
  speed: Value<number>;
  startProgress?: Value<number>;
  facing?: 'forward' | 'backward' | 'none';
}

export interface PathStopAction {
  type: 'path_stop';
  target: EntityTarget;
}

export interface PathSetSpeedAction {
  type: 'path_set_speed';
  target: EntityTarget;
  speed: Value<number>;
}

export interface PathTeleportAction {
  type: 'path_teleport';
  target: EntityTarget;
  pathId: string;
  progress: Value<number>;
}

export type PathAction = PathStartAction | PathStopAction | PathSetSpeedAction | PathTeleportAction;

export interface FollowPathBehavior extends BaseBehavior {
  type: 'follow_path';
  pathId: string;
  speed: Value<number>;
  startProgress?: Value<number>;
  rotateToFacing?: boolean;
  rotationOffset?: number;
  loop?: boolean;
  pingPong?: boolean;
  pauseAtWaypoints?: number;
}

export interface PathConstrainBehavior extends BaseBehavior {
  type: 'path_constrain';
  pathId: string;
  maxDistance: number;
}

export interface PathFollowerState {
  pathId: string | null;
  progress: number;
  speed: number;
  direction: 1 | -1;
  paused: boolean;
  loop: boolean;
  pingPong: boolean;
}
