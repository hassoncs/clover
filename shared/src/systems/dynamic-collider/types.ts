import { z } from 'zod';
import type { Value } from '../../expressions/types';

export const DynamicColliderConfigSchema = z.object({
  enabled: z.boolean().default(true),
});

export type DynamicColliderConfig = z.infer<typeof DynamicColliderConfigSchema>;

export interface SetEntitySizeAction {
  type: 'set_entity_size';
  target: EntitySizeTarget;
  scale?: Value<number>;
  radius?: Value<number>;
  width?: Value<number>;
  height?: Value<number>;
  duration?: Value<number>;
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export type EntitySizeTarget =
  | { type: 'self' }
  | { type: 'by_id'; entityId: string }
  | { type: 'by_tag'; tag: string };

export interface EntitySizeState {
  originalScale: number;
  currentScale: number;
  targetScale: number;
  animationStartTime: number | null;
  animationDuration: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}
