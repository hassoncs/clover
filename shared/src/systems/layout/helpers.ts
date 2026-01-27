import type {
  RowLayoutConfig,
  ColumnLayoutConfig,
  GridLayoutConfig,
  CircularLayoutConfig,
  LayoutPosition,
  GridPosition,
  Alignment,
} from "./types";

function distributeAligned(
  count: number,
  containerSize: number,
  itemSize: number,
  spacing: number | "auto",
  align: Alignment,
  padding: number
): number[] {
  if (count <= 0) return [];
  if (count === 1) return [0];

  const usableSize = containerSize - 2 * padding;
  const halfContainer = containerSize / 2;

  if (spacing === "auto") {
    switch (align) {
      case "space-evenly": {
        const totalItemSize = count * itemSize;
        const totalGapSpace = usableSize - totalItemSize;
        const gap = totalGapSpace / (count + 1);
        return Array.from(
          { length: count },
          (_, i) =>
            -halfContainer + padding + gap + itemSize / 2 + i * (itemSize + gap)
        );
      }

      case "space-between": {
        if (count === 1) return [0];
        const totalItemSize = count * itemSize;
        const totalGapSpace = usableSize - totalItemSize;
        const gap = totalGapSpace / (count - 1);
        return Array.from(
          { length: count },
          (_, i) => -halfContainer + padding + itemSize / 2 + i * (itemSize + gap)
        );
      }

      case "center": {
        const defaultSpacing = itemSize * 0.2;
        const totalWidth = count * itemSize + (count - 1) * defaultSpacing;
        const startPos = -totalWidth / 2 + itemSize / 2;
        return Array.from(
          { length: count },
          (_, i) => startPos + i * (itemSize + defaultSpacing)
        );
      }

      case "start": {
        const defaultSpacing = itemSize * 0.2;
        return Array.from(
          { length: count },
          (_, i) =>
            -halfContainer + padding + itemSize / 2 + i * (itemSize + defaultSpacing)
        );
      }

      case "end": {
        const defaultSpacing = itemSize * 0.2;
        const totalWidth = count * itemSize + (count - 1) * defaultSpacing;
        return Array.from(
          { length: count },
          (_, i) =>
            halfContainer - padding - totalWidth + itemSize / 2 + i * (itemSize + defaultSpacing)
        );
      }
    }
  } else {
    const fixedSpacing = spacing;
    const totalWidth = count * itemSize + (count - 1) * fixedSpacing;

    switch (align) {
      case "center":
      case "space-evenly":
      case "space-between": {
        const startPos = -totalWidth / 2 + itemSize / 2;
        return Array.from(
          { length: count },
          (_, i) => startPos + i * (itemSize + fixedSpacing)
        );
      }

      case "start": {
        return Array.from(
          { length: count },
          (_, i) =>
            -halfContainer + padding + itemSize / 2 + i * (itemSize + fixedSpacing)
        );
      }

      case "end": {
        return Array.from(
          { length: count },
          (_, i) =>
            halfContainer - padding - totalWidth + itemSize / 2 + i * (itemSize + fixedSpacing)
        );
      }
    }
  }

  return [];
}

export function distributeRow(config: RowLayoutConfig): LayoutPosition[] {
  const {
    count,
    containerWidth,
    itemWidth = 1,
    spacing = "auto",
    align = "space-evenly",
    padding = 0,
    centerY = 0,
  } = config;

  const xPositions = distributeAligned(
    count,
    containerWidth,
    itemWidth,
    spacing,
    align,
    padding
  );

  return xPositions.map((x, index) => ({
    x,
    y: centerY,
    index,
  }));
}

export function distributeColumn(config: ColumnLayoutConfig): LayoutPosition[] {
  const {
    count,
    containerHeight,
    itemHeight = 1,
    spacing = "auto",
    align = "space-evenly",
    padding = 0,
    centerX = 0,
  } = config;

  const yPositions = distributeAligned(
    count,
    containerHeight,
    itemHeight,
    spacing,
    align,
    padding
  );

  return yPositions.map((y, index) => ({
    x: centerX,
    y: -y,
    index,
  }));
}

export function distributeGrid(config: GridLayoutConfig): GridPosition[] {
  const {
    rows,
    cols,
    containerWidth,
    containerHeight,
    itemWidth = 1,
    itemHeight = 1,
    rowGap = "auto",
    colGap = "auto",
    justifyItems = "space-evenly",
    alignItems = "space-evenly",
  } = config;

  const xPositions = distributeAligned(
    cols,
    containerWidth,
    itemWidth,
    colGap,
    justifyItems,
    0
  );

  const yPositions = distributeAligned(
    rows,
    containerHeight,
    itemHeight,
    rowGap,
    alignItems,
    0
  );

  const positions: GridPosition[] = [];
  let index = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      positions.push({
        x: xPositions[col],
        y: -yPositions[row],
        row,
        col,
        index,
      });
      index++;
    }
  }

  return positions;
}

export function distributeCircular(config: CircularLayoutConfig): LayoutPosition[] {
  const {
    count,
    radius,
    startAngle = 0,
    endAngle,
    centerX = 0,
    centerY = 0,
  } = config;

  if (count <= 0) return [];

  const fullCircle = endAngle === undefined;
  const actualEndAngle = fullCircle ? startAngle + Math.PI * 2 : endAngle;
  const angleRange = actualEndAngle - startAngle;
  const angleStep = fullCircle ? angleRange / count : angleRange / Math.max(count - 1, 1);

  return Array.from({ length: count }, (_, i) => {
    const angle = startAngle + i * angleStep;
    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
      index: i,
    };
  });
}

export function getRowX(config: RowLayoutConfig, index: number): number {
  const positions = distributeRow(config);
  return positions[index]?.x ?? 0;
}

export function getColumnY(config: ColumnLayoutConfig, index: number): number {
  const positions = distributeColumn(config);
  return positions[index]?.y ?? 0;
}

export function getGridPosition(
  config: GridLayoutConfig,
  row: number,
  col: number
): { x: number; y: number } | null {
  const positions = distributeGrid(config);
  const pos = positions.find((p) => p.row === row && p.col === col);
  return pos ? { x: pos.x, y: pos.y } : null;
}
