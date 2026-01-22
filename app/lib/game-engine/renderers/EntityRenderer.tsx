import type { RuntimeEntity } from "../types";
import { RectRenderer } from "./RectRenderer";
import { CircleRenderer } from "./CircleRenderer";
import { PolygonRenderer } from "./PolygonRenderer";
import { ImageRenderer } from "./ImageRenderer";
import type { SpriteComponent, RectSpriteComponent, CircleSpriteComponent, PolygonSpriteComponent, AssetConfig, ImageSpriteComponent } from "@slopcade/shared";

interface EntityRendererProps {
  entity: RuntimeEntity;
  pixelsPerMeter: number;
  renderMode?: 'default' | 'primitive';
  showDebugOverlays?: boolean;
  assetOverrides?: Record<string, AssetConfig>;
}

function getPrimitiveSprite(entity: RuntimeEntity, originalSprite: SpriteComponent): SpriteComponent {
  if (entity.physics) {
    const color = originalSprite.color || '#4CAF50';
    
    switch (entity.physics.shape) {
      case 'box':
        return {
          type: 'rect',
          width: entity.physics.width,
          height: entity.physics.height,
          color,
          opacity: 1,
        } as RectSpriteComponent;
        
      case 'circle':
        return {
          type: 'circle',
          radius: entity.physics.radius,
          color,
          opacity: 1,
        } as CircleSpriteComponent;
        
      case 'polygon':
        return {
          type: 'polygon',
          vertices: entity.physics.vertices,
          color,
          opacity: 1,
        } as PolygonSpriteComponent;
    }
  }

  if (originalSprite.type === 'image') {
    return {
      type: 'rect',
      width: originalSprite.imageWidth,
      height: originalSprite.imageHeight,
      color: originalSprite.color || '#4CAF50',
      opacity: 1,
    } as RectSpriteComponent;
  }

  return originalSprite;
}

function getAssetOverrideSprite(entity: RuntimeEntity, asset: AssetConfig): ImageSpriteComponent | null {
  if (!asset.imageUrl || asset.source === 'none') {
    return null;
  }

  let width = 1;
  let height = 1;

  if (entity.physics) {
    if (entity.physics.shape === 'box') {
      width = entity.physics.width;
      height = entity.physics.height;
    } else if (entity.physics.shape === 'circle') {
      width = entity.physics.radius * 2;
      height = entity.physics.radius * 2;
    }
  } else if (entity.sprite) {
    if (entity.sprite.type === 'rect') {
      width = entity.sprite.width;
      height = entity.sprite.height;
    } else if (entity.sprite.type === 'circle') {
      width = entity.sprite.radius * 2;
      height = entity.sprite.radius * 2;
    } else if (entity.sprite.type === 'image') {
      width = entity.sprite.imageWidth;
      height = entity.sprite.imageHeight;
    }
  }

  if (asset.scale) {
    width *= asset.scale;
    height *= asset.scale;
  }

  return {
    type: 'image',
    imageUrl: asset.imageUrl,
    imageWidth: width,
    imageHeight: height,
    opacity: 1,
    offsetX: asset.offsetX,
    offsetY: asset.offsetY,
  } as ImageSpriteComponent & { offsetX?: number; offsetY?: number };
}

function DebugOverlay({ entity, pixelsPerMeter }: { entity: RuntimeEntity; pixelsPerMeter: number }) {
  if (!entity.physics) return null;

  const wireframeColor = '#FF0000';
  const wireframeWidth = 2;

  let debugSprite: SpriteComponent | null = null;

  switch (entity.physics.shape) {
    case 'box':
      debugSprite = {
        type: 'rect',
        width: entity.physics.width,
        height: entity.physics.height,
        color: 'transparent',
        strokeColor: wireframeColor,
        strokeWidth: wireframeWidth,
      } as RectSpriteComponent;
      break;
    case 'circle':
      debugSprite = {
        type: 'circle',
        radius: entity.physics.radius,
        color: 'transparent',
        strokeColor: wireframeColor,
        strokeWidth: wireframeWidth,
      } as CircleSpriteComponent;
      break;
    case 'polygon':
      debugSprite = {
        type: 'polygon',
        vertices: entity.physics.vertices,
        color: 'transparent',
        strokeColor: wireframeColor,
        strokeWidth: wireframeWidth,
      } as PolygonSpriteComponent;
      break;
  }

  if (!debugSprite) return null;

  if (debugSprite.type === 'rect') {
    return <RectRenderer entity={entity} sprite={debugSprite} pixelsPerMeter={pixelsPerMeter} />;
  }
  if (debugSprite.type === 'circle') {
    return <CircleRenderer entity={entity} sprite={debugSprite} pixelsPerMeter={pixelsPerMeter} />;
  }
  if (debugSprite.type === 'polygon') {
    return <PolygonRenderer entity={entity} sprite={debugSprite} pixelsPerMeter={pixelsPerMeter} />;
  }
  return null;
}

export function EntityRenderer({
  entity,
  pixelsPerMeter,
  renderMode = 'default',
  showDebugOverlays = false,
  assetOverrides,
}: EntityRendererProps) {
  if (!entity.visible || !entity.sprite) {
    if (!showDebugOverlays) return null;
  }

  let spriteToRender = entity.sprite;

  if (renderMode !== 'primitive' && entity.template && assetOverrides && assetOverrides[entity.template]) {
    const overrideSprite = getAssetOverrideSprite(entity, assetOverrides[entity.template]);
    if (overrideSprite) {
      spriteToRender = overrideSprite;
    }
  }

  if (renderMode === 'primitive' && spriteToRender && spriteToRender.type === 'image') {
    spriteToRender = getPrimitiveSprite(entity, entity.sprite!);
  }

  const renderContent = () => {
    if (!spriteToRender || (!entity.visible && !showDebugOverlays)) return null;

    switch (spriteToRender.type) {
      case "rect":
        return (
          <RectRenderer
            entity={entity}
            sprite={spriteToRender}
            pixelsPerMeter={pixelsPerMeter}
          />
        );
      case "circle":
        return (
          <CircleRenderer
            entity={entity}
            sprite={spriteToRender}
            pixelsPerMeter={pixelsPerMeter}
          />
        );
      case "polygon":
        return (
          <PolygonRenderer
            entity={entity}
            sprite={spriteToRender}
            pixelsPerMeter={pixelsPerMeter}
          />
        );
      case "image":
        return (
          <ImageRenderer
            entity={entity}
            sprite={spriteToRender}
            pixelsPerMeter={pixelsPerMeter}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      {renderContent()}
      {showDebugOverlays && (
        <DebugOverlay entity={entity} pixelsPerMeter={pixelsPerMeter} />
      )}
    </>
  );
}
