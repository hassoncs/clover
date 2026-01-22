import { useEffect, useRef, useState, useMemo } from 'react';
import { Canvas, Fill } from '@shopify/react-native-skia';
import type { GalleryItem, ParticleEmitterType, ParticleEmitterConfig, ParticlePoolState } from '@slopcade/shared';
import { PARTICLE_PRESETS } from '@slopcade/shared';
import {
  createParticlePool,
  updateParticles,
} from '@/lib/particles/ParticleSystem';
import { ParticleSystemRenderer } from '@/lib/particles/ParticleRenderer';

type ParticlePreviewProps = {
  item: GalleryItem;
  params: Record<string, unknown>;
  width: number;
  height: number;
};

export default function ParticlePreview({ item, params, width, height }: ParticlePreviewProps) {
  const particleType = item.id.replace('particle-', '') as ParticleEmitterType;
  const preset = PARTICLE_PRESETS[particleType];
  
  const poolRef = useRef<ParticlePoolState | null>(null);
  const configRef = useRef<ParticleEmitterConfig | null>(null);
  const lastTimeRef = useRef<number>(Date.now());
  const [, forceUpdate] = useState({});

  const emitterX = width / 2;
  const emitterY = height - 40;

  useEffect(() => {
    poolRef.current = createParticlePool(
      (params.maxParticles as number) ?? preset?.maxParticles ?? 200
    );
  }, [params.maxParticles, preset?.maxParticles]);

  useEffect(() => {
    configRef.current = {
      ...preset,
      maxParticles: (params.maxParticles as number) ?? preset?.maxParticles ?? 200,
      emissionRate: (params.emissionRate as number) ?? preset?.emissionRate ?? 80,
      lifetime: { 
        min: (params.lifetimeMin as number) ?? preset?.lifetime?.min ?? 0.5, 
        max: (params.lifetimeMax as number) ?? preset?.lifetime?.max ?? 1.5 
      },
      initialSpeed: { 
        min: (params.speedMin as number) ?? preset?.initialSpeed?.min ?? 50, 
        max: (params.speedMax as number) ?? preset?.initialSpeed?.max ?? 100 
      },
      initialDirection: preset?.initialDirection ?? { minAngle: -120, maxAngle: -60 },
      gravity: { 
        x: (params.gravityX as number) ?? preset?.gravity?.x ?? 0, 
        y: (params.gravityY as number) ?? preset?.gravity?.y ?? 0 
      },
      initialSize: { 
        min: ((params.sizeMin as number) ?? preset?.initialSize?.min ?? 5), 
        max: ((params.sizeMax as number) ?? preset?.initialSize?.max ?? 15)
      },
      spawnShape: preset?.spawnShape ?? { kind: 'point' },
      renderStyle: preset?.renderStyle ?? { kind: 'circle' },
    } as ParticleEmitterConfig;
  }, [params, preset]);

  useEffect(() => {
    let animationFrameId: number;

    const animate = () => {
      const now = Date.now();
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = now;

      if (poolRef.current && configRef.current) {
        updateParticles(poolRef.current, configRef.current, dt, emitterX, emitterY);
        forceUpdate({});
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [emitterX, emitterY]);

  const particles = poolRef.current?.particles ?? [];
  const renderStyle = useMemo(() => preset?.renderStyle ?? { kind: 'circle' as const }, [preset]);

  return (
    <Canvas style={{ width, height, borderRadius: 12 }}>
      <Fill color="#0a0a1a" />
      <ParticleSystemRenderer
        particles={particles}
        renderStyle={renderStyle}
        blendMode={preset?.blendMode}
      />
    </Canvas>
  );
}
