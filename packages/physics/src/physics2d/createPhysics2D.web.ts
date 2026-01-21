import { initPhysics } from '../physics/index.web';
import { Box2DAdapter } from './Box2DAdapter';
import type { Physics2D } from './Physics2D';

let physicsInstance: Physics2D | null = null;

export async function createPhysics2D(): Promise<Physics2D> {
  if (physicsInstance) return physicsInstance;
  
  const box2dApi = await initPhysics();
  physicsInstance = new Box2DAdapter(box2dApi);
  return physicsInstance;
}
