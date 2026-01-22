import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import {
  Canvas,
  Circle,
  Rect,
  Path,
  Fill,
  Skia,
} from '@shopify/react-native-skia';
import type { GalleryItem } from '@slopcade/shared';

type SpritePreviewProps = {
  item: GalleryItem;
  params: Record<string, unknown>;
  width: number;
  height: number;
};

function generatePolygonPath(cx: number, cy: number, sides: number, size: number): string {
  const points: string[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
    const x = cx + Math.cos(angle) * size;
    const y = cy + Math.sin(angle) * size;
    points.push(i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
  }
  points.push('Z');
  return points.join(' ');
}

export default function SpritePreview({ item, params, width, height }: SpritePreviewProps) {
  const spriteType = item.id.replace('sprite-', '');
  const cx = width / 2;
  const cy = height / 2;

  const color = (params.color as string) ?? '#4ecdc4';
  const strokeColor = (params.strokeColor as string) ?? '#333333';
  const strokeWidth = (params.strokeWidth as number) ?? 0;
  const opacity = (params.opacity as number) ?? 1;

  const polygonPath = useMemo(() => {
    if (spriteType !== 'polygon') return null;
    const sides = (params.sides as number) ?? 6;
    const size = (params.size as number) ?? 50;
    return Skia.Path.MakeFromSVGString(generatePolygonPath(cx, cy, sides, size));
  }, [spriteType, params.sides, params.size, cx, cy]);

  const renderSprite = () => {
    switch (spriteType) {
      case 'rect': {
        const w = (params.width as number) ?? 100;
        const h = (params.height as number) ?? 100;
        return (
          <>
            <Rect
              x={cx - w / 2}
              y={cy - h / 2}
              width={w}
              height={h}
              color={color}
              opacity={opacity}
            />
            {strokeWidth > 0 && (
              <Rect
                x={cx - w / 2}
                y={cy - h / 2}
                width={w}
                height={h}
                color={strokeColor}
                style="stroke"
                strokeWidth={strokeWidth}
                opacity={opacity}
              />
            )}
          </>
        );
      }
      case 'circle': {
        const radius = (params.radius as number) ?? 50;
        return (
          <>
            <Circle cx={cx} cy={cy} r={radius} color={color} opacity={opacity} />
            {strokeWidth > 0 && (
              <Circle
                cx={cx}
                cy={cy}
                r={radius}
                color={strokeColor}
                style="stroke"
                strokeWidth={strokeWidth}
                opacity={opacity}
              />
            )}
          </>
        );
      }
      case 'polygon': {
        if (!polygonPath) return null;
        return (
          <>
            <Path path={polygonPath} color={color} opacity={opacity} />
            {strokeWidth > 0 && (
              <Path
                path={polygonPath}
                color={strokeColor}
                style="stroke"
                strokeWidth={strokeWidth}
                opacity={opacity}
              />
            )}
          </>
        );
      }
      case 'image': {
        const imgW = (params.imageWidth as number) ?? 100;
        const imgH = (params.imageHeight as number) ?? 100;
        return (
          <>
            <Rect
              x={cx - imgW / 2}
              y={cy - imgH / 2}
              width={imgW}
              height={imgH}
              color="#666"
              opacity={opacity}
            />
            <Rect
              x={cx - imgW / 2}
              y={cy - imgH / 2}
              width={imgW}
              height={imgH}
              color="#444"
              style="stroke"
              strokeWidth={2}
              opacity={opacity}
            />
          </>
        );
      }
      default:
        return null;
    }
  };

  return (
    <Canvas style={[styles.canvas, { width, height }]}>
      <Fill color="#1a1a2e" />
      {renderSprite()}
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: {
    borderRadius: 12,
  },
});
