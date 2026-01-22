import { Image, Group, useImage, BlendColor } from '@shopify/react-native-skia';
import type { ImageSpriteComponent } from '@slopcade/shared';
import type { RuntimeEntity } from '../types';

interface ExtendedImageSprite extends ImageSpriteComponent {
  offsetX?: number;
  offsetY?: number;
}

interface ImageRendererProps {
  entity: RuntimeEntity;
  sprite: ExtendedImageSprite;
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
  
  const offsetX = (sprite.offsetX ?? 0) * pixelsPerMeter;
  const offsetY = (sprite.offsetY ?? 0) * pixelsPerMeter;

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
        x={-width / 2 + offsetX}
        y={-height / 2 + offsetY}
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
