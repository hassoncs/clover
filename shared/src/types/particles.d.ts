export type ParticleEmitterType = 'fire' | 'smoke' | 'sparks' | 'magic' | 'explosion' | 'rain' | 'snow' | 'bubbles' | 'confetti' | 'custom';
export type ParticleBlendMode = 'srcOver' | 'screen' | 'plus' | 'multiply';
export type SpawnShape = {
    kind: 'point';
} | {
    kind: 'circle';
    radius: number;
} | {
    kind: 'box';
    width: number;
    height: number;
} | {
    kind: 'line';
    length: number;
    angle: number;
} | {
    kind: 'ring';
    innerRadius: number;
    outerRadius: number;
};
export type RenderStyle = {
    kind: 'circle';
} | {
    kind: 'square';
} | {
    kind: 'sprite';
    imageUrl: string;
} | {
    kind: 'trail';
    length: number;
};
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
    gravity: {
        x: number;
        y: number;
    };
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
export declare const PARTICLE_PRESETS: Record<ParticleEmitterType, Partial<ParticleEmitterConfig>>;
export interface ParticleEmitterMeta {
    type: ParticleEmitterType;
    displayName: string;
    description: string;
    icon: string;
}
export declare const PARTICLE_EMITTER_METADATA: ParticleEmitterMeta[];
//# sourceMappingURL=particles.d.ts.map