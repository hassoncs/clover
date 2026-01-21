import { Path, Group, Shadow, Skia, BlendColor } from '@shopify/react-native-skia';
import type { PolygonSpriteComponent } from '@clover/shared';
import type { RuntimeEntity } from '../types';

interface PolygonRendererProps {
  entity: RuntimeEntity;
  sprite: PolygonSpriteComponent;
  pixelsPerMeter: number;
}

function createPolygonPath(vertices: { x: number; y: number }[], pixelsPerMeter: number) {
  if (vertices.length < 3) return null;

  const path = Skia.Path.Make();
  const first = vertices[0];
  path.moveTo(first.x * pixelsPerMeter, first.y * pixelsPerMeter);

  for (let i = 1; i < vertices.length; i++) {
    const v = vertices[i];
    path.lineTo(v.x * pixelsPerMeter, v.y * pixelsPerMeter);
  }

  path.close();
  return path;
}

export function PolygonRenderer({ entity, sprite, pixelsPerMeter }: PolygonRendererProps) {
  const { transform } = entity;
  const x = transform.x * pixelsPerMeter;
  const y = transform.y * pixelsPerMeter;

  const path = createPolygonPath(sprite.vertices, pixelsPerMeter);
  if (!path) return null;

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
      <Path path={path} color={sprite.color ?? '#808080'}>
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
      </Path>
      {sprite.strokeColor && sprite.strokeWidth && (
        <Path
          path={path}
          color={sprite.strokeColor}
          style="stroke"
          strokeWidth={sprite.strokeWidth}
        />
      )}
    </Group>
  );
}
