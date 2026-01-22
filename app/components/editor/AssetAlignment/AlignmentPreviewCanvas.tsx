import { useMemo } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import type { PhysicsComponent } from '@slopcade/shared';

interface AlignmentPreviewCanvasProps {
  size: number;
  physics?: PhysicsComponent;
  imageUrl?: string;
  scale: number;
  offsetX: number;
  offsetY: number;
  showPhysicsOutline?: boolean;
}

export function AlignmentPreviewCanvas({
  size,
  physics,
  imageUrl,
  scale,
  offsetX,
  offsetY,
  showPhysicsOutline = true,
}: AlignmentPreviewCanvasProps) {
  const padding = size * 0.1;
  const availableSize = size - padding * 2;

  const physicsMetrics = useMemo(() => {
    if (!physics) return { width: availableSize, height: availableSize, type: 'rect' as const };

    let aspectRatio = 1;
    let type: 'rect' | 'circle' | 'polygon' = 'rect';

    if (physics.shape === 'box' && physics.width && physics.height) {
      aspectRatio = physics.width / physics.height;
      type = 'rect';
    } else if (physics.shape === 'circle') {
      type = 'circle';
    } else if (physics.shape === 'polygon') {
      type = 'polygon';
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

    return { width: shapeWidth, height: shapeHeight, type };
  }, [physics, availableSize]);

  const imageWidth = physicsMetrics.width * scale;
  const imageHeight = physicsMetrics.height * scale;

  const isCircle = physicsMetrics.type === 'circle';

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={styles.checkerboard}>
        {Array.from({ length: 100 }).map((_, i) => {
          const row = Math.floor(i / 10);
          const col = i % 10;
          const isLight = (row + col) % 2 === 0;
          return (
            <View
              key={i}
              style={[
                styles.checkerCell,
                { backgroundColor: isLight ? '#2D3748' : '#1A202C' },
              ]}
            />
          );
        })}
      </View>

      {imageUrl && (
        <Image
          source={{ uri: imageUrl }}
          style={[
            styles.image,
            {
              width: imageWidth,
              height: imageHeight,
              transform: [
                { translateX: offsetX },
                { translateY: offsetY },
              ],
            },
          ]}
          resizeMode="contain"
        />
      )}

      {showPhysicsOutline && (
        <View
          style={[
            styles.outline,
            {
              width: physicsMetrics.width,
              height: physicsMetrics.height,
              borderRadius: isCircle ? physicsMetrics.width / 2 : 0,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  checkerboard: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  checkerCell: {
    width: '10%',
    height: '10%',
  },
  image: {
    position: 'absolute',
  },
  outline: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#4F46E5',
    borderStyle: 'dashed',
  },
});
