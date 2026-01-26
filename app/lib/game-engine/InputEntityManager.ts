import type { RuntimeEntity } from "./types";

export const SYSTEM_ENTITY_IDS = {
  MOUSE: "$mouse",
  TOUCH: "$touch",
  DRAG: "$drag",
  DRAG_START: "$dragStart",
} as const;

export type SystemEntityId =
  (typeof SYSTEM_ENTITY_IDS)[keyof typeof SYSTEM_ENTITY_IDS];

export interface InputState {
  mouse?: {
    x: number;
    y: number;
    worldX: number;
    worldY: number;
  };
  tap?: {
    worldX: number;
    worldY: number;
  };
  drag?: {
    startWorldX: number;
    startWorldY: number;
    currentWorldX: number;
    currentWorldY: number;
  };
}

export class InputEntityManager {
  private virtualEntities = new Map<string, RuntimeEntity>();
  private debugMode = false;

  constructor(options?: { debug?: boolean }) {
    this.debugMode = options?.debug ?? false;
    this.initializeVirtualEntities();
  }

  private initializeVirtualEntities(): void {
    this.createVirtualEntity(SYSTEM_ENTITY_IDS.MOUSE);
    this.createVirtualEntity(SYSTEM_ENTITY_IDS.TOUCH);
    this.createVirtualEntity(SYSTEM_ENTITY_IDS.DRAG);
    this.createVirtualEntity(SYSTEM_ENTITY_IDS.DRAG_START);
  }

  private createVirtualEntity(id: string): void {
    const entity: RuntimeEntity = {
      id,
      name: id,
      transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      behaviors: [],
      tags: ["system", "input"],
      tagBits: new Set(),
      conditionalBehaviors: [],
      activeConditionalGroupId: -1,
      layer: 999,
      visible: this.debugMode,
      active: false,
      bodyId: null,
      colliderId: null,
    };
    this.virtualEntities.set(id, entity);
  }

  syncFromInput(input: InputState): void {
    const mouse = this.virtualEntities.get(SYSTEM_ENTITY_IDS.MOUSE);
    if (mouse) {
      if (input.mouse) {
        mouse.transform.x = input.mouse.worldX;
        mouse.transform.y = input.mouse.worldY;
        mouse.active = true;
      } else {
        mouse.active = false;
      }
    }

    const touch = this.virtualEntities.get(SYSTEM_ENTITY_IDS.TOUCH);
    if (touch && input.tap) {
      touch.transform.x = input.tap.worldX;
      touch.transform.y = input.tap.worldY;
      touch.active = true;
    }

    const drag = this.virtualEntities.get(SYSTEM_ENTITY_IDS.DRAG);
    const dragStart = this.virtualEntities.get(SYSTEM_ENTITY_IDS.DRAG_START);
    if (drag && dragStart) {
      if (input.drag) {
        drag.transform.x = input.drag.currentWorldX;
        drag.transform.y = input.drag.currentWorldY;
        drag.active = true;

        dragStart.transform.x = input.drag.startWorldX;
        dragStart.transform.y = input.drag.startWorldY;
        dragStart.active = true;
      } else {
        drag.active = false;
        dragStart.active = false;
      }
    }
  }

  getEntity(id: string): RuntimeEntity | undefined {
    return this.virtualEntities.get(id);
  }

  isSystemEntityId(id: string): boolean {
    return id.startsWith("$");
  }

  getAllEntities(): RuntimeEntity[] {
    return Array.from(this.virtualEntities.values());
  }

  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    for (const entity of this.virtualEntities.values()) {
      entity.visible = enabled;
    }
  }
}
