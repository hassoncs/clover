import { describe, it, expect } from "vitest";
import {
  distributeRow,
  distributeColumn,
  distributeGrid,
  distributeCircular,
  getRowX,
  getColumnY,
  getGridPosition,
} from "../helpers";

describe("Layout Helpers", () => {
  describe("distributeRow", () => {
    it("should return empty array for count 0", () => {
      const result = distributeRow({ count: 0, containerWidth: 10 });
      expect(result).toEqual([]);
    });

    it("should center a single item", () => {
      const result = distributeRow({ count: 1, containerWidth: 10 });
      expect(result).toHaveLength(1);
      expect(result[0].x).toBe(0);
      expect(result[0].index).toBe(0);
    });

    it("should distribute items with space-evenly (default)", () => {
      const result = distributeRow({
        count: 3,
        containerWidth: 12,
        itemWidth: 2,
      });

      expect(result).toHaveLength(3);
      expect(result.map((p) => p.index)).toEqual([0, 1, 2]);

      const totalItemWidth = 3 * 2;
      const totalGap = 12 - totalItemWidth;
      const gap = totalGap / 4;
      expect(result[0].x).toBeCloseTo(-6 + gap + 1);
      expect(result[1].x).toBeCloseTo(-6 + gap + 2 + gap + 1);
      expect(result[2].x).toBeCloseTo(-6 + gap + 2 + gap + 2 + gap + 1);
    });

    it("should distribute items with space-between", () => {
      const result = distributeRow({
        count: 3,
        containerWidth: 10,
        itemWidth: 2,
        align: "space-between",
      });

      expect(result).toHaveLength(3);
      expect(result[0].x).toBe(-4);
      expect(result[2].x).toBe(4);
    });

    it("should distribute items with fixed spacing", () => {
      const result = distributeRow({
        count: 3,
        containerWidth: 10,
        itemWidth: 1,
        spacing: 2,
        align: "center",
      });

      expect(result).toHaveLength(3);
      const totalWidth = 3 * 1 + 2 * 2;
      expect(result[0].x).toBeCloseTo(-totalWidth / 2 + 0.5);
    });

    it("should respect centerY parameter", () => {
      const result = distributeRow({
        count: 2,
        containerWidth: 10,
        centerY: 5,
      });

      expect(result[0].y).toBe(5);
      expect(result[1].y).toBe(5);
    });

    it("should respect padding", () => {
      const result = distributeRow({
        count: 2,
        containerWidth: 10,
        itemWidth: 1,
        padding: 1,
        align: "space-between",
      });

      expect(result[0].x).toBeGreaterThan(-5);
      expect(result[1].x).toBeLessThan(5);
    });
  });

  describe("distributeColumn", () => {
    it("should distribute items vertically", () => {
      const result = distributeColumn({
        count: 3,
        containerHeight: 10,
        itemHeight: 2,
      });

      expect(result).toHaveLength(3);
      expect(result[0].index).toBe(0);
      expect(result[1].index).toBe(1);
      expect(result[2].index).toBe(2);
    });

    it("should respect centerX parameter", () => {
      const result = distributeColumn({
        count: 2,
        containerHeight: 10,
        centerX: 3,
      });

      expect(result[0].x).toBe(3);
      expect(result[1].x).toBe(3);
    });
  });

  describe("distributeGrid", () => {
    it("should create a 2x3 grid", () => {
      const result = distributeGrid({
        rows: 2,
        cols: 3,
        containerWidth: 6,
        containerHeight: 4,
        itemWidth: 1,
        itemHeight: 1,
      });

      expect(result).toHaveLength(6);
      expect(result.map((p) => p.index)).toEqual([0, 1, 2, 3, 4, 5]);
      expect(result.map((p) => ({ row: p.row, col: p.col }))).toEqual([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
        { row: 1, col: 0 },
        { row: 1, col: 1 },
        { row: 1, col: 2 },
      ]);
    });

    it("should position items correctly in grid", () => {
      const result = distributeGrid({
        rows: 2,
        cols: 2,
        containerWidth: 4,
        containerHeight: 4,
        itemWidth: 1,
        itemHeight: 1,
      });

      const topLeft = result.find((p) => p.row === 0 && p.col === 0)!;
      const bottomRight = result.find((p) => p.row === 1 && p.col === 1)!;

      expect(topLeft.x).toBeLessThan(bottomRight.x);
      expect(topLeft.y).toBeGreaterThan(bottomRight.y);
    });
  });

  describe("distributeCircular", () => {
    it("should distribute items in a circle", () => {
      const result = distributeCircular({
        count: 4,
        radius: 2,
      });

      expect(result).toHaveLength(4);

      expect(result[0].x).toBeCloseTo(2);
      expect(result[0].y).toBeCloseTo(0);

      expect(result[1].x).toBeCloseTo(0);
      expect(result[1].y).toBeCloseTo(2);

      expect(result[2].x).toBeCloseTo(-2);
      expect(result[2].y).toBeCloseTo(0);

      expect(result[3].x).toBeCloseTo(0);
      expect(result[3].y).toBeCloseTo(-2);
    });

    it("should respect startAngle", () => {
      const result = distributeCircular({
        count: 4,
        radius: 1,
        startAngle: Math.PI / 2,
      });

      expect(result[0].x).toBeCloseTo(0);
      expect(result[0].y).toBeCloseTo(1);
    });

    it("should respect center offset", () => {
      const result = distributeCircular({
        count: 1,
        radius: 1,
        centerX: 5,
        centerY: 3,
      });

      expect(result[0].x).toBeCloseTo(6);
      expect(result[0].y).toBeCloseTo(3);
    });

    it("should distribute items in an arc when endAngle is specified", () => {
      const result = distributeCircular({
        count: 3,
        radius: 1,
        startAngle: 0,
        endAngle: Math.PI,
      });

      expect(result).toHaveLength(3);
      expect(result[0].x).toBeCloseTo(1);
      expect(result[0].y).toBeCloseTo(0);
      expect(result[2].x).toBeCloseTo(-1);
      expect(result[2].y).toBeCloseTo(0);
    });
  });

  describe("getRowX", () => {
    it("should return x position for a specific index", () => {
      const config = { count: 3, containerWidth: 12, itemWidth: 2 };
      const positions = distributeRow(config);

      expect(getRowX(config, 0)).toBe(positions[0].x);
      expect(getRowX(config, 1)).toBe(positions[1].x);
      expect(getRowX(config, 2)).toBe(positions[2].x);
    });

    it("should return 0 for invalid index", () => {
      expect(getRowX({ count: 2, containerWidth: 10 }, 5)).toBe(0);
    });
  });

  describe("getColumnY", () => {
    it("should return y position for a specific index", () => {
      const config = { count: 3, containerHeight: 12, itemHeight: 2 };
      const positions = distributeColumn(config);

      expect(getColumnY(config, 0)).toBe(positions[0].y);
      expect(getColumnY(config, 1)).toBe(positions[1].y);
    });
  });

  describe("getGridPosition", () => {
    it("should return position for a specific row/col", () => {
      const config = {
        rows: 2,
        cols: 3,
        containerWidth: 6,
        containerHeight: 4,
      };
      const positions = distributeGrid(config);

      const pos = getGridPosition(config, 1, 2);
      const expected = positions.find((p) => p.row === 1 && p.col === 2)!;

      expect(pos?.x).toBe(expected.x);
      expect(pos?.y).toBe(expected.y);
    });

    it("should return null for invalid row/col", () => {
      const config = {
        rows: 2,
        cols: 2,
        containerWidth: 4,
        containerHeight: 4,
      };

      expect(getGridPosition(config, 5, 5)).toBeNull();
    });
  });
});
