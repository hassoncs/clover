import { useMemo, useEffect } from 'react';
import { Group, Image, useImage } from '@shopify/react-native-skia';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import type { SkImage, DataSourceParam } from '@shopify/react-native-skia';

/**
 * Parallax layer configuration
 */
export interface ParallaxLayer {
  /** URL or local path to the layer image */
  imageUrl: string | number | null | undefined;
  /** Depth identifier for this layer */
  depth: 'sky' | 'far' | 'mid' | 'near';
  /** How much this layer moves relative to camera (0 = static, 1 = moves with camera) */
  parallaxFactor: number;
  /** Render order (0 = back/furthest, higher = front/closest) */
  zIndex: number;
  /** Whether the layer is currently visible */
  visible?: boolean;
}

/**
 * Complete parallax background configuration
 */
export interface ParallaxBackgroundConfig {
  layers: ParallaxLayer[];
}

/**
 * Props for ParallaxBackground renderer
 */
export interface ParallaxBackgroundProps {
  /** Parallax background configuration with layer definitions */
  config: ParallaxBackgroundConfig;
  /** Current camera X position in world coordinates (meters) */
  cameraX: number;
  /** Current camera Y position in world coordinates (meters) */
  cameraY: number;
  /** Current camera zoom level */
  cameraZoom: number;
  /** Viewport width in pixels */
  viewportWidth: number;
  /** Viewport height in pixels */
  viewportHeight: number;
  /** World units to pixel conversion factor */
  pixelsPerMeter: number;
}

/**
 * Internal hook to load and cache parallax images
 */

export function ParallaxBackground({
  config,
  cameraX,
  cameraY,
  cameraZoom,
  viewportWidth,
  viewportHeight,
  pixelsPerMeter,
}: ParallaxBackgroundProps) {
  // Sort layers by zIndex (back to front)
  const sortedLayers = useMemo(
    () => [...config.layers].sort((a, b) => a.zIndex - b.zIndex),
    [config.layers]
  );

  // Calculate screen center for positioning
  const screenCenterX = viewportWidth / 2;
  const screenCenterY = viewportHeight / 2;

  return (
    <>
      {sortedLayers.map((layer, index) => (
        <ParallaxLayerRenderer
          key={`parallax-${layer.depth}-${index}`}
          layer={layer}
          cameraX={cameraX}
          cameraY={cameraY}
          cameraZoom={cameraZoom}
          screenCenterX={screenCenterX}
          screenCenterY={screenCenterY}
          viewportWidth={viewportWidth}
          viewportHeight={viewportHeight}
          pixelsPerMeter={pixelsPerMeter}
        />
      ))}
    </>
  );
}

interface ParallaxLayerRendererProps {
  layer: ParallaxLayer;
  cameraX: number;
  cameraY: number;
  cameraZoom: number;
  screenCenterX: number;
  screenCenterY: number;
  viewportWidth: number;
  viewportHeight: number;
  pixelsPerMeter: number;
}

function ParallaxLayerRenderer({
  layer,
  cameraX,
  cameraY,
  cameraZoom,
  screenCenterX,
  screenCenterY,
  viewportWidth,
  viewportHeight,
  pixelsPerMeter,
}: ParallaxLayerRendererProps) {
  const image = useImage(layer.imageUrl);
  const opacity = useSharedValue(layer.visible ? 1 : 0);

  useEffect(() => {
    opacity.value = withTiming(layer.visible ? 1 : 0, { duration: 500 });
  }, [layer.visible, opacity]);

  const parallaxOffsetX = -cameraX * pixelsPerMeter * layer.parallaxFactor * cameraZoom;
  const parallaxOffsetY = -cameraY * pixelsPerMeter * layer.parallaxFactor * cameraZoom;

  const translateX = screenCenterX + parallaxOffsetX;
  const translateY = screenCenterY + parallaxOffsetY;

  if (!image) {
    return null;
  }

  return (
    <Group
      opacity={opacity}
      transform={[
        { translateX },
        { translateY },
        { scale: cameraZoom },
      ]}
    >
      <Image
        image={image}
        x={-viewportWidth / 2}
        y={-viewportHeight / 2}
        width={viewportWidth}
        height={viewportHeight}
        fit="cover"
      />
    </Group>
  );
}

/**
 * Default parallax factors for common depth types
 */
export const DEFAULT_PARALLAX_FACTORS: Record<ParallaxLayer['depth'], number> = {
  sky: 0.1,   // Moves very slowly (almost static)
  far: 0.3,   // Slow movement (distant mountains)
  mid: 0.5,   // Medium movement (trees, buildings)
  near: 0.8,  // Fast movement (close to camera, but not 1:1)
};

/**
 * Helper to create a parallax config from layer URLs
 */
export function createParallaxConfig(
  layers: Array<{ url: string; depth: ParallaxLayer['depth'] }>
): ParallaxBackgroundConfig {
  return {
    layers: layers.map((layer, index) => ({
      imageUrl: layer.url,
      depth: layer.depth,
      parallaxFactor: DEFAULT_PARALLAX_FACTORS[layer.depth],
      zIndex: index,
    })),
  };
}
