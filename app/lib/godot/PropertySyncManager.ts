import type { PropertySyncPayload, PropertyCache } from "@slopcade/shared";
import type { GodotBridge } from "./types";

export class PropertySyncManager {
  private propertyCache: PropertyCache;
  private unsubscribe: (() => void) | null = null;

  constructor(propertyCache: PropertyCache) {
    this.propertyCache = propertyCache;
  }

  start(bridge: GodotBridge): void {
    if (this.unsubscribe) {
      console.warn('[PropertySyncManager] Already started, stopping previous subscription');
      this.stop();
    }

    this.unsubscribe = bridge.onPropertySync((payload: PropertySyncPayload) => {
      this.propertyCache.update(payload);
    });
  }

  stop(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  getCache(): PropertyCache {
    return this.propertyCache;
  }
}
