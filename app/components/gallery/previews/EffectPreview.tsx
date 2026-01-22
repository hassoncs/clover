import { useMemo } from 'react';
import {
  Canvas,
  Circle,
  Rect,
  Group,
  Fill,
  useClock,
} from '@shopify/react-native-skia';
import type { GalleryItem, EffectSpec, EffectType } from '@slopcade/shared';
import { ShaderEffect } from '@/lib/effects/ShaderEffect';

type EffectPreviewProps = {
  item: GalleryItem;
  params: Record<string, unknown>;
  width: number;
  height: number;
};

export default function EffectPreview({ item, params, width, height }: EffectPreviewProps) {
  const clock = useClock();
  
  const effectType = item.id.replace('effect-', '') as EffectType;

  const effectSpec = useMemo((): EffectSpec => {
    return { type: effectType, ...params } as EffectSpec;
  }, [effectType, params]);

  const content = (
    <Group>
      <Rect x={width * 0.1} y={height * 0.15} width={width * 0.25} height={width * 0.25} color="#ff6b6b" />
      <Circle cx={width * 0.7} cy={height * 0.3} r={width * 0.15} color="#4ecdc4" />
      <Rect x={width * 0.35} y={height * 0.55} width={width * 0.3} height={height * 0.25} color="#ffe66d" />
      <Circle cx={width * 0.25} cy={height * 0.7} r={width * 0.1} color="#a8dadc" />
    </Group>
  );

  return (
    <Canvas style={{ width, height, borderRadius: 12 }}>
      <Fill color="#1a1a2e" />
      <ShaderEffect
        effect={effectSpec}
        width={width}
        height={height}
        clock={clock}
      >
        {content}
      </ShaderEffect>
    </Canvas>
  );
}
