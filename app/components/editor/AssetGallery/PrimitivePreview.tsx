import { View, StyleSheet } from 'react-native';
import type { ColliderComponent, VisualComponent } from '@slopcade/shared';

interface PrimitivePreviewProps {
  collider?: ColliderComponent;
  visual?: VisualComponent;
  size: number;
  color?: string;
  backgroundColor?: string;
}

export function PrimitivePreview({
  collider,
  visual,
  size,
  color = '#4CAF50',
  backgroundColor = '#1F2937',
}: PrimitivePreviewProps) {
  const padding = size * 0.1;
  const availableSize = size - padding * 2;

  let aspectRatio = 1;
  let shapeType: 'rect' | 'circle' | 'polygon' = 'rect';

  if (collider) {
    if (collider.shape === 'box' || collider.shape === 'capsule') {
      shapeType = 'rect';
    } else if (collider.shape === 'circle') {
      shapeType = 'circle';
    } else if (collider.shape === 'polygon') {
      shapeType = 'polygon';
    }
    if (collider.shape === 'box' && collider.width && collider.height) {
      aspectRatio = collider.width / collider.height;
    } else if (collider.shape === 'capsule' && collider.radius && collider.height) {
      aspectRatio = (collider.radius * 2) / collider.height;
    }
  } else if (visual) {
    if (visual.type === 'rect') {
      shapeType = 'rect';
      if (visual.width && visual.height) {
        aspectRatio = visual.width / visual.height;
      }
    } else if (visual.type === 'circle') {
      shapeType = 'circle';
      aspectRatio = 1;
    } else if (visual.type === 'polygon') {
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
