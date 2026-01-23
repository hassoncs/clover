import { Circle, Group, Shadow, BlendColor } from '@shopify/react-native-skia';
import type { CircleSpriteComponent } from '@slopcade/shared';
import type { RuntimeEntity } from '../types';

interface CircleRendererProps {
  entity: RuntimeEntity;
  sprite: CircleSpriteComponent;
  pixelsPerMeter: number;
}

export function CircleRenderer({ entity, sprite, pixelsPerMeter }: CircleRendererProps) {
  const { transform } = entity;
  const radius = sprite.radius * pixelsPerMeter;
  const x = transform.x * pixelsPerMeter;
  const y = transform.y * pixelsPerMeter;

  const isMarked = entity.markedForDestruction;
  const markedColor = entity.markedColor ?? '#FFFF00';
  const markedEffect = entity.markedEffect ?? 'glow';

  const effectiveColor = isMarked && markedEffect === 'fade_partial' 
    ? markedColor 
    : (sprite.color ?? '#808080');

  const effectiveOpacity = isMarked && markedEffect === 'fade_partial' 
    ? 0.5 
    : (sprite.opacity ?? 1);

  return (
    <Group
      transform={[
        { translateX: x },
        { translateY: y },
        { rotate: transform.angle },
        { scaleX: transform.scaleX },
        { scaleY: transform.scaleY },
      ]}
      origin={{ x: 0, y: 0 }}
      opacity={effectiveOpacity}
    >
      <Circle cx={0} cy={0} r={radius} color={effectiveColor}>
        {isMarked && markedEffect === 'glow' && (
          <Shadow
            dx={0}
            dy={0}
            blur={radius * 0.8}
            color={markedColor}
          />
        )}
        {sprite.shadow && !isMarked && (
          <Shadow
            dx={sprite.shadow.offsetX}
            dy={sprite.shadow.offsetY}
            blur={sprite.shadow.blur}
            color={sprite.shadow.color}
          />
        )}
        {sprite.tint && (
          <BlendColor color={sprite.tint} mode="multiply" />
        )}
      </Circle>
      {sprite.strokeColor && sprite.strokeWidth && (
        <Circle
          cx={0}
          cy={0}
          r={radius}
          color={sprite.strokeColor}
          style="stroke"
          strokeWidth={sprite.strokeWidth}
        />
      )}
    </Group>
  );
}
