import { useState, useCallback, useRef } from 'react';
import type { Physics2D } from './Physics2D';
import type { BodyId } from './types';

export interface TransformState {
  id: BodyId;
  x: number;
  y: number;
  angle: number;
}

export function readBodyTransforms(
  physics: Physics2D,
  bodyIds: readonly BodyId[],
  pixelsPerMeter: number
): TransformState[] {
  return bodyIds.map((id) => {
    const t = physics.getTransform(id);
    return {
      id,
      x: t.position.x * pixelsPerMeter,
      y: t.position.y * pixelsPerMeter,
      angle: t.angle,
    };
  });
}

export interface UseBodyTransformsOptions {
  pixelsPerMeter: number;
}

export interface UseBodyTransformsResult {
  transforms: TransformState[];
  sync: (physics: Physics2D) => void;
  setBodyIds: (ids: BodyId[]) => void;
}

export function useBodyTransforms(
  options: UseBodyTransformsOptions
): UseBodyTransformsResult {
  const { pixelsPerMeter } = options;
  const bodyIdsRef = useRef<BodyId[]>([]);
  const [transforms, setTransforms] = useState<TransformState[]>([]);

  const setBodyIds = useCallback((ids: BodyId[]) => {
    bodyIdsRef.current = ids;
  }, []);

  const sync = useCallback((physics: Physics2D) => {
    if (bodyIdsRef.current.length === 0) return;
    const updated = readBodyTransforms(physics, bodyIdsRef.current, pixelsPerMeter);
    setTransforms(updated);
  }, [pixelsPerMeter]);

  return {
    transforms,
    sync,
    setBodyIds,
  };
}

export interface ExtendedTransformState<T = Record<string, unknown>> extends TransformState {
  data: T;
}

export function readBodyTransformsWithData<T>(
  physics: Physics2D,
  bodies: readonly { id: BodyId; data: T }[],
  pixelsPerMeter: number
): ExtendedTransformState<T>[] {
  return bodies.map(({ id, data }) => {
    const t = physics.getTransform(id);
    return {
      id,
      x: t.position.x * pixelsPerMeter,
      y: t.position.y * pixelsPerMeter,
      angle: t.angle,
      data,
    };
  });
}

export interface BodyRecord<T = Record<string, unknown>> {
  id: BodyId;
  data: T;
}

export interface UseBodyTransformsWithDataOptions<T> {
  pixelsPerMeter: number;
  initialBodies?: BodyRecord<T>[];
}

export interface UseBodyTransformsWithDataResult<T> {
  transforms: ExtendedTransformState<T>[];
  sync: (physics: Physics2D) => void;
  setBodies: (bodies: BodyRecord<T>[]) => void;
  addBody: (id: BodyId, data: T) => void;
  removeBody: (id: BodyId) => void;
}

export function useBodyTransformsWithData<T>(
  options: UseBodyTransformsWithDataOptions<T>
): UseBodyTransformsWithDataResult<T> {
  const { pixelsPerMeter, initialBodies = [] } = options;
  const bodiesRef = useRef<BodyRecord<T>[]>(initialBodies);
  const [transforms, setTransforms] = useState<ExtendedTransformState<T>[]>([]);

  const setBodies = useCallback((bodies: BodyRecord<T>[]) => {
    bodiesRef.current = bodies;
  }, []);

  const addBody = useCallback((id: BodyId, data: T) => {
    bodiesRef.current = [...bodiesRef.current, { id, data }];
  }, []);

  const removeBody = useCallback((id: BodyId) => {
    bodiesRef.current = bodiesRef.current.filter(b => b.id.value !== id.value);
  }, []);

  const sync = useCallback((physics: Physics2D) => {
    if (bodiesRef.current.length === 0) return;
    const updated = readBodyTransformsWithData(physics, bodiesRef.current, pixelsPerMeter);
    setTransforms(updated);
  }, [pixelsPerMeter]);

  return {
    transforms,
    sync,
    setBodies,
    addBody,
    removeBody,
  };
}
