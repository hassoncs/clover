import type { TriggerEvaluator } from "./TriggerEvaluator";
import type { SensorEnterTrigger, SensorExitTrigger } from "@slopcade/shared";
import type { RuleContext } from "../types";

/** @deprecated Sensor triggers are deprecated. Use collision triggers with sensors instead. */
export class SensorTriggerEvaluator
  implements TriggerEvaluator<SensorEnterTrigger | SensorExitTrigger>
{
  evaluate(
    trigger: SensorEnterTrigger | SensorExitTrigger,
    context: RuleContext,
  ): boolean {
    // SensorTriggerEvaluator is deprecated - use collision triggers with sensors instead
    const sensorEvents = (context as RuleContext & { sensorEvents?: SensorEventInfo[] }).sensorEvents ?? [];

    return sensorEvents.some((event) => {
      const isCorrectEventType =
        (trigger.type === 'sensor_enter' && event.type === 'enter') ||
        (trigger.type === 'sensor_exit' && event.type === 'exit');

      const sensorHasTag = event.sensor.tags?.includes(trigger.sensorTag) ?? false;
      const entityHasTag = event.entity.tags?.includes(trigger.entityTag) ?? false;

      return isCorrectEventType && sensorHasTag && entityHasTag;
    });
  }
}

/** @deprecated SensorEventInfo is deprecated. Use collision events with sensors instead. */
export interface SensorEventInfo {
  sensor: { id: string; tags?: string[] };
  entity: { id: string; tags?: string[] };
  type: 'enter' | 'exit';
}
