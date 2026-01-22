import type { Physics2D, BodyId } from '@/lib/physics2d';
import type { TileMap, TileSheet, TileLayer } from '@slopcade/shared';
import { vec2 } from '@/lib/physics2d';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function createCollisionBodiesFromTileMap(
  physics: Physics2D,
  tileMap: TileMap,
  tileSheet: TileSheet,
  position: { x: number; y: number },
  pixelsPerMeter: number
): BodyId[] {
  const bodyIds: BodyId[] = [];
  const collisionLayer = tileMap.layers.find(l => l.type === 'collision');
  
  if (!collisionLayer) return bodyIds;
  
  const tileSizeMeters = tileSheet.tileWidth / pixelsPerMeter;
  
  const rects = mergeAdjacentTiles(collisionLayer, tileMap.width, tileMap.height);
  
  for (const rect of rects) {
    const bodyId = physics.createBody({
      type: 'static',
      position: vec2(
        position.x + (rect.x + rect.width / 2) * tileSizeMeters,
        position.y + (rect.y + rect.height / 2) * tileSizeMeters
      ),
    });
    
    physics.addFixture(bodyId, {
      shape: {
        type: 'box',
        halfWidth: (rect.width * tileSizeMeters) / 2,
        halfHeight: (rect.height * tileSizeMeters) / 2,
      },
      friction: 0.5,
      restitution: 0,
    });
    
    bodyIds.push(bodyId);
  }
  
  return bodyIds;
}

function mergeAdjacentTiles(layer: TileLayer, width: number, height: number): Rect[] {
  const rects: Rect[] = [];
  const visited = new Set<number>();
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      
      if (visited.has(index) || layer.data[index] < 0) {
        continue;
      }
      
      let rectWidth = 1;
      while (
        x + rectWidth < width &&
        !visited.has(y * width + x + rectWidth) &&
        layer.data[y * width + x + rectWidth] >= 0
      ) {
        rectWidth++;
      }
      
      let rectHeight = 1;
      let canExtendDown = true;
      
      while (y + rectHeight < height && canExtendDown) {
        for (let dx = 0; dx < rectWidth; dx++) {
          const checkIndex = (y + rectHeight) * width + x + dx;
          if (visited.has(checkIndex) || layer.data[checkIndex] < 0) {
            canExtendDown = false;
            break;
          }
        }
        
        if (canExtendDown) {
          rectHeight++;
        }
      }
      
      for (let dy = 0; dy < rectHeight; dy++) {
        for (let dx = 0; dx < rectWidth; dx++) {
          visited.add((y + dy) * width + x + dx);
        }
      }
      
      rects.push({ x, y, width: rectWidth, height: rectHeight });
    }
  }
  
  return rects;
}

export function destroyTileMapBodies(physics: Physics2D, bodyIds: BodyId[]): void {
  for (const bodyId of bodyIds) {
    physics.destroyBody(bodyId);
  }
}
