export interface ViewportSize {
  width: number;
  height: number;
}

export interface ViewportEdges {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface ViewportCenter {
  x: number;
  y: number;
}

export interface WorldViewport {
  size: ViewportSize;
  center: ViewportCenter;
  edges: ViewportEdges;
}

export interface ViewportValue {
  size: ViewportSize;
  center: ViewportCenter;
  edges: ViewportEdges;
  pixelsPerMeter: number;
  world: WorldViewport;
  isReady: boolean;
  toWorld: (pixels: number) => number;
  toPixels: (meters: number) => number;
}

export interface ViewportContextValue extends ViewportValue {}

export const DEFAULT_PIXELS_PER_METER = 50;

export function createViewportValue(
  size: ViewportSize,
  pixelsPerMeter: number
): ViewportValue {
  const { width, height } = size;
  const isReady = width > 0 && height > 0;

  const worldWidth = width / pixelsPerMeter;
  const worldHeight = height / pixelsPerMeter;

  return {
    size,
    center: { x: width / 2, y: height / 2 },
    edges: { left: 0, top: 0, right: width, bottom: height },
    pixelsPerMeter,
    isReady,
    world: {
      size: { width: worldWidth, height: worldHeight },
      center: { x: worldWidth / 2, y: worldHeight / 2 },
      edges: { left: 0, top: 0, right: worldWidth, bottom: worldHeight },
    },
    toWorld: (pixels: number) => pixels / pixelsPerMeter,
    toPixels: (meters: number) => meters * pixelsPerMeter,
  };
}
