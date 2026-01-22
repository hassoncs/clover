import type {
  ParticleEmitterType,
  ParticleEmitterConfig,
  ParticlePoolState,
  Particle,
} from '@slopcade/shared';
import { PARTICLE_PRESETS } from '@slopcade/shared';
import {
  createParticlePool,
  updateParticles,
  getActiveParticles,
  triggerBurst,
} from '../particles/ParticleSystem';

export interface ActiveParticleEffect {
  id: string;
  x: number;
  y: number;
  pool: ParticlePoolState;
  config: ParticleEmitterConfig;
  age: number;
  maxAge: number;
}

const DEFAULT_CONFIG: ParticleEmitterConfig = {
  maxParticles: 100,
  emissionRate: 0,
  burst: { count: 30, cooldown: 0 },
  lifetime: { min: 0.3, max: 0.8 },
  initialSpeed: { min: 100, max: 200 },
  initialDirection: { minAngle: 0, maxAngle: 360 },
  gravity: { x: 0, y: 200 },
  drag: 0.02,
  sizeOverLife: { kind: 'linear', from: 1, to: 0.2 },
  opacityOverLife: { kind: 'easeIn', from: 1, to: 0 },
  initialSize: { min: 4, max: 8 },
  colorOverLife: {
    stops: [
      { position: 0, color: '#ffffff' },
      { position: 0.3, color: '#ffcc00' },
      { position: 1, color: '#ff4400' },
    ],
  },
  spawnShape: { kind: 'point' },
  renderStyle: { kind: 'circle' },
  blendMode: 'plus',
};

export class ParticleEffectManager {
  private effects: Map<string, ActiveParticleEffect> = new Map();
  private nextId = 0;

  triggerEffect(
    type: ParticleEmitterType,
    x: number,
    y: number,
    options?: {
      customConfig?: Partial<ParticleEmitterConfig>;
      continuous?: boolean;
    }
  ): string {
    const id = `effect_${this.nextId++}`;
    const { customConfig, continuous = false } = options ?? {};
    
    const preset = PARTICLE_PRESETS[type] ?? PARTICLE_PRESETS.sparks;
    const config: ParticleEmitterConfig = {
      ...DEFAULT_CONFIG,
      ...preset,
      ...customConfig,
    };
    
    if (!continuous) {
      config.emissionRate = 0;
    }

    const pool = createParticlePool(config.maxParticles);
    
    if (!continuous) {
      triggerBurst(pool);
    }
    updateParticles(pool, config, 0.016, x, y);

    const maxLifetime = continuous ? Infinity : config.lifetime.max + 0.5;
    
    this.effects.set(id, {
      id,
      x,
      y,
      pool,
      config,
      age: 0,
      maxAge: maxLifetime,
    });

    return id;
  }

  stopEffect(id: string): void {
    this.effects.delete(id);
  }

  update(dt: number): void {
    const toRemove: string[] = [];

    for (const [id, effect] of this.effects) {
      effect.age += dt;
      
      updateParticles(effect.pool, effect.config, dt, effect.x, effect.y);

      if (effect.age > effect.maxAge && effect.pool.activeCount === 0) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      this.effects.delete(id);
    }
  }

  updateEffectPosition(id: string, x: number, y: number): void {
    const effect = this.effects.get(id);
    if (effect) {
      effect.x = x;
      effect.y = y;
    }
  }

  getEffect(id: string): ActiveParticleEffect | undefined {
    return this.effects.get(id);
  }

  getAllActiveParticles(): Array<{
    particles: Particle[];
    config: ParticleEmitterConfig;
  }> {
    const result: Array<{ particles: Particle[]; config: ParticleEmitterConfig }> = [];

    for (const effect of this.effects.values()) {
      const activeParticles = getActiveParticles(effect.pool);
      if (activeParticles.length > 0) {
        result.push({
          particles: activeParticles,
          config: effect.config,
        });
      }
    }

    return result;
  }

  clear(): void {
    this.effects.clear();
  }

  get activeEffectCount(): number {
    return this.effects.size;
  }
}

export function createParticleEffectManager(): ParticleEffectManager {
  return new ParticleEffectManager();
}
