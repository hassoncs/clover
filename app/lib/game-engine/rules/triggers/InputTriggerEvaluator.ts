import type { TriggerEvaluator } from "./TriggerEvaluator";
import type {
  TapTrigger,
  DragTrigger,
  TiltTrigger,
  ButtonTrigger,
  SwipeTrigger,
} from "@slopcade/shared";
import type { RuleContext } from "../types";

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
      case "tap":
        if (!context.inputEvents.tap) return false;
        if (trigger.target === "self") {
          return false; // Requires entity context handling in RulesEvaluator integration
        }
        if (trigger.target && trigger.target !== "screen") {
          return context.inputEvents.tap.targetEntityId === trigger.target;
        }
        console.log("[InputTrigger] TAP MATCHED!");
        return true;

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
}
