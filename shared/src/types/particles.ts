export type ParticleEmitterType =
  | 'fire'
  | 'smoke'
  | 'sparks'
  | 'magic'
  | 'explosion'
  | 'rain'
  | 'snow'
  | 'bubbles'
  | 'confetti'
  | 'custom';

export type ParticleBlendMode =
  | 'srcOver'
  | 'screen'
  | 'plus'
  | 'multiply';

export type SpawnShape =
  | { kind: 'point' }
  | { kind: 'circle'; radius: number }
  | { kind: 'box'; width: number; height: number }
  | { kind: 'line'; length: number; angle: number }
  | { kind: 'ring'; innerRadius: number; outerRadius: number };

export type RenderStyle =
  | { kind: 'circle' }
  | { kind: 'square' }
  | { kind: 'sprite'; imageUrl: string }
  | { kind: 'trail'; length: number };

export interface NumberRange {
  min: number;
  max: number;
}

export interface Curve {
  kind: 'constant' | 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
  from: number;
  to: number;
}

export interface ColorStop {
  position: number;
  color: string;
}

export interface ColorGradient {
  stops: ColorStop[];
}

export interface ParticleEmitterConfig {
  maxParticles: number;
  emissionRate: number;
  burst?: {
    count: number;
    cooldown: number;
  };
  lifetime: NumberRange;
  initialSpeed: NumberRange;
  initialDirection: {
    minAngle: number;
    maxAngle: number;
  };
  gravity: { x: number; y: number };
  drag?: number;
  sizeOverLife?: Curve;
  opacityOverLife?: Curve;
  rotationOverLife?: Curve;
  colorOverLife?: ColorGradient;
  initialSize: NumberRange;
  initialOpacity?: NumberRange;
  initialRotation?: NumberRange;
  rotationSpeed?: NumberRange;
  spawnShape: SpawnShape;
  renderStyle: RenderStyle;
  blendMode?: ParticleBlendMode;
  localSpace?: boolean;
}

export interface ParticleEmitterComponent {
  type: ParticleEmitterType;
  config: ParticleEmitterConfig;
  enabled?: boolean;
  offsetX?: number;
  offsetY?: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  lifetime: number;
  size: number;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  active: boolean;
}

export interface ParticlePoolState {
  particles: Particle[];
  activeCount: number;
  spawnAccumulator: number;
  burstCooldown: number;
}

