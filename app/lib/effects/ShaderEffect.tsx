import React, { useMemo } from 'react';
import {
  Group,
  Fill,
  Shader,
  Paint,
} from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import type { EffectSpec } from '@slopcade/shared';
import { getCompiledShader, getEffectUniforms, needsOffscreen } from './EffectRegistry';

interface ShaderEffectProps {
  effect: EffectSpec;
  width: number;
  height: number;
  clock: SharedValue<number>;
  children: React.ReactNode;
}

function getBlendMode(effectType: string): string {
  switch (effectType) {
    case 'glow':
    case 'holographic':
      return 'screen';
    case 'vignette':
    case 'scanlines':
      return 'multiply';
    default:
      return 'srcOver';
  }
}

export function ShaderEffect({ effect, width, height, clock, children }: ShaderEffectProps) {
  const shader = useMemo(() => getCompiledShader(effect.type), [effect.type]);
  const isImageSampling = useMemo(() => needsOffscreen(effect), [effect]);

  const uniforms = useDerivedValue(() => {
    const time = clock.value / 1000;
    return getEffectUniforms(effect, width, height, time);
  }, [effect, width, height]);

  if (!shader) {
    return <>{children}</>;
  }

  if (isImageSampling) {
    return (
      <Group
        layer={
          <Paint>
            <Shader source={shader} uniforms={uniforms} />
          </Paint>
        }
      >
        {children}
      </Group>
    );
  }

  return (
    <>
      {children}
      <Group blendMode={getBlendMode(effect.type) as any}>
        <Fill>
          <Shader source={shader} uniforms={uniforms} />
        </Fill>
      </Group>
    </>
  );
}

interface ShaderOverlayProps {
  effect: EffectSpec;
  width: number;
  height: number;
  clock: SharedValue<number>;
}

export function ShaderOverlay({ effect, width, height, clock }: ShaderOverlayProps) {
  const shader = useMemo(() => getCompiledShader(effect.type), [effect.type]);

  const uniforms = useDerivedValue(() => {
    const time = clock.value / 1000;
    return getEffectUniforms(effect, width, height, time);
  }, [effect, width, height]);

  if (!shader) {
    return null;
  }

  return (
    <Group blendMode={getBlendMode(effect.type) as any}>
      <Fill>
        <Shader source={shader} uniforms={uniforms} />
      </Fill>
    </Group>
  );
}

interface ImageFilterShaderProps {
  effect: EffectSpec;
  width: number;
  height: number;
  clock: SharedValue<number>;
  children: React.ReactNode;
}

export function ImageFilterShader({ effect, width, height, clock, children }: ImageFilterShaderProps) {
  const shader = useMemo(() => getCompiledShader(effect.type), [effect.type]);

  const uniforms = useDerivedValue(() => {
    const time = clock.value / 1000;
    return getEffectUniforms(effect, width, height, time);
  }, [effect, width, height]);

  if (!shader) {
    return <>{children}</>;
  }

  return (
    <Group
      layer={
        <Paint>
          <Shader source={shader} uniforms={uniforms} />
        </Paint>
      }
    >
      {children}
    </Group>
  );
}
