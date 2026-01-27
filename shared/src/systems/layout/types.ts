import type { Vec2 } from "../../types/common";

export type Alignment = "start" | "center" | "end" | "space-between" | "space-evenly";

export interface RowLayoutConfig {
  count: number;
  containerWidth: number;
  itemWidth?: number;
  spacing?: number | "auto";
  align?: Alignment;
  padding?: number;
  centerY?: number;
}

export interface ColumnLayoutConfig {
  count: number;
  containerHeight: number;
  itemHeight?: number;
  spacing?: number | "auto";
  align?: Alignment;
  padding?: number;
  centerX?: number;
}

export interface GridLayoutConfig {
  rows: number;
  cols: number;
  containerWidth: number;
  containerHeight: number;
  itemWidth?: number;
  itemHeight?: number;
  rowGap?: number | "auto";
  colGap?: number | "auto";
  justifyItems?: Alignment;
  alignItems?: Alignment;
}

export interface CircularLayoutConfig {
  count: number;
  radius: number;
  startAngle?: number;
  endAngle?: number;
  centerX?: number;
  centerY?: number;
}

export interface LayoutPosition extends Vec2 {
  index: number;
}

export interface GridPosition extends Vec2 {
  row: number;
  col: number;
  index: number;
}
