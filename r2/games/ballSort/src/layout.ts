import { distributeRow } from "@slopcade/shared";

export const BASE_WORLD_WIDTH = 12;
export const WORLD_WIDTH = 14.4;
export const WORLD_HEIGHT = 25.6;
export const WORLD_SCALE = WORLD_WIDTH / BASE_WORLD_WIDTH;

export const HALF_W = WORLD_WIDTH / 2;
export const HALF_H = WORLD_HEIGHT / 2;

export const TUBE_WIDTH = 1.4 * WORLD_SCALE;
export const TUBE_HEIGHT = 5.0 * WORLD_SCALE;
export const TUBE_WALL_THICKNESS = 0.15 * WORLD_SCALE;
export const BALL_RADIUS = 0.5 * WORLD_SCALE;
export const BALL_SPACING = 1.1 * WORLD_SCALE;
export const MAX_TUBES = 10;
export const NUM_TUBES = MAX_TUBES;
export const BALLS_PER_TUBE = 4;
export const TUBE_Y = WORLD_HEIGHT * 0.625;
export const TUBE_PADDING = 0.3 * WORLD_SCALE;

export const tubePositions = distributeRow({
  count: NUM_TUBES,
  containerWidth: WORLD_WIDTH,
  itemWidth: TUBE_WIDTH,
  align: "space-evenly",
  padding: TUBE_PADDING,
});

export function computeTubePositions(count: number): { x: number }[] {
  return distributeRow({
    count,
    containerWidth: WORLD_WIDTH,
    itemWidth: TUBE_WIDTH,
    align: "space-evenly",
    padding: TUBE_PADDING,
  });
}

export const cx = (x: number) => x - HALF_W;
export const cy = (y: number) => HALF_H - y;

export function calculateBallPosition(tubeIndex: number, slot: number, positions?: { x: number }[]): { x: number; y: number } {
  const pos = positions || tubePositions;
  const tubeX = pos[tubeIndex].x;
  const ballY = TUBE_Y + TUBE_HEIGHT / 2 - TUBE_WALL_THICKNESS - BALL_RADIUS - slot * BALL_SPACING;
  return { x: tubeX, y: cy(ballY) };
}
