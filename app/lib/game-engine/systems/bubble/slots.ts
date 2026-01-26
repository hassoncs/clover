import type {
  SlotContract,
  SlotImplementation,
} from '@slopcade/shared';
import { getGlobalSlotRegistry, floodFill, getHexNeighbors } from '@slopcade/shared';

const SYSTEM_ID = 'bubble';
const SYSTEM_VERSION = { major: 1, minor: 0, patch: 0 };

export const BUBBLE_SLOT_CONTRACTS: Record<string, SlotContract> = {
  aimingRule: {
    name: 'aimingRule',
    kind: 'policy',
    description: 'Arc preview, angle limits, aim assist',
  },
  bubbleAttachment: {
    name: 'bubbleAttachment',
    kind: 'pure',
    description: 'Where bubble sticks on collision with grid',
  },
  matchDetection: {
    name: 'matchDetection',
    kind: 'pure',
    description: 'Flood-fill color matching for connected bubbles',
  },
  popAnimation: {
    name: 'popAnimation',
    kind: 'hook',
    description: 'Visual feedback when bubbles pop',
  },
  ceilingDescent: {
    name: 'ceilingDescent',
    kind: 'policy',
    description: 'How/when ceiling moves down',
  },
};

interface AimingRuleInput {
  touchX: number;
  touchY: number;
  launcherX: number;
  launcherY: number;
  minAngle: number;
  maxAngle: number;
  worldWidth: number;
}

interface AimingRuleOutput {
  angle: number;
  trajectoryPoints: Array<{ x: number; y: number }>;
  isValidAngle: boolean;
}

export const standardAim: SlotImplementation<AimingRuleInput, AimingRuleOutput> = {
  id: 'standard_aim',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'aimingRule' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { touchX, touchY, launcherX, launcherY, minAngle, maxAngle } = input;

    const dx = touchX - launcherX;
    const dy = touchY - launcherY;
    let angle = Math.atan2(dy, dx);

    const isValidAngle = angle >= minAngle && angle <= maxAngle;
    if (!isValidAngle) {
      angle = angle < minAngle ? minAngle : maxAngle;
    }

    const trajectoryPoints: Array<{ x: number; y: number }> = [];
    const step = 0.5;
    for (let t = 0; t < 10; t += step) {
      trajectoryPoints.push({
        x: launcherX + Math.cos(angle) * t,
        y: launcherY + Math.sin(angle) * t,
      });
    }

    return { angle, trajectoryPoints, isValidAngle };
  },
};

export const arcPreviewAim: SlotImplementation<AimingRuleInput, AimingRuleOutput> = {
  id: 'arc_preview_aim',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'aimingRule' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { touchX, touchY, launcherX, launcherY, minAngle, maxAngle, worldWidth } = input;

    const dx = touchX - launcherX;
    const dy = touchY - launcherY;
    let angle = Math.atan2(dy, dx);

    const isValidAngle = angle >= minAngle && angle <= maxAngle;
    if (!isValidAngle) {
      angle = angle < minAngle ? minAngle : maxAngle;
    }

    const trajectoryPoints: Array<{ x: number; y: number }> = [];
    const speed = 1;
    let x = launcherX;
    let y = launcherY;
    let vx = Math.cos(angle) * speed;
    let vy = Math.sin(angle) * speed;
    const maxBounces = 3;
    let bounces = 0;

    for (let i = 0; i < 50 && bounces <= maxBounces; i++) {
      trajectoryPoints.push({ x, y });
      x += vx;
      y += vy;

      if (x <= 0 || x >= worldWidth) {
        vx = -vx;
        x = x <= 0 ? 0 : worldWidth;
        bounces++;
      }

      if (y <= 0) break;
    }

    return { angle, trajectoryPoints, isValidAngle };
  },
};

interface BubbleAttachmentInput {
  bubbleX: number;
  bubbleY: number;
  bubbleRadius: number;
  gridOffsetX: number;
  gridOffsetY: number;
  cellWidth: number;
  cellHeight: number;
  isOddRow: (row: number) => boolean;
}

interface BubbleAttachmentOutput {
  gridRow: number;
  gridCol: number;
  snapX: number;
  snapY: number;
}

export const snapToGrid: SlotImplementation<BubbleAttachmentInput, BubbleAttachmentOutput> = {
  id: 'snap_to_grid',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'bubbleAttachment' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { bubbleX, bubbleY, gridOffsetX, gridOffsetY, cellWidth, cellHeight, isOddRow } = input;

    const row = Math.round((bubbleY - gridOffsetY) / cellHeight);
    const rowOffset = isOddRow(row) ? cellWidth / 2 : 0;
    const col = Math.round((bubbleX - gridOffsetX - rowOffset) / cellWidth);

    const snapX = gridOffsetX + col * cellWidth + rowOffset;
    const snapY = gridOffsetY + row * cellHeight;

    return { gridRow: row, gridCol: col, snapX, snapY };
  },
};