export const PARTICLE_PRESETS: Record<ParticleEmitterType, Partial<ParticleEmitterConfig>> = {
  fire: {
    maxParticles: 200,
    emissionRate: 80,
    lifetime: { min: 0.5, max: 1.2 },
    initialSpeed: { min: 50, max: 100 },
    initialDirection: { minAngle: -120, maxAngle: -60 },
    gravity: { x: 0, y: -20 },
    drag: 0.02,
    sizeOverLife: { kind: 'easeOut', from: 1, to: 0.2 },
    opacityOverLife: { kind: 'easeIn', from: 1, to: 0 },
    initialSize: { min: 8, max: 16 },
    colorOverLife: {
      stops: [
        { position: 0, color: '#ffcc00' },
        { position: 0.3, color: '#ff8800' },
        { position: 0.7, color: '#ff4400' },
        { position: 1, color: '#440000' },
      ],
    },
    spawnShape: { kind: 'circle', radius: 5 },
    renderStyle: { kind: 'circle' },
    blendMode: 'plus',
  },
  smoke: {
    maxParticles: 100,
    emissionRate: 20,
    lifetime: { min: 2, max: 4 },
    initialSpeed: { min: 20, max: 40 },
    initialDirection: { minAngle: -100, maxAngle: -80 },
    gravity: { x: 0, y: -10 },
    drag: 0.05,
    sizeOverLife: { kind: 'linear', from: 1, to: 3 },
    opacityOverLife: { kind: 'easeIn', from: 0.6, to: 0 },
    initialSize: { min: 15, max: 25 },
    colorOverLife: {
      stops: [
        { position: 0, color: '#888888' },
        { position: 1, color: '#333333' },
      ],
    },
    spawnShape: { kind: 'circle', radius: 3 },
    renderStyle: { kind: 'circle' },
    blendMode: 'srcOver',
  },
  sparks: {
    maxParticles: 300,
    emissionRate: 150,
    lifetime: { min: 0.2, max: 0.5 },
    initialSpeed: { min: 150, max: 300 },
    initialDirection: { minAngle: 0, maxAngle: 360 },
    gravity: { x: 0, y: 200 },
    drag: 0.01,
    sizeOverLife: { kind: 'constant', from: 1, to: 1 },
    opacityOverLife: { kind: 'linear', from: 1, to: 0 },
    initialSize: { min: 2, max: 4 },
    colorOverLife: {
      stops: [
        { position: 0, color: '#ffff00' },
        { position: 0.5, color: '#ff8800' },
        { position: 1, color: '#ff4400' },
      ],
    },
    spawnShape: { kind: 'point' },
    renderStyle: { kind: 'trail', length: 10 },
    blendMode: 'plus',
  },
  magic: {
    maxParticles: 150,
    emissionRate: 60,
    lifetime: { min: 1, max: 2 },
    initialSpeed: { min: 30, max: 60 },
    initialDirection: { minAngle: 0, maxAngle: 360 },
    gravity: { x: 0, y: -5 },
    drag: 0.03,
    sizeOverLife: { kind: 'easeInOut', from: 0, to: 1 },
    opacityOverLife: { kind: 'easeInOut', from: 0, to: 1 },
    initialSize: { min: 4, max: 8 },
    rotationSpeed: { min: -180, max: 180 },
    colorOverLife: {
      stops: [
        { position: 0, color: '#ff00ff' },
        { position: 0.33, color: '#00ffff' },
        { position: 0.66, color: '#ffff00' },
        { position: 1, color: '#ff00ff' },
      ],
    },
    spawnShape: { kind: 'ring', innerRadius: 20, outerRadius: 25 },
    renderStyle: { kind: 'square' },
    blendMode: 'screen',
  },
  explosion: {
    maxParticles: 200,
    emissionRate: 0,
    burst: { count: 100, cooldown: 0 },
    lifetime: { min: 0.5, max: 1.5 },
    initialSpeed: { min: 200, max: 400 },
    initialDirection: { minAngle: 0, maxAngle: 360 },
    gravity: { x: 0, y: 300 },
    drag: 0.02,
    sizeOverLife: { kind: 'linear', from: 1, to: 0.3 },
    opacityOverLife: { kind: 'easeIn', from: 1, to: 0 },
    initialSize: { min: 5, max: 15 },
    colorOverLife: {
      stops: [
        { position: 0, color: '#ffffff' },
        { position: 0.2, color: '#ffcc00' },
        { position: 0.5, color: '#ff4400' },
        { position: 1, color: '#220000' },
      ],
    },
    spawnShape: { kind: 'point' },
    renderStyle: { kind: 'circle' },
    blendMode: 'plus',
  },
  rain: {
    maxParticles: 500,
    emissionRate: 200,
    lifetime: { min: 0.5, max: 1.5 },
    initialSpeed: { min: 400, max: 600 },
    initialDirection: { minAngle: 85, maxAngle: 95 },
    gravity: { x: 0, y: 100 },
    drag: 0,
    sizeOverLife: { kind: 'constant', from: 1, to: 1 },
    opacityOverLife: { kind: 'constant', from: 0.6, to: 0.6 },
    initialSize: { min: 2, max: 4 },
    colorOverLife: {
      stops: [
        { position: 0, color: '#aaddff' },
        { position: 1, color: '#6699cc' },
      ],
    },
    spawnShape: { kind: 'line', length: 800, angle: 0 },
    renderStyle: { kind: 'trail', length: 20 },
    blendMode: 'srcOver',
  },
  snow: {
    maxParticles: 300,
    emissionRate: 50,
    lifetime: { min: 3, max: 6 },
    initialSpeed: { min: 20, max: 50 },
    initialDirection: { minAngle: 80, maxAngle: 100 },
    gravity: { x: 0, y: 20 },
    drag: 0.02,
    sizeOverLife: { kind: 'constant', from: 1, to: 1 },
    opacityOverLife: { kind: 'easeOut', from: 0.8, to: 0 },
    initialSize: { min: 3, max: 8 },
    rotationSpeed: { min: -90, max: 90 },
    colorOverLife: {
      stops: [
        { position: 0, color: '#ffffff' },
        { position: 1, color: '#ddddff' },
      ],
    },
    spawnShape: { kind: 'line', length: 800, angle: 0 },
    renderStyle: { kind: 'circle' },
    blendMode: 'srcOver',
  },
  bubbles: {
    maxParticles: 100,
    emissionRate: 15,
    lifetime: { min: 2, max: 5 },
    initialSpeed: { min: 30, max: 60 },
    initialDirection: { minAngle: -100, maxAngle: -80 },
    gravity: { x: 0, y: -30 },
    drag: 0.01,
    sizeOverLife: { kind: 'linear', from: 1, to: 1.2 },
    opacityOverLife: { kind: 'linear', from: 0.7, to: 0 },
    initialSize: { min: 8, max: 20 },
    colorOverLife: {
      stops: [
        { position: 0, color: '#aaddff' },
        { position: 0.5, color: '#ddffff' },
        { position: 1, color: '#ffffff' },
      ],
    },
    spawnShape: { kind: 'box', width: 50, height: 10 },
    renderStyle: { kind: 'circle' },
    blendMode: 'screen',
  },
  confetti: {
    maxParticles: 300,
    emissionRate: 0,
    burst: { count: 200, cooldown: 0 },
    lifetime: { min: 2, max: 4 },
    initialSpeed: { min: 150, max: 350 },
    initialDirection: { minAngle: -140, maxAngle: -40 },
    gravity: { x: 0, y: 150 },
    drag: 0.02,
    sizeOverLife: { kind: 'constant', from: 1, to: 1 },
    opacityOverLife: { kind: 'easeIn', from: 1, to: 0 },
    initialSize: { min: 6, max: 12 },
    rotationSpeed: { min: -360, max: 360 },
    colorOverLife: {
      stops: [
        { position: 0, color: '#ff0000' },
        { position: 0.2, color: '#ffff00' },
        { position: 0.4, color: '#00ff00' },
        { position: 0.6, color: '#00ffff' },
        { position: 0.8, color: '#0000ff' },
        { position: 1, color: '#ff00ff' },
      ],
    },
    spawnShape: { kind: 'point' },
    renderStyle: { kind: 'square' },
    blendMode: 'srcOver',
  },
  custom: {
    maxParticles: 100,
    emissionRate: 50,
    lifetime: { min: 1, max: 2 },
    initialSpeed: { min: 50, max: 100 },
    initialDirection: { minAngle: 0, maxAngle: 360 },
    gravity: { x: 0, y: 0 },
    initialSize: { min: 5, max: 10 },
    spawnShape: { kind: 'point' },
    renderStyle: { kind: 'circle' },
    blendMode: 'srcOver',
  },
};

