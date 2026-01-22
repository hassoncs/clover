import { 
  PARTICLE_PRESETS, 
  PARTICLE_EMITTER_METADATA,
  type ParticleEmitterType,
  type ParticleEmitterConfig,
} from '../../types/particles';
import type { ParticleGalleryItem, ParamDefinition } from '../types';
import { registerGalleryItem } from '../registry';

const PARTICLE_PARAMS: ParamDefinition[] = [
  { key: 'emissionRate', type: 'number', displayName: 'Emission Rate', min: 0, max: 500, step: 10, defaultValue: 80 },
  { key: 'maxParticles', type: 'number', displayName: 'Max Particles', min: 10, max: 1000, step: 10, defaultValue: 200 },
  { key: 'lifetimeMin', type: 'number', displayName: 'Lifetime Min', min: 0.1, max: 10, step: 0.1, defaultValue: 0.5 },
  { key: 'lifetimeMax', type: 'number', displayName: 'Lifetime Max', min: 0.1, max: 10, step: 0.1, defaultValue: 1.5 },
  { key: 'speedMin', type: 'number', displayName: 'Speed Min', min: 0, max: 1000, step: 10, defaultValue: 50 },
  { key: 'speedMax', type: 'number', displayName: 'Speed Max', min: 0, max: 1000, step: 10, defaultValue: 100 },
  { key: 'gravityX', type: 'number', displayName: 'Gravity X', min: -500, max: 500, step: 10, defaultValue: 0 },
  { key: 'gravityY', type: 'number', displayName: 'Gravity Y', min: -500, max: 500, step: 10, defaultValue: 0 },
  { key: 'sizeMin', type: 'number', displayName: 'Size Min', min: 1, max: 50, step: 1, defaultValue: 5 },
  { key: 'sizeMax', type: 'number', displayName: 'Size Max', min: 1, max: 50, step: 1, defaultValue: 15 },
];

function createParticleGalleryItem(type: ParticleEmitterType): ParticleGalleryItem {
  const meta = PARTICLE_EMITTER_METADATA.find(m => m.type === type);
  const preset = PARTICLE_PRESETS[type];
  
  const defaultParams: Record<string, unknown> = {
    emissionRate: preset?.emissionRate ?? 80,
    maxParticles: preset?.maxParticles ?? 200,
    lifetimeMin: preset?.lifetime?.min ?? 0.5,
    lifetimeMax: preset?.lifetime?.max ?? 1.5,
    speedMin: preset?.initialSpeed?.min ?? 50,
    speedMax: preset?.initialSpeed?.max ?? 100,
    gravityX: preset?.gravity?.x ?? 0,
    gravityY: preset?.gravity?.y ?? 0,
    sizeMin: preset?.initialSize?.min ?? 5,
    sizeMax: preset?.initialSize?.max ?? 15,
  };

  return {
    id: `particle-${type}`,
    section: 'particles',
    title: meta?.displayName ?? type,
    description: meta?.description ?? `${type} particle effect`,
    icon: meta?.icon,
    emitterType: type,
    tags: ['particle', 'emitter', 'animation'],
    params: PARTICLE_PARAMS,
    defaultParams,
    getExportJSON: (currentParams) => ({
      type,
      config: {
        maxParticles: currentParams.maxParticles,
        emissionRate: currentParams.emissionRate,
        lifetime: { min: currentParams.lifetimeMin, max: currentParams.lifetimeMax },
        initialSpeed: { min: currentParams.speedMin, max: currentParams.speedMax },
        gravity: { x: currentParams.gravityX, y: currentParams.gravityY },
        initialSize: { min: currentParams.sizeMin, max: currentParams.sizeMax },
        ...(preset ?? {}),
      },
    }),
    getUsageExample: (currentParams) => `
// Add particle emitter to entity
{
  particles: {
    type: '${type}',
    config: {
      emissionRate: ${currentParams.emissionRate},
      maxParticles: ${currentParams.maxParticles},
      lifetime: { min: ${currentParams.lifetimeMin}, max: ${currentParams.lifetimeMax} },
      initialSpeed: { min: ${currentParams.speedMin}, max: ${currentParams.speedMax} },
      gravity: { x: ${currentParams.gravityX}, y: ${currentParams.gravityY} },
    }
  }
}`,
  };
}

const particleTypes: ParticleEmitterType[] = [
  'fire',
  'smoke', 
  'sparks',
  'magic',
  'explosion',
  'rain',
  'snow',
  'bubbles',
  'confetti',
  'custom',
];

export function registerParticleItems(): void {
  particleTypes.forEach(type => {
    registerGalleryItem(createParticleGalleryItem(type));
  });
}

export const PARTICLE_GALLERY_ITEMS = particleTypes.map(createParticleGalleryItem);
