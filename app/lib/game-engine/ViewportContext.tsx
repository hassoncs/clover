import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { ViewportSystem, type ViewportRect, type ScreenSize, type DesignViewport, type ViewportConfig } from './ViewportSystem';
import type { Vec2 } from '../physics2d/types';

interface ViewportContextValue {
  viewportSystem: ViewportSystem;
  screenSize: ScreenSize;
  viewportRect: ViewportRect;
  designViewport: DesignViewport;
  pixelsPerMeter: number;
  letterboxColor: string;
  
  updateScreenSize: (size: ScreenSize) => void;
  isPointInViewport: (screenX: number, screenY: number) => boolean;
  screenToWorld: (screenX: number, screenY: number, cameraPosition: Vec2, cameraZoom: number) => Vec2 | null;
  worldToScreen: (worldX: number, worldY: number, cameraPosition: Vec2, cameraZoom: number) => Vec2;
  getWorldToViewportTransform: (cameraPosition: Vec2, cameraZoom: number) => { translateX: number; translateY: number; scale: number };
}

const ViewportContext = createContext<ViewportContextValue | null>(null);

interface ViewportProviderProps {
  worldBounds?: { width: number; height: number };
  config?: ViewportConfig;
  children: React.ReactNode;
}

export function ViewportProvider({ worldBounds, config, children }: ViewportProviderProps) {
  const [viewportSystem] = useState(() => new ViewportSystem(worldBounds, config));
  const [screenSize, setScreenSize] = useState<ScreenSize>({ width: 0, height: 0 });
  const [viewportRect, setViewportRect] = useState<ViewportRect>({ x: 0, y: 0, width: 0, height: 0, scale: 1 });

  const updateScreenSize = useCallback((size: ScreenSize) => {
    viewportSystem.updateScreenSize(size);
    setScreenSize(viewportSystem.getScreenSize());
    setViewportRect(viewportSystem.getViewportRect());
  }, [viewportSystem]);

  const isPointInViewport = useCallback((screenX: number, screenY: number) => {
    return viewportSystem.isPointInViewport(screenX, screenY);
  }, [viewportSystem]);

  const screenToWorld = useCallback((
    screenX: number,
    screenY: number,
    cameraPosition: Vec2,
    cameraZoom: number
  ) => {
    return viewportSystem.screenToWorld(screenX, screenY, cameraPosition, cameraZoom);
  }, [viewportSystem]);

  const worldToScreen = useCallback((
    worldX: number,
    worldY: number,
    cameraPosition: Vec2,
    cameraZoom: number
  ) => {
    return viewportSystem.worldToScreen(worldX, worldY, cameraPosition, cameraZoom);
  }, [viewportSystem]);

  const getWorldToViewportTransform = useCallback((cameraPosition: Vec2, cameraZoom: number) => {
    return viewportSystem.getWorldToViewportTransform(cameraPosition, cameraZoom);
  }, [viewportSystem]);

  const value = useMemo<ViewportContextValue>(() => ({
    viewportSystem,
    screenSize,
    viewportRect,
    designViewport: viewportSystem.getDesignViewport(),
    pixelsPerMeter: viewportSystem.getPixelsPerMeter(),
    letterboxColor: viewportSystem.getLetterboxColor(),
    updateScreenSize,
    isPointInViewport,
    screenToWorld,
    worldToScreen,
    getWorldToViewportTransform,
  }), [
    viewportSystem,
    screenSize,
    viewportRect,
    updateScreenSize,
    isPointInViewport,
    screenToWorld,
    worldToScreen,
    getWorldToViewportTransform,
  ]);

  return (
    <ViewportContext.Provider value={value}>
      {children}
    </ViewportContext.Provider>
  );
}

export function useViewport(): ViewportContextValue {
  const context = useContext(ViewportContext);
  if (!context) {
    throw new Error('useViewport must be used within a ViewportProvider');
  }
  return context;
}

export function useViewportOptional(): ViewportContextValue | null {
  return useContext(ViewportContext);
}
