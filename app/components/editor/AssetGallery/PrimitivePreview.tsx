import { View, StyleSheet } from 'react-native';
import type { PhysicsComponent, SpriteComponent } from '@slopcade/shared';

interface PrimitivePreviewProps {
  physics?: PhysicsComponent;
  sprite?: SpriteComponent;
  size: number;
  color?: string;
  backgroundColor?: string;
}

export function PrimitivePreview({
  physics,
  sprite,
  size,
  color = '#4CAF50',
  backgroundColor = '#1F2937',
}: PrimitivePreviewProps) {
  const padding = size * 0.1;
  const availableSize = size - padding * 2;

  let aspectRatio = 1;
  let shapeType: 'rect' | 'circle' | 'polygon' = 'rect';

  if (physics) {
    shapeType = physics.shape === 'box' ? 'rect' : physics.shape;
    if (physics.shape === 'box' && physics.width && physics.height) {
      aspectRatio = physics.width / physics.height;
    }
  } else if (sprite) {
    if (sprite.type === 'rect') {
      shapeType = 'rect';
      aspectRatio = sprite.width / sprite.height;
    } else if (sprite.type === 'circle') {
      shapeType = 'circle';
      aspectRatio = 1;
    } else if (sprite.type === 'polygon') {
      shapeType = 'polygon';
    }
  }

  let shapeWidth: number;
  let shapeHeight: number;

  if (aspectRatio >= 1) {
    shapeWidth = availableSize;
    shapeHeight = availableSize / aspectRatio;
  } else {
    shapeHeight = availableSize;
    shapeWidth = availableSize * aspectRatio;
  }

  const isCircle = shapeType === 'circle';

  return (
    <View style={[styles.container, { width: size, height: size, backgroundColor }]}>
      <View
        style={[
          styles.shape,
          {
            width: shapeWidth,
            height: shapeHeight,
            backgroundColor: color,
            borderRadius: isCircle ? shapeWidth / 2 : 4,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shape: {},
});
