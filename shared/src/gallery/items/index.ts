export * from './effects';
export * from './particles';
export * from './behaviors';
export * from './sprites';
export * from './physics';

import { registerEffectItems } from './effects';
import { registerParticleItems } from './particles';
import { registerBehaviorItems } from './behaviors';
import { registerSpriteItems } from './sprites';
import { registerPhysicsItems } from './physics';

let initialized = false;

export function initializeGalleryItems(): void {
  if (initialized) return;
  
  registerEffectItems();
  registerParticleItems();
  registerBehaviorItems();
  registerSpriteItems();
  registerPhysicsItems();
  
  initialized = true;
}
