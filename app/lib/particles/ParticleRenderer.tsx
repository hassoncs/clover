import React, { useMemo } from 'react';
import { Group, Circle, Rect, Line, vec } from '@shopify/react-native-skia';
import type { Particle, RenderStyle, ParticleBlendMode } from '@slopcade/shared';
import { PARTICLE_RENDER_CAP } from './ParticleSystem';

interface ParticleRendererProps {
  particles: Particle[];
  renderStyle: RenderStyle;
  blendMode?: ParticleBlendMode;
}

export function ParticleRenderer({
  particles,
  renderStyle,
  blendMode = 'srcOver',
}: ParticleRendererProps) {
  const blendModeMap: Record<ParticleBlendMode, string> = {
    srcOver: 'srcOver',
    screen: 'screen',
    plus: 'plus',
    multiply: 'multiply',
  };

  const skiaBlendMode = blendModeMap[blendMode];

  const particleElements = useMemo(() => {
    const cappedParticles = particles.length > PARTICLE_RENDER_CAP 
      ? particles.slice(0, PARTICLE_RENDER_CAP) 
      : particles;
    return cappedParticles.map((particle, index) => (
      <ParticleShape
        key={`particle-${index}`}
        particle={particle}
        renderStyle={renderStyle}
      />
    ));
  }, [particles, renderStyle]);

  return (
    <Group blendMode={skiaBlendMode as any}>
      {particleElements}
    </Group>
  );
}

interface ParticleShapeProps {
  particle: Particle;
  renderStyle: RenderStyle;
}

function ParticleShape({ particle, renderStyle }: ParticleShapeProps) {
  const { x, y, size, opacity, rotation, color } = particle;

  switch (renderStyle.kind) {
    case 'circle':
      return (
        <Circle
          cx={x}
          cy={y}
          r={size / 2}
          color={color}
          opacity={opacity}
        />
      );

    case 'square':
      return (
        <Group
          transform={[
            { translateX: x },
            { translateY: y },
            { rotate: rotation },
          ]}
          origin={{ x: 0, y: 0 }}
        >
          <Rect
            x={-size / 2}
            y={-size / 2}
            width={size}
            height={size}
            color={color}
            opacity={opacity}
          />
        </Group>
      );

    case 'trail': {
      const trailLength = renderStyle.length;
      const vx = particle.vx || 0;
      const vy = particle.vy || 0;
      const speed = Math.sqrt(vx * vx + vy * vy);
      
      if (speed < 0.1) {
        return (
          <Circle
            cx={x}
            cy={y}
            r={size / 2}
            color={color}
            opacity={opacity}
          />
        );
      }
      
      const normalizedVx = vx / speed;
      const normalizedVy = vy / speed;
      const endX = x - normalizedVx * trailLength;
      const endY = y - normalizedVy * trailLength;
      
      return (
        <Line
          p1={vec(x, y)}
          p2={vec(endX, endY)}
          color={color}
          style="stroke"
          strokeWidth={size}
          opacity={opacity}
        />
      );
    }

    case 'sprite':
      return (
        <Circle
          cx={x}
          cy={y}
          r={size / 2}
          color={color}
          opacity={opacity}
        />
      );

    default:
      return null;
  }
}

interface ParticleSystemRendererProps {
  particles: Particle[];
  renderStyle: RenderStyle;
  blendMode?: ParticleBlendMode;
  offsetX?: number;
  offsetY?: number;
}

export function ParticleSystemRenderer({
  particles,
  renderStyle,
  blendMode,
  offsetX = 0,
  offsetY = 0,
}: ParticleSystemRendererProps) {
  if (particles.length === 0) {
    return null;
  }

  return (
    <Group transform={[{ translateX: offsetX }, { translateY: offsetY }]}>
      <ParticleRenderer
        particles={particles}
        renderStyle={renderStyle}
        blendMode={blendMode}
      />
    </Group>
  );
}