export const physicsAttachment: SlotImplementation<BubbleAttachmentInput, BubbleAttachmentOutput> = {
  id: 'physics_attachment',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'bubbleAttachment' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { bubbleX, bubbleY, bubbleRadius, gridOffsetX, gridOffsetY, cellWidth, cellHeight, isOddRow } = input;

    const settledY = bubbleY + bubbleRadius * 0.1;

    const row = Math.round((settledY - gridOffsetY) / cellHeight);
    const rowOffset = isOddRow(row) ? cellWidth / 2 : 0;
    const col = Math.round((bubbleX - gridOffsetX - rowOffset) / cellWidth);

    const snapX = gridOffsetX + col * cellWidth + rowOffset;
    const snapY = gridOffsetY + row * cellHeight;

    return { gridRow: row, gridCol: col, snapX, snapY };
  },
};

interface GridCell {
  row: number;
  col: number;
  colorType: number;
  entityId: string | null;
}

type BubbleGrid = GridCell[][];

interface MatchDetectionInput {
  grid: BubbleGrid;
  startRow: number;
  startCol: number;
  minMatch: number;
}

interface MatchDetectionOutput {
  matchedCells: Array<{ row: number; col: number }>;
  floatingCells: Array<{ row: number; col: number }>;
}

function findFloatingBubbles(grid: BubbleGrid): Array<{ row: number; col: number }> {
  const connected = new Set<string>();
  const queue: Array<{ row: number; col: number }> = [];

  if (grid.length > 0 && grid[0]) {
    for (let col = 0; col < grid[0].length; col++) {
      const cell = grid[0][col];
      if (cell && cell.colorType >= 0) {
        queue.push({ row: 0, col });
        connected.add(`0,${col}`);
      }
    }
  }

  while (queue.length > 0) {
    const { row, col } = queue.shift()!;
    const isOddRow = row % 2 === 1;
    const neighbors = getHexNeighbors(row, col, isOddRow);

    for (const neighbor of neighbors) {
      const key = `${neighbor.row},${neighbor.col}`;
      if (connected.has(key)) continue;

      if (neighbor.row < 0 || neighbor.row >= grid.length) continue;
      if (neighbor.col < 0 || neighbor.col >= (grid[neighbor.row]?.length ?? 0)) continue;

      const cell = grid[neighbor.row]?.[neighbor.col];
      if (cell && cell.colorType >= 0) {
        connected.add(key);
        queue.push(neighbor);
      }
    }
  }

  const floating: Array<{ row: number; col: number }> = [];
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < (grid[row]?.length ?? 0); col++) {
      const cell = grid[row]?.[col];
      if (cell && cell.colorType >= 0 && !connected.has(`${row},${col}`)) {
        floating.push({ row, col });
      }
    }
  }

  return floating;
}

export const floodFillMatchDetection: SlotImplementation<MatchDetectionInput, MatchDetectionOutput> = {
  id: 'flood_fill_match',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'matchDetection' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { grid, startRow, startCol, minMatch } = input;

    const startCell = grid[startRow]?.[startCol];
    if (!startCell || startCell.colorType < 0) {
      return { matchedCells: [], floatingCells: [] };
    }

    const matchedCells = floodFill(
      grid,
      startRow,
      startCol,
      (cell, start) => cell.colorType === start.colorType,
      (row, col) => getHexNeighbors(row, col, row % 2 === 1)
    );

    if (matchedCells.length < minMatch) {
      return { matchedCells: [], floatingCells: [] };
    }

    const floatingCells = findFloatingBubbles(grid);

    return { matchedCells, floatingCells };
  },
};

export const chainReactionMatch: SlotImplementation<MatchDetectionInput, MatchDetectionOutput> = {
  id: 'chain_reaction_match',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'matchDetection' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { grid, startRow, startCol, minMatch } = input;

    const startCell = grid[startRow]?.[startCol];
    if (!startCell || startCell.colorType < 0) {
      return { matchedCells: [], floatingCells: [] };
    }

    const allMatched: Array<{ row: number; col: number }> = [];
    const processedColors = new Set<number>();
    const toProcess: Array<{ row: number; col: number; color: number }> = [
      { row: startRow, col: startCol, color: startCell.colorType },
    ];

    while (toProcess.length > 0) {
      const { row, col, color } = toProcess.shift()!;

      if (processedColors.has(color)) continue;

      const matched = floodFill(
        grid,
        row,
        col,
        (cell, start) => cell.colorType === color,
        (r, c) => getHexNeighbors(r, c, r % 2 === 1)
      );

      if (matched.length >= minMatch) {
        processedColors.add(color);
        allMatched.push(...matched);

        for (const cell of matched) {
          const isOddRow = cell.row % 2 === 1;
          const neighbors = getHexNeighbors(cell.row, cell.col, isOddRow);
          for (const neighbor of neighbors) {
            const neighborCell = grid[neighbor.row]?.[neighbor.col];
            if (neighborCell && neighborCell.colorType >= 0 && !processedColors.has(neighborCell.colorType)) {
              toProcess.push({ row: neighbor.row, col: neighbor.col, color: neighborCell.colorType });
            }
          }
        }
      }
    }

    const floatingCells = findFloatingBubbles(grid);

    return { matchedCells: allMatched, floatingCells };
  },
};

