import type { RuntimeEntity } from '../types';
import { RectRenderer } from './RectRenderer';
import { CircleRenderer } from './CircleRenderer';
import { PolygonRenderer } from './PolygonRenderer';
import { ImageRenderer } from './ImageRenderer';

interface EntityRendererProps {
  entity: RuntimeEntity;
  pixelsPerMeter: number;
}

export function EntityRenderer({ entity, pixelsPerMeter }: EntityRendererProps) {
  console.log('[EntityRenderer] Rendering entity:', entity.id, 'visible:', entity.visible, 'sprite:', entity.sprite?.type);
  
  if (!entity.visible || !entity.sprite) {
    console.log('[EntityRenderer] Skipping entity (not visible or no sprite):', entity.id);
    return null;
  }

  const { sprite } = entity;

  switch (sprite.type) {
    case 'rect':
      return <RectRenderer entity={entity} sprite={sprite} pixelsPerMeter={pixelsPerMeter} />;
    case 'circle':
      return <CircleRenderer entity={entity} sprite={sprite} pixelsPerMeter={pixelsPerMeter} />;
    case 'polygon':
      return <PolygonRenderer entity={entity} sprite={sprite} pixelsPerMeter={pixelsPerMeter} />;
    case 'image':
      return <ImageRenderer entity={entity} sprite={sprite} pixelsPerMeter={pixelsPerMeter} />;
    default:
      return null;
  }
}
