import { Image, Group, useImage, BlendColor } from '@shopify/react-native-skia';
import type { ImageSpriteComponent } from '@slopcade/shared';
import type { RuntimeEntity } from '../types';

interface ImageRendererProps {
  entity: RuntimeEntity;
  sprite: ImageSpriteComponent;
  pixelsPerMeter: number;
}

export function ImageRenderer({ entity, sprite, pixelsPerMeter }: ImageRendererProps) {
  const { transform } = entity;
  const image = useImage(sprite.imageUrl);

  if (!image) return null;

  const width = sprite.imageWidth * pixelsPerMeter;
  const height = sprite.imageHeight * pixelsPerMeter;
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
      <Image
        image={image}
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        fit="contain"
      >
        {sprite.tint && (
          <BlendColor color={sprite.tint} mode="multiply" />
        )}
      </Image>
    </Group>
  );
}