interface PopAnimationInput {
  cells: Array<{ row: number; col: number; entityId: string }>;
  isFloating: boolean;
}

interface PopAnimationOutput {
  tagsToAdd: Array<{ entityId: string; tag: string }>;
  delays: Array<{ entityId: string; delayMs: number }>;
}

export const standardPop: SlotImplementation<PopAnimationInput, PopAnimationOutput> = {
  id: 'standard_pop',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'popAnimation' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { cells, isFloating } = input;
    const tag = isFloating ? 'sys.bubble:falling' : 'sys.bubble:popping';

    return {
      tagsToAdd: cells.map((cell) => ({ entityId: cell.entityId, tag })),
      delays: cells.map((cell) => ({ entityId: cell.entityId, delayMs: 0 })),
    };
  },
};

export const cascadePop: SlotImplementation<PopAnimationInput, PopAnimationOutput> = {
  id: 'cascade_pop',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'popAnimation' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { cells, isFloating } = input;
    const tag = isFloating ? 'sys.bubble:falling' : 'sys.bubble:popping';
    const delayStep = 50;

    return {
      tagsToAdd: cells.map((cell) => ({ entityId: cell.entityId, tag })),
      delays: cells.map((cell, index) => ({ entityId: cell.entityId, delayMs: index * delayStep })),
    };
  },
};

interface CeilingDescentInput {
  shotsFired: number;
  elapsedTimeMs: number;
  currentCeilingY: number;
  descentAmount: number;
}

interface CeilingDescentOutput {
  shouldDescend: boolean;
  newCeilingY: number;
}

export const shotBasedDescent: SlotImplementation<CeilingDescentInput, CeilingDescentOutput> = {
  id: 'shot_based_descent',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'ceilingDescent' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { shotsFired, currentCeilingY, descentAmount } = input;
    const shotsPerDescent = 5;

    const shouldDescend = shotsFired > 0 && shotsFired % shotsPerDescent === 0;
    const newCeilingY = shouldDescend ? currentCeilingY + descentAmount : currentCeilingY;

    return { shouldDescend, newCeilingY };
  },
};

export const timeBasedDescent: SlotImplementation<CeilingDescentInput, CeilingDescentOutput> = {
  id: 'time_based_descent',
  version: SYSTEM_VERSION,
  owner: { systemId: SYSTEM_ID, slotName: 'ceilingDescent' },
  compatibleWith: [{ systemId: SYSTEM_ID, range: '^1.0.0' }],
  run: (_ctx, input) => {
    const { elapsedTimeMs, currentCeilingY, descentAmount } = input;
    const descentIntervalMs = 10000;

    const descentCount = Math.floor(elapsedTimeMs / descentIntervalMs);
    const expectedCeilingY = descentCount * descentAmount;
    const shouldDescend = expectedCeilingY > currentCeilingY;
    const newCeilingY = shouldDescend ? expectedCeilingY : currentCeilingY;

    return { shouldDescend, newCeilingY };
  },
};

function registerIfNotExists(
  registry: ReturnType<typeof getGlobalSlotRegistry>,
  impl: SlotImplementation<unknown, unknown>
): void {
  if (!registry.has(impl.id)) {
    registry.register(impl);
  }
}

export function registerBubbleSlotImplementations(): void {
  const registry = getGlobalSlotRegistry();

  registerIfNotExists(registry, standardAim as SlotImplementation);
  registerIfNotExists(registry, arcPreviewAim as SlotImplementation);
  registerIfNotExists(registry, snapToGrid as SlotImplementation);
  registerIfNotExists(registry, physicsAttachment as SlotImplementation);
  registerIfNotExists(registry, floodFillMatchDetection as SlotImplementation);
  registerIfNotExists(registry, chainReactionMatch as SlotImplementation);
  registerIfNotExists(registry, standardPop as SlotImplementation);
  registerIfNotExists(registry, cascadePop as SlotImplementation);
  registerIfNotExists(registry, shotBasedDescent as SlotImplementation);
  registerIfNotExists(registry, timeBasedDescent as SlotImplementation);
}
