import { Rect, Group, Shadow } from '@shopify/react-native-skia';
import type { RectSpriteComponent } from '@clover/shared';
import type { RuntimeEntity } from '../types';

interface RectRendererProps {
  entity: RuntimeEntity;
  sprite: RectSpriteComponent;
  pixelsPerMeter: number;
}

export function RectRenderer({ entity, sprite, pixelsPerMeter }: RectRendererProps) {
  const { transform } = entity;
  const width = sprite.width * pixelsPerMeter;
  const height = sprite.height * pixelsPerMeter;
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
      <Rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        color={sprite.color ?? '#808080'}
      >
        {sprite.shadow && (
          <Shadow
            dx={sprite.shadow.offsetX}
            dy={sprite.shadow.offsetY}
            blur={sprite.shadow.blur}
            color={sprite.shadow.color}
          />
        )}
      </Rect>
      {sprite.strokeColor && sprite.strokeWidth && (
        <Rect
          x={-width / 2}
          y={-height / 2}
          width={width}
          height={height}
          color={sprite.strokeColor}
          style="stroke"
          strokeWidth={sprite.strokeWidth}
        />
      )}
    </Group>
  );
}
