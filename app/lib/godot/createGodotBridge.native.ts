import type { GodotBridge } from './types';
import { createNativeGodotBridge } from './GodotBridge.native';

export async function createGodotBridge(): Promise<GodotBridge> {
  return createNativeGodotBridge();
}
