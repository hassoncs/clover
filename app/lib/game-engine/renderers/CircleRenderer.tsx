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
      opacity={sprite.opacity ?? 1}
    >
      <Circle cx={0} cy={0} r={radius} color={sprite.color ?? '#808080'}>
        {sprite.shadow && (
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
