import React, { useMemo } from 'react';
import {
  Group,
  Blur,
  Shader,
  Fill,
  Rect,
  BlendColor,
  useClock,
} from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import type { EffectSpec, EffectChain } from '@slopcade/shared';
import { getCompiledShader, getEffectUniforms, needsTimeUniform } from './EffectRegistry';

interface EffectApplierProps {
  effects: EffectChain;
  width: number;
  height: number;
  children: React.ReactNode;
}

export function EffectApplier({ effects, width, height, children }: EffectApplierProps) {
  const enabledEffects = effects.filter((e) => e.enabled !== false);
  
  if (enabledEffects.length === 0) {
    return <>{children}</>;
  }

  return (
    <Group>
      {children}
      {enabledEffects.map((effect, index) => (
        <EffectLayer
          key={effect.id ?? `effect-${index}`}
          effect={effect}
          width={width}
          height={height}
        />
      ))}
    </Group>
  );
}

interface EffectLayerProps {
  effect: EffectSpec;
  width: number;
  height: number;
}

function EffectLayer({ effect, width, height }: EffectLayerProps) {
  const clock = useClock();
  const needsTime = needsTimeUniform(effect);
  
  const blendModeMap: Record<string, string> = {
    srcOver: 'srcOver',
    screen: 'screen',
    multiply: 'multiply',
    overlay: 'overlay',
    darken: 'darken',
    lighten: 'lighten',
    colorDodge: 'colorDodge',
    colorBurn: 'colorBurn',
    hardLight: 'hardLight',
    softLight: 'softLight',
    difference: 'difference',
    exclusion: 'exclusion',
    plus: 'plus',
  };

  const blendMode = effect.blendMode ? blendModeMap[effect.blendMode] : undefined;
  
  switch (effect.type) {
    case 'blur':
      return <BlurEffectLayer effect={effect} />;
    case 'dropShadow':
      return <DropShadowEffectLayer effect={effect} width={width} height={height} />;
    case 'tint':
      return <TintEffectLayer effect={effect} width={width} height={height} />;
    case 'glow':
    case 'holographic':
    case 'vignette':
    case 'scanlines':
      return (
        <ShaderOverlayLayer
          effect={effect}
          width={width}
          height={height}
          clock={clock}
          needsTime={needsTime}
          blendMode={blendMode}
        />
      );
    default:
      return null;
  }
}

function BlurEffectLayer({ effect }: { effect: EffectSpec & { type: 'blur' } }) {
  return <Blur blur={effect.radius} />;
}

function DropShadowEffectLayer({
  effect,
  width,
  height,
}: {
  effect: EffectSpec & { type: 'dropShadow' };
  width: number;
  height: number;
}) {
  return (
    <Group
      transform={[
        { translateX: effect.offsetX },
        { translateY: effect.offsetY },
      ]}
      opacity={effect.opacity ?? 0.5}
    >
      <Rect x={0} y={0} width={width} height={height} color={effect.color}>
        <Blur blur={effect.blur} />
      </Rect>
    </Group>
  );
}

function TintEffectLayer({
  effect,
  width,
  height,
}: {
  effect: EffectSpec & { type: 'tint' };
  width: number;
  height: number;
}) {
  return (
    <Group blendMode="multiply" opacity={effect.intensity}>
      <Rect x={0} y={0} width={width} height={height}>
        <BlendColor color={effect.color} mode="srcOver" />
      </Rect>
    </Group>
  );
}

interface ShaderOverlayLayerProps {
  effect: EffectSpec;
  width: number;
  height: number;
  clock: { value: number };
  needsTime: boolean;
  blendMode?: string;
}

function ShaderOverlayLayer({
  effect,
  width,
  height,
  clock,
  needsTime,
  blendMode,
}: ShaderOverlayLayerProps) {
  const shader = useMemo(() => getCompiledShader(effect.type), [effect.type]);
  
  const uniforms = useDerivedValue(() => {
    const time = needsTime ? clock.value / 1000 : 0;
    return getEffectUniforms(effect, width, height, time);
  }, [effect, width, height, clock, needsTime]);

  if (!shader) {
    return null;
  }

  return (
    <Group blendMode={blendMode as any} opacity={effect.opacity ?? 1}>
      <Fill>
        <Shader source={shader} uniforms={uniforms} />
      </Fill>
    </Group>
  );
}

export function useEffectChain(effects?: EffectChain) {
  return useMemo(() => {
    if (!effects || effects.length === 0) {
      return { hasEffects: false, effects: [] };
    }
    
    const enabled = effects.filter((e) => e.enabled !== false);
    return {
      hasEffects: enabled.length > 0,
      effects: enabled,
    };
  }, [effects]);
}
