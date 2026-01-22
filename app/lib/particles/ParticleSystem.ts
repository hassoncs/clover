import type {
  Particle,
  ParticleEmitterConfig,
  ParticlePoolState,
  Curve,
  ColorGradient,
  SpawnShape,
  NumberRange,
} from '@slopcade/shared';

export function createParticlePool(maxParticles: number): ParticlePoolState {
  const particles: Particle[] = [];
  for (let i = 0; i < maxParticles; i++) {
    particles.push({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      age: 0,
      lifetime: 1,
      size: 1,
      opacity: 1,
      rotation: 0,
      rotationSpeed: 0,
      color: '#ffffff',
      active: false,
    });
  }
  return {
    particles,
    activeCount: 0,
    spawnAccumulator: 0,
    burstCooldown: 0,
  };
}

export function updateParticles(
  pool: ParticlePoolState,
  config: ParticleEmitterConfig,
  dt: number,
  emitterX: number,
  emitterY: number
): void {
  const { particles } = pool;
  
  pool.spawnAccumulator += config.emissionRate * dt;
  
  while (pool.spawnAccumulator >= 1 && pool.activeCount < config.maxParticles) {
    spawnParticle(pool, config, emitterX, emitterY);
    pool.spawnAccumulator -= 1;
  }
  
  if (config.burst && pool.burstCooldown === 0) {
    for (let i = 0; i < config.burst.count && pool.activeCount < config.maxParticles; i++) {
      spawnParticle(pool, config, emitterX, emitterY);
    }
    pool.burstCooldown = config.burst.cooldown > 0 ? config.burst.cooldown : -1;
  }
  
  if (pool.burstCooldown > 0) {
    pool.burstCooldown -= dt;
  }
  
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    if (!p.active) continue;
    
    p.age += dt;
    
    if (p.age >= p.lifetime) {
      p.active = false;
      pool.activeCount--;
      continue;
    }
    
    const lifeRatio = p.age / p.lifetime;
    
    p.vx += config.gravity.x * dt;
    p.vy += config.gravity.y * dt;
    
    if (config.drag) {
      const dragFactor = 1 - config.drag;
      p.vx *= dragFactor;
      p.vy *= dragFactor;
    }
    
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    
    p.rotation += p.rotationSpeed * dt;
    
    if (config.sizeOverLife) {
      const baseSize = (config.initialSize.min + config.initialSize.max) / 2;
      p.size = baseSize * evaluateCurve(config.sizeOverLife, lifeRatio);
    }
    
    if (config.opacityOverLife) {
      const baseOpacity = config.initialOpacity
        ? (config.initialOpacity.min + config.initialOpacity.max) / 2
        : 1;
      p.opacity = baseOpacity * evaluateCurve(config.opacityOverLife, lifeRatio);
    }
    
    if (config.colorOverLife) {
      p.color = evaluateColorGradient(config.colorOverLife, lifeRatio);
    }
  }
}

function spawnParticle(
  pool: ParticlePoolState,
  config: ParticleEmitterConfig,
  emitterX: number,
  emitterY: number
): void {
  let freeIndex = -1;
  for (let i = 0; i < pool.particles.length; i++) {
    if (!pool.particles[i].active) {
      freeIndex = i;
      break;
    }
  }
  
  if (freeIndex === -1) return;
  
  const p = pool.particles[freeIndex];
  
  const spawnOffset = getSpawnOffset(config.spawnShape);
  p.x = emitterX + spawnOffset.x;
  p.y = emitterY + spawnOffset.y;
  
  const speed = randomInRange(config.initialSpeed);
  const angle = randomInRange({
    min: config.initialDirection.minAngle * (Math.PI / 180),
    max: config.initialDirection.maxAngle * (Math.PI / 180),
  });
  
  p.vx = Math.cos(angle) * speed;
  p.vy = Math.sin(angle) * speed;
  
  p.age = 0;
  p.lifetime = randomInRange(config.lifetime);
  p.size = randomInRange(config.initialSize);
  p.opacity = config.initialOpacity ? randomInRange(config.initialOpacity) : 1;
  p.rotation = config.initialRotation ? randomInRange(config.initialRotation) : 0;
  p.rotationSpeed = config.rotationSpeed
    ? randomInRange(config.rotationSpeed) * (Math.PI / 180)
    : 0;
  
  if (config.colorOverLife) {
    p.color = evaluateColorGradient(config.colorOverLife, 0);
  } else {
    p.color = '#ffffff';
  }
  
  p.active = true;
  pool.activeCount++;
}

function getSpawnOffset(shape: SpawnShape): { x: number; y: number } {
  switch (shape.kind) {
    case 'point':
      return { x: 0, y: 0 };
    
    case 'circle': {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * shape.radius;
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      };
    }
    
    case 'box':
      return {
        x: (Math.random() - 0.5) * shape.width,
        y: (Math.random() - 0.5) * shape.height,
      };
    
    case 'line': {
      const t = Math.random() - 0.5;
      const angleRad = shape.angle * (Math.PI / 180);
      return {
        x: Math.cos(angleRad) * shape.length * t,
        y: Math.sin(angleRad) * shape.length * t,
      };
    }
    
    case 'ring': {
      const angle = Math.random() * Math.PI * 2;
      const radius =
        shape.innerRadius +
        Math.random() * (shape.outerRadius - shape.innerRadius);
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      };
    }
  }
}

function randomInRange(range: NumberRange): number {
  return range.min + Math.random() * (range.max - range.min);
}

function evaluateCurve(curve: Curve, t: number): number {
  switch (curve.kind) {
    case 'constant':
      return curve.from;
    
    case 'linear':
      return curve.from + (curve.to - curve.from) * t;
    
    case 'easeIn':
      return curve.from + (curve.to - curve.from) * (t * t);
    
    case 'easeOut':
      return curve.from + (curve.to - curve.from) * (1 - (1 - t) * (1 - t));
    
    case 'easeInOut': {
      const t2 = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      return curve.from + (curve.to - curve.from) * t2;
    }
  }
}

function evaluateColorGradient(gradient: ColorGradient, t: number): string {
  const { stops } = gradient;
  
  if (stops.length === 0) return '#ffffff';
  if (stops.length === 1) return stops[0].color;
  
  let startStop = stops[0];
  let endStop = stops[stops.length - 1];
  
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].position && t <= stops[i + 1].position) {
      startStop = stops[i];
      endStop = stops[i + 1];
      break;
    }
  }
  
  const range = endStop.position - startStop.position;
  const localT = range > 0 ? (t - startStop.position) / range : 0;
  
  return lerpColor(startStop.color, endStop.color, localT);
}

function lerpColor(color1: string, color2: string, t: number): string {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);
  
  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);
  
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function triggerBurst(pool: ParticlePoolState): void {
  pool.burstCooldown = 0;
}

export function resetParticles(pool: ParticlePoolState): void {
  for (const p of pool.particles) {
    p.active = false;
  }
  pool.activeCount = 0;
  pool.spawnAccumulator = 0;
  pool.burstCooldown = 0;
}

export function getActiveParticles(pool: ParticlePoolState): Particle[] {
  return pool.particles.filter((p) => p.active);
}
