import type { GameEntity } from '../types/entity';

export interface CoordinateHelpers {
  cx: (x: number) => number;
  cy: (y: number) => number;
}

export function createCoordinateHelpers(
  worldWidth: number,
  worldHeight: number
): CoordinateHelpers {
  const halfW = worldWidth / 2;
  const halfH = worldHeight / 2;
  return {
    cx: (x: number) => x - halfW,
    cy: (y: number) => halfH - y,
  };
}

export interface GridGeneratorOptions {
  rows: number;
  cols: number;
  startX: number;
  startY: number;
  cellSize: number;
  gap?: number;
  template: string;
  tags?: string[];
  idPrefix?: string;
  namePrefix?: string;
  coordinateHelpers: CoordinateHelpers;
}

export function generateGridEntities(options: GridGeneratorOptions): GameEntity[] {
  const {
    rows,
    cols,
    startX,
    startY,
    cellSize,
    gap = 0,
    template,
    tags = [],
    idPrefix = 'grid',
    namePrefix = 'Grid',
    coordinateHelpers,
  } = options;

  const entities: GameEntity[] = [];
  const cellSpacing = cellSize + gap;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = startX + col * cellSpacing;
      const y = startY + row * cellSpacing;

      entities.push({
        id: `${idPrefix}-${row}-${col}`,
        name: `${namePrefix} ${row},${col}`,
        template,
        tags,
        transform: {
          x: coordinateHelpers.cx(x),
          y: coordinateHelpers.cy(y),
          angle: 0,
          scaleX: 1,
          scaleY: 1,
        },
      });
    }
  }

  return entities;
}