export interface ParticleEmitterMeta {
  type: ParticleEmitterType;
  displayName: string;
  description: string;
  icon: string;
}

export const PARTICLE_EMITTER_METADATA: ParticleEmitterMeta[] = [
  { type: 'fire', displayName: 'Fire', description: 'Flickering flames rising upward', icon: '🔥' },
  { type: 'smoke', displayName: 'Smoke', description: 'Billowing clouds that drift and fade', icon: '💨' },
  { type: 'sparks', displayName: 'Sparks', description: 'Quick bright particles that spray out', icon: '✨' },
  { type: 'magic', displayName: 'Magic', description: 'Sparkly particles that orbit and shimmer', icon: '🪄' },
  { type: 'explosion', displayName: 'Explosion', description: 'Sudden burst of particles outward', icon: '💥' },
  { type: 'rain', displayName: 'Rain', description: 'Falling droplets from above', icon: '🌧️' },
  { type: 'snow', displayName: 'Snow', description: 'Gentle snowflakes drifting down', icon: '❄️' },
  { type: 'bubbles', displayName: 'Bubbles', description: 'Rising spheres that pop', icon: '🫧' },
  { type: 'confetti', displayName: 'Confetti', description: 'Colorful celebration burst', icon: '🎊' },
  { type: 'custom', displayName: 'Custom', description: 'Configure your own particle effect', icon: '⚙️' },
];
