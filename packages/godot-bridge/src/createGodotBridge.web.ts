import type { GodotBridge } from './types';
import { createWebGodotBridge } from './GodotBridge.web';

export async function createGodotBridge(): Promise<GodotBridge> {
  return createWebGodotBridge();
}
