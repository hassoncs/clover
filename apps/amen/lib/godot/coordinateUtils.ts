import type { Vec2 } from './types';

export function gameToGodot(pos: Vec2, pixelsPerMeter: number): Vec2 {
  return {
    x: pos.x * pixelsPerMeter,
    y: -pos.y * pixelsPerMeter
  };
}

export function godotToGame(pos: Vec2, pixelsPerMeter: number): Vec2 {
  return {
    x: pos.x / pixelsPerMeter,
    y: -pos.y / pixelsPerMeter
  };
}

export function gameToGodotVec(vec: Vec2, pixelsPerMeter: number): Vec2 {
  return {
    x: vec.x * pixelsPerMeter,
    y: -vec.y * pixelsPerMeter
  };
}

export function godotToGameVec(vec: Vec2, pixelsPerMeter: number): Vec2 {
  return {
    x: vec.x / pixelsPerMeter,
    y: -vec.y / pixelsPerMeter
  };
}
