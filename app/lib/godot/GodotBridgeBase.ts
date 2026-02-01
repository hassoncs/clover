import type { PropertySyncPayload } from "@slopcade/shared";
import type {
  CollisionEvent,
  SensorEvent,
  EntitySpawnedEvent,
  EntityTransform,
} from "./types";

export abstract class GodotBridgeBase {
  protected collisionCallbacks: ((event: CollisionEvent) => void)[] = [];
  protected destroyCallbacks: ((entityId: string) => void)[] = [];
  protected entitySpawnedCallbacks: ((event: EntitySpawnedEvent) => void)[] = [];
  protected sensorBeginCallbacks: ((event: SensorEvent) => void)[] = [];
  protected sensorEndCallbacks: ((event: SensorEvent) => void)[] = [];
  protected inputEventCallbacks: ((
    type: string,
    x: number,
    y: number,
    entityId: string | null,
  ) => void)[] = [];
  protected uiButtonCallbacks: ((
    eventType: "button_down" | "button_up" | "button_pressed",
    buttonId: string,
  ) => void)[] = [];
  protected transformSyncCallbacks: ((
    transforms: Record<string, EntityTransform>,
  ) => void)[] = [];
  protected propertySyncCallbacks: ((properties: PropertySyncPayload) => void)[] = [];
  protected scoreCallbacks: ((points: number, entityId: string) => void)[] = [];

  onCollision(callback: (event: CollisionEvent) => void): () => void {
    this.collisionCallbacks.push(callback);
    return () => {
      const index = this.collisionCallbacks.indexOf(callback);
      if (index >= 0) this.collisionCallbacks.splice(index, 1);
    };
  }

  onEntityDestroyed(callback: (entityId: string) => void): () => void {
    this.destroyCallbacks.push(callback);
    return () => {
      const index = this.destroyCallbacks.indexOf(callback);
      if (index >= 0) this.destroyCallbacks.splice(index, 1);
    };
  }

  onEntitySpawned(callback: (event: EntitySpawnedEvent) => void): () => void {
    this.entitySpawnedCallbacks.push(callback);
    return () => {
      const index = this.entitySpawnedCallbacks.indexOf(callback);
      if (index >= 0) this.entitySpawnedCallbacks.splice(index, 1);
    };
  }

  onSensorBegin(callback: (event: SensorEvent) => void): () => void {
    this.sensorBeginCallbacks.push(callback);
    return () => {
      const index = this.sensorBeginCallbacks.indexOf(callback);
      if (index >= 0) this.sensorBeginCallbacks.splice(index, 1);
    };
  }

  onSensorEnd(callback: (event: SensorEvent) => void): () => void {
    this.sensorEndCallbacks.push(callback);
    return () => {
      const index = this.sensorEndCallbacks.indexOf(callback);
      if (index >= 0) this.sensorEndCallbacks.splice(index, 1);
    };
  }

  onTransformSync(
    callback: (transforms: Record<string, EntityTransform>) => void,
  ): () => void {
    this.transformSyncCallbacks.push(callback);
    return () => {
      const index = this.transformSyncCallbacks.indexOf(callback);
      if (index >= 0) this.transformSyncCallbacks.splice(index, 1);
    };
  }

  onPropertySync(
    callback: (properties: PropertySyncPayload) => void,
  ): () => void {
    this.propertySyncCallbacks.push(callback);
    return () => {
      const index = this.propertySyncCallbacks.indexOf(callback);
      if (index >= 0) this.propertySyncCallbacks.splice(index, 1);
    };
  }

  onScore(callback: (points: number, entityId: string) => void): () => void {
    this.scoreCallbacks.push(callback);
    return () => {
      const index = this.scoreCallbacks.indexOf(callback);
      if (index >= 0) this.scoreCallbacks.splice(index, 1);
    };
  }

  onInputEvent(
    callback: (
      type: string,
      x: number,
      y: number,
      entityId: string | null,
    ) => void,
  ): () => void {
    this.inputEventCallbacks.push(callback);
    return () => {
      const index = this.inputEventCallbacks.indexOf(callback);
      if (index >= 0) this.inputEventCallbacks.splice(index, 1);
    };
  }

  protected generateEntityId(templateId: string): string {
    return `${templateId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }
}
