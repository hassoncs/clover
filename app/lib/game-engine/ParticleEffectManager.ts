import type {
  ParticleEmitterType,
  ParticleEmitterConfig,
  Particle,
} from '@slopcade/shared';

export interface ActiveParticleEffect {
  id: string;
  x: number;
  y: number;
  config: ParticleEmitterConfig;
  age: number;
  maxAge: number;
}

export class ParticleEffectManager {
  triggerEffect(
    _type: ParticleEmitterType,
    _x: number,
    _y: number,
    _options?: {
      customConfig?: Partial<ParticleEmitterConfig>;
      continuous?: boolean;
    }
  ): string {
    return `effect_stub_${Date.now()}`;
  }

  stopEffect(_id: string): void {
  }

  update(_dt: number): void {
  }

  updateEffectPosition(_id: string, _x: number, _y: number): void {
  }

  getEffect(_id: string): ActiveParticleEffect | undefined {
    return undefined;
  }

  getAllActiveParticles(): Array<{
    particles: Particle[];
    config: ParticleEmitterConfig;
  }> {
    return [];
  }

  clear(): void {
  }

  get activeEffectCount(): number {
    return 0;
  }
}

export function createParticleEffectManager(): ParticleEffectManager {
  return new ParticleEffectManager();
}
