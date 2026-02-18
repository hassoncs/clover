import { useMemo } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import type { ColliderComponent } from '@slopcade/shared';
import { resolveAssetUrl } from '@/lib/config/env';

interface AlignmentPreviewCanvasProps {
  size: number;
  collider?: ColliderComponent;
  imageUrl?: string;
  scale: number;
  offsetX: number;
  offsetY: number;
  showPhysicsOutline?: boolean;
}

export function AlignmentPreviewCanvas({
  size,
  collider,
  imageUrl,
  scale,
  offsetX,
  offsetY,
  showPhysicsOutline = true,
}: AlignmentPreviewCanvasProps) {
  const resolvedImageUrl = useMemo(() => resolveAssetUrl(imageUrl), [imageUrl]);
  const padding = size * 0.1;
  const availableSize = size - padding * 2;

  const colliderMetrics = useMemo(() => {
    if (!collider) return { width: availableSize, height: availableSize, type: 'rect' as const };

    let aspectRatio = 1;
    let type: 'rect' | 'circle' | 'polygon' = 'rect';

    if (collider.shape === 'box' && collider.width && collider.height) {
      aspectRatio = collider.width / collider.height;
      type = 'rect';
    } else if (collider.shape === 'circle') {
      type = 'circle';
    } else if (collider.shape === 'polygon') {
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
  }, [collider, availableSize]);

  const imageWidth = colliderMetrics.width * scale;
  const imageHeight = colliderMetrics.height * scale;

  const isCircle = colliderMetrics.type === 'circle';

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={styles.checkerboard}>
        {Array.from({ length: 100 }).map((_, i) => {
          const row = Math.floor(i / 10);
          const col = i % 10;
          const isLight = (row + col) % 2 === 0;
          return (
            <View
              key={`checker-${row}-${col}`}
              style={[
                styles.checkerCell,
                { backgroundColor: isLight ? '#2D3748' : '#1A202C' },
              ]}
            />
          );
        })}
      </View>

      {resolvedImageUrl && (
        <Image
          source={{ uri: resolvedImageUrl }}
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
              width: colliderMetrics.width,
              height: colliderMetrics.height,
              borderRadius: isCircle ? colliderMetrics.width / 2 : 0,
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
