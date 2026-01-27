import type { TriggerEvaluator } from "./TriggerEvaluator";
import type {
  TapTrigger,
  DragTrigger,
  TiltTrigger,
  ButtonTrigger,
  SwipeTrigger,
} from "@slopcade/shared";
import type { RuleContext } from "../types";
import type { RuntimeEntity } from "../../types";

export class InputTriggerEvaluator
  implements
    TriggerEvaluator<
      TapTrigger | DragTrigger | TiltTrigger | ButtonTrigger | SwipeTrigger
    >
{
  evaluate(
    trigger:
      | TapTrigger
      | DragTrigger
      | TiltTrigger
      | ButtonTrigger
      | SwipeTrigger,
    context: RuleContext,
  ): boolean {
    switch (trigger.type) {
      case "tap": {
        if (!context.inputEvents.tap) return false;
        if (trigger.target === "self") {
          return false; // Requires entity context handling in RulesEvaluator integration
        }
        if (trigger.target && trigger.target !== "screen") {
          const targetEntityId = context.inputEvents.tap.targetEntityId;
          
          if (targetEntityId) {
            if (targetEntityId === trigger.target) return true;
            if (context.entityManager.hasTag(targetEntityId, trigger.target)) return true;
          }
          
          const tapX = context.inputEvents.tap.worldX;
          const tapY = context.inputEvents.tap.worldY;
          if (tapX !== undefined && tapY !== undefined) {
            const matchingEntity = this.findEntityWithTagAtPoint(
              tapX, tapY, trigger.target, targetEntityId, context
            );
            if (matchingEntity) {
              context.inputEvents.tap.targetEntityId = matchingEntity.id;
              return true;
            }
          }
          
          return false;
        }

        const tapWorldX = context.inputEvents.tap.worldX;

        if (trigger.xMinPercent !== undefined || trigger.xMaxPercent !== undefined) {
          const viewportBounds = context.camera?.getViewportWorldBounds();
          if (viewportBounds) {
            const viewportWidth = viewportBounds.maxX - viewportBounds.minX;
            const tapPercent = ((tapWorldX - viewportBounds.minX) / viewportWidth) * 100;

            if (trigger.xMinPercent !== undefined && tapPercent < trigger.xMinPercent) {
              return false;
            }
            if (trigger.xMaxPercent !== undefined && tapPercent >= trigger.xMaxPercent) {
              return false;
            }
          }
        }

        if (trigger.xMin !== undefined && tapWorldX < trigger.xMin) {
          return false;
        }
        if (trigger.xMax !== undefined && tapWorldX >= trigger.xMax) {
          return false;
        }
        console.log("[InputTrigger] TAP MATCHED!");
        return true;
      }

      case "drag":
        if (trigger.phase === "start") return !!context.inputEvents.dragStart;
        if (trigger.phase === "end") return !!context.inputEvents.dragEnd;
        if (trigger.phase === "move") return !!context.input.drag;
        return false;

      case "tilt": {
        if (!context.input.tilt) return false;
        const threshold = trigger.threshold ?? 0.1;
        if (trigger.axis === "x")
          return Math.abs(context.input.tilt.x) > threshold;
        if (trigger.axis === "y")
          return Math.abs(context.input.tilt.y) > threshold;
        return (
          Math.abs(context.input.tilt.x) > threshold ||
          Math.abs(context.input.tilt.y) > threshold
        );
      }

      case "button":
        if (trigger.state === "pressed") {
          return (
            context.inputEvents.buttonPressed?.has(trigger.button) ?? false
          );
        }
        if (trigger.state === "released") {
          return (
            context.inputEvents.buttonReleased?.has(trigger.button) ?? false
          );
        }
        if (trigger.state === "held") {
          if (trigger.button === "any") {
            return Object.values(context.input.buttons ?? {}).some((v) => v);
          }
          return context.input.buttons?.[trigger.button] ?? false;
        }
        return false;

      case "swipe":
        if (!context.inputEvents.swipe) return false;
        if (trigger.direction === "any") return true;
        return context.inputEvents.swipe.direction === trigger.direction;

      default:
        return false;
    }
  }

  private findEntityWithTagAtPoint(
    x: number,
    y: number,
    tag: string,
    excludeEntityId: string | undefined,
    context: RuleContext
  ): RuntimeEntity | null {
    const allEntities = context.entityManager.getActiveEntities();
    for (const entity of allEntities) {
      if (entity.id === excludeEntityId) continue;
      if (!context.entityManager.hasTag(entity.id, tag)) continue;
      if (this.isPointInEntity(x, y, entity)) {
        return entity;
      }
    }
    return null;
  }

  private isPointInEntity(x: number, y: number, entity: RuntimeEntity): boolean {
    const physics = entity.physics;
    if (!physics) return false;

    const ex = entity.transform.x;
    const ey = entity.transform.y;

    if (physics.shape === "circle" && physics.radius) {
      const dx = x - ex;
      const dy = y - ey;
      return dx * dx + dy * dy <= physics.radius * physics.radius;
    }

    if (physics.shape === "box" && physics.width && physics.height) {
      const halfW = physics.width / 2;
      const halfH = physics.height / 2;
      return x >= ex - halfW && x <= ex + halfW && y >= ey - halfH && y <= ey + halfH;
    }

    return false;
  }
}
