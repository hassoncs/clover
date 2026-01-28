import type { Vec2 } from './common';

export interface CharacterComponent {
  upDirection?: 'up' | 'down';
  snapToGround?: number;
  maxSlopeAngle?: number;
  minSlopeSlideAngle?: number;
  autoStep?: boolean;
  maxAutoStepHeight?: number;
  slideOnSlope?: boolean;
  collisionOffset?: number;
  isGrounded?: boolean;
  floorNormal?: Vec2;
  floorAngle?: number;
  platformVelocity?: Vec2;
  hitCeiling?: boolean;
  hitWall?: boolean;
}
