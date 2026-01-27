import type { GameSystemDefinition } from '../types';
import type { PathDefinition, PathFollowerState } from './types';
import type { Vec2 } from '../../types/common';

export const PATH_SYSTEM_ID = 'path';
export const PATH_VERSION = { major: 1, minor: 0, patch: 0 };

function linearInterpolate(points: Vec2[], t: number): Vec2 {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return { ...points[0] };
  
  const totalSegments = points.length - 1;
  const segmentProgress = t * totalSegments;
  const segmentIndex = Math.min(Math.floor(segmentProgress), totalSegments - 1);
  const localT = segmentProgress - segmentIndex;
  
  const p0 = points[segmentIndex];
  const p1 = points[segmentIndex + 1];
  
  return {
    x: p0.x + (p1.x - p0.x) * localT,
    y: p0.y + (p1.y - p0.y) * localT,
  };
}

function catmullRomInterpolate(points: Vec2[], t: number): Vec2 {
  if (points.length < 2) return linearInterpolate(points, t);
  
  const n = points.length;
  const totalSegments = n - 1;
  const segmentProgress = t * totalSegments;
  const segmentIndex = Math.min(Math.floor(segmentProgress), totalSegments - 1);
  const localT = segmentProgress - segmentIndex;
  
  const p0 = points[Math.max(0, segmentIndex - 1)];
  const p1 = points[segmentIndex];
  const p2 = points[Math.min(n - 1, segmentIndex + 1)];
  const p3 = points[Math.min(n - 1, segmentIndex + 2)];
  
  const t2 = localT * localT;
  const t3 = t2 * localT;
  
  return {
    x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * localT + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * localT + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}

function calculatePathLength(path: PathDefinition, samples = 100): number {
  let length = 0;
  let prevPoint = getPointOnPath(path, 0);
  
  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    const point = getPointOnPath(path, t);
    const dx = point.x - prevPoint.x;
    const dy = point.y - prevPoint.y;
    length += Math.sqrt(dx * dx + dy * dy);
    prevPoint = point;
  }
  
  return length;
}

function getPointOnPath(path: PathDefinition, progress: number): Vec2 {
  const t = Math.max(0, Math.min(1, progress));
  
  switch (path.type) {
    case 'linear':
      return linearInterpolate(path.points, t);
    case 'catmull-rom':
      return catmullRomInterpolate(path.points, t);
    case 'bezier':
      return linearInterpolate(path.points, t);
    default:
      return linearInterpolate(path.points, t);
  }
}

function getTangentOnPath(path: PathDefinition, progress: number): Vec2 {
  const delta = 0.001;
  const p1 = getPointOnPath(path, Math.max(0, progress - delta));
  const p2 = getPointOnPath(path, Math.min(1, progress + delta));
  
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  
  if (len === 0) return { x: 1, y: 0 };
  return { x: dx / len, y: dy / len };
}

export const pathSystem: GameSystemDefinition<Record<string, PathDefinition>, Record<string, PathFollowerState>> = {
  id: PATH_SYSTEM_ID,
  version: PATH_VERSION,
  actionTypes: ['path_start', 'path_stop', 'path_set_speed', 'path_teleport'],
  behaviorTypes: ['follow_path', 'path_constrain'],
  expressionFunctions: {
    pathLength: (args, ctx) => {
      if (args.length < 1) throw new Error('pathLength(pathId) requires 1 argument');
      const pathId = String(args[0]);
      const paths = (ctx.variables['__paths'] as unknown as Record<string, PathDefinition>) ?? {};
      const path = paths[pathId];
      if (!path) return 0;
      return calculatePathLength(path);
    },
    
    pathPointAt: (args, ctx) => {
      if (args.length < 2) throw new Error('pathPointAt(pathId, progress) requires 2 arguments');
      const pathId = String(args[0]);
      const progress = Number(args[1]);
      const paths = (ctx.variables['__paths'] as unknown as Record<string, PathDefinition>) ?? {};
      const path = paths[pathId];
      if (!path) return { x: 0, y: 0 };
      return getPointOnPath(path, progress);
    },
    
    pathTangentAt: (args, ctx) => {
      if (args.length < 2) throw new Error('pathTangentAt(pathId, progress) requires 2 arguments');
      const pathId = String(args[0]);
      const progress = Number(args[1]);
      const paths = (ctx.variables['__paths'] as unknown as Record<string, PathDefinition>) ?? {};
      const path = paths[pathId];
      if (!path) return { x: 1, y: 0 };
      return getTangentOnPath(path, progress);
    },
  },
};

export * from './types';
