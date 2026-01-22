import type { Vec2 } from '../physics2d/types';

export interface ViewportRect {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

export interface ScreenSize {
  width: number;
  height: number;
}

export interface DesignViewport {
  widthMeters: number;
  heightMeters: number;
  aspectRatio: number;
}

export interface ViewportConfig {
  aspectRatio?: number | { width: number; height: number };
  fit?: 'contain' | 'cover';
  letterboxColor?: string;
}

const DEFAULT_ASPECT_RATIO = 9 / 16; // Portrait mobile default

export class ViewportSystem {
  private screenSize: ScreenSize = { width: 0, height: 0 };
  private viewportRect: ViewportRect = { x: 0, y: 0, width: 0, height: 0, scale: 1 };
  private designViewport: DesignViewport;
  private config: ViewportConfig;

  constructor(
    worldBounds: { width: number; height: number } | undefined,
    config: ViewportConfig = {}
  ) {
    this.config = config;
    
    const aspectRatio = this.resolveAspectRatio(worldBounds, config);
    
    const defaultWorldHeight = 16;
    const worldHeight = worldBounds?.height ?? defaultWorldHeight;
    const worldWidth = worldBounds?.width ?? (worldHeight * aspectRatio);
    
    this.designViewport = {
      widthMeters: worldWidth,
      heightMeters: worldHeight,
      aspectRatio,
    };
  }

  private resolveAspectRatio(
    worldBounds: { width: number; height: number } | undefined,
    config: ViewportConfig
  ): number {
    if (config.aspectRatio) {
      if (typeof config.aspectRatio === 'number') {
        return config.aspectRatio;
      }
      return config.aspectRatio.width / config.aspectRatio.height;
    }
    
    if (worldBounds) {
      return worldBounds.width / worldBounds.height;
    }
    
    return DEFAULT_ASPECT_RATIO;
  }

  updateScreenSize(screenSize: ScreenSize): void {
    if (screenSize.width === this.screenSize.width && 
        screenSize.height === this.screenSize.height) {
      return;
    }
    
    this.screenSize = { ...screenSize };
    this.computeViewportRect();
  }

  private computeViewportRect(): void {
    const { width: screenWidth, height: screenHeight } = this.screenSize;
    
    if (screenWidth === 0 || screenHeight === 0) {
      this.viewportRect = { x: 0, y: 0, width: 0, height: 0, scale: 1 };
      return;
    }
    
    const screenAspectRatio = screenWidth / screenHeight;
    const designAspectRatio = this.designViewport.aspectRatio;
    const fit = this.config.fit ?? 'contain';
    
    let viewportWidth: number;
    let viewportHeight: number;
    
    if (fit === 'contain') {
      if (screenAspectRatio > designAspectRatio) {
        viewportHeight = screenHeight;
        viewportWidth = screenHeight * designAspectRatio;
      } else {
        viewportWidth = screenWidth;
        viewportHeight = screenWidth / designAspectRatio;
      }
    } else {
      if (screenAspectRatio > designAspectRatio) {
        viewportWidth = screenWidth;
        viewportHeight = screenWidth / designAspectRatio;
      } else {
        viewportHeight = screenHeight;
        viewportWidth = screenHeight * designAspectRatio;
      }
    }
    
    const scale = viewportHeight / this.designViewport.heightMeters;
    
    this.viewportRect = {
      x: (screenWidth - viewportWidth) / 2,
      y: (screenHeight - viewportHeight) / 2,
      width: viewportWidth,
      height: viewportHeight,
      scale,
    };
  }

  getViewportRect(): ViewportRect {
    return { ...this.viewportRect };
  }

  getScreenSize(): ScreenSize {
    return { ...this.screenSize };
  }

  getDesignViewport(): DesignViewport {
    return { ...this.designViewport };
  }

  getPixelsPerMeter(): number {
    return this.viewportRect.scale;
  }

  getLetterboxColor(): string {
    return this.config.letterboxColor ?? '#000000';
  }

  isPointInViewport(screenX: number, screenY: number): boolean {
    const { x, y, width, height } = this.viewportRect;
    return (
      screenX >= x &&
      screenX <= x + width &&
      screenY >= y &&
      screenY <= y + height
    );
  }

  screenToViewport(screenX: number, screenY: number): Vec2 | null {
    if (!this.isPointInViewport(screenX, screenY)) {
      return null;
    }
    
    return {
      x: screenX - this.viewportRect.x,
      y: screenY - this.viewportRect.y,
    };
  }

  viewportToScreen(viewportX: number, viewportY: number): Vec2 {
    return {
      x: viewportX + this.viewportRect.x,
      y: viewportY + this.viewportRect.y,
    };
  }

  screenToWorld(
    screenX: number,
    screenY: number,
    cameraPosition: Vec2,
    cameraZoom: number
  ): Vec2 | null {
    const viewportPos = this.screenToViewport(screenX, screenY);
    if (!viewportPos) {
      return null;
    }
    
    return this.viewportToWorld(viewportPos.x, viewportPos.y, cameraPosition, cameraZoom);
  }

  viewportToWorld(
    viewportX: number,
    viewportY: number,
    cameraPosition: Vec2,
    cameraZoom: number
  ): Vec2 {
    const { width, height, scale } = this.viewportRect;
    const effectiveScale = scale * cameraZoom;
    
    const centeredX = viewportX - width / 2;
    const centeredY = viewportY - height / 2;
    
    return {
      x: centeredX / effectiveScale + cameraPosition.x,
      y: centeredY / effectiveScale + cameraPosition.y,
    };
  }

  worldToViewport(
    worldX: number,
    worldY: number,
    cameraPosition: Vec2,
    cameraZoom: number
  ): Vec2 {
    const { width, height, scale } = this.viewportRect;
    const effectiveScale = scale * cameraZoom;
    
    const relativeX = worldX - cameraPosition.x;
    const relativeY = worldY - cameraPosition.y;
    
    return {
      x: relativeX * effectiveScale + width / 2,
      y: relativeY * effectiveScale + height / 2,
    };
  }

  worldToScreen(
    worldX: number,
    worldY: number,
    cameraPosition: Vec2,
    cameraZoom: number
  ): Vec2 {
    const viewportPos = this.worldToViewport(worldX, worldY, cameraPosition, cameraZoom);
    return this.viewportToScreen(viewportPos.x, viewportPos.y);
  }

  getWorldToViewportTransform(cameraPosition: Vec2, cameraZoom: number): {
    translateX: number;
    translateY: number;
    scale: number;
  } {
    const { width, height, scale } = this.viewportRect;
    const effectiveScale = scale * cameraZoom;
    
    return {
      translateX: width / 2 - cameraPosition.x * effectiveScale,
      translateY: height / 2 - cameraPosition.y * effectiveScale,
      scale: effectiveScale,
    };
  }
}
