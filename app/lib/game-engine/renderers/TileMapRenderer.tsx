import { useMemo } from 'react';
import { useImage, Atlas, rect as skRect, Skia } from '@shopify/react-native-skia';
import type { TileMap, TileSheet, TileLayer } from '@slopcade/shared';
import type { SkRect, SkRSXform } from '@shopify/react-native-skia';
import { resolveAssetUrl } from '@/lib/config/env';

interface TileMapRendererProps {
  tileMap: TileMap;
  tileSheet: TileSheet;
  position: { x: number; y: number };
  pixelsPerMeter: number;
  cameraX?: number;
  cameraY?: number;
}

export function TileMapRenderer({
  tileMap,
  tileSheet,
  position,
  pixelsPerMeter,
  cameraX = 0,
  cameraY = 0,
}: TileMapRendererProps) {
  const resolvedUrl = useMemo(() => resolveAssetUrl(tileSheet.imageUrl), [tileSheet.imageUrl]);
  const image = useImage(resolvedUrl);

  const sortedLayers = useMemo(() => {
    return [...tileMap.layers]
      .filter(layer => layer.visible)
      .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
  }, [tileMap.layers]);

  if (!image) return null;

  return (
    <>
      {sortedLayers.map(layer => (
        <TileLayerRenderer
          key={layer.id}
          layer={layer}
          tileMap={tileMap}
          tileSheet={tileSheet}
          image={image}
          position={position}
          pixelsPerMeter={pixelsPerMeter}
          cameraX={cameraX}
          cameraY={cameraY}
        />
      ))}
    </>
  );
}

interface TileLayerRendererProps {
  layer: TileLayer;
  tileMap: TileMap;
  tileSheet: TileSheet;
  image: any;
  position: { x: number; y: number };
  pixelsPerMeter: number;
  cameraX: number;
  cameraY: number;
}

function TileLayerRenderer({
  layer,
  tileMap,
  tileSheet,
  image,
  position,
  pixelsPerMeter,
  cameraX,
  cameraY,
}: TileLayerRendererProps) {
  const { sprites, transforms } = useMemo(() => {
    const spriteRects: SkRect[] = [];
    const tileTransforms: SkRSXform[] = [];
    
    const { tileWidth, tileHeight, columns, spacing = 0, margin = 0 } = tileSheet;
    const tileSizeMeters = tileWidth / pixelsPerMeter;
    
    const parallaxFactor = layer.parallaxFactor ?? 1;
    const offsetX = -cameraX * (1 - parallaxFactor);
    const offsetY = -cameraY * (1 - parallaxFactor);
    
    for (let i = 0; i < layer.data.length; i++) {
      const tileIndex = layer.data[i];
      
      if (tileIndex < 0) {
        spriteRects.push(skRect(0, 0, 0, 0));
        tileTransforms.push(Skia.RSXform(1, 0, -10000, -10000));
        continue;
      }
      
      const col = tileIndex % columns;
      const row = Math.floor(tileIndex / columns);
      const srcX = margin + col * (tileWidth + spacing);
      const srcY = margin + row * (tileHeight + spacing);
      spriteRects.push(skRect(srcX, srcY, tileWidth, tileHeight));
      
      const tileCol = i % tileMap.width;
      const tileRow = Math.floor(i / tileMap.width);
      
      const worldX = (position.x + tileCol * tileSizeMeters) * pixelsPerMeter + offsetX;
      const worldY = (position.y + tileRow * tileSizeMeters) * pixelsPerMeter + offsetY;
      
      tileTransforms.push(Skia.RSXform(1, 0, worldX, worldY));
    }
    
    return { sprites: spriteRects, transforms: tileTransforms };
  }, [layer, tileMap, tileSheet, position, pixelsPerMeter, cameraX, cameraY]);

  return (
    <Atlas
      image={image}
      sprites={sprites}
      transforms={transforms}
      opacity={layer.opacity}
    />
  );
}
