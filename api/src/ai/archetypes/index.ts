export * from './paint-shader';
export { paintShaderArchetype, type ShaderArchetype } from './paint-shader';

import { paintShaderArchetype } from './paint-shader';
import type { ShaderArchetype } from './paint-shader';

export const ARCHETYPES: Record<string, ShaderArchetype> = {
  'paint-shader': paintShaderArchetype,
};
