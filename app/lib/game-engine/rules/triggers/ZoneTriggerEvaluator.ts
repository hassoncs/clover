import type { TriggerEvaluator } from "./TriggerEvaluator";
import type { ZoneEnterTrigger, ZoneExitTrigger } from "@slopcade/shared";
import type { RuleContext } from "../types";

export class ZoneTriggerEvaluator
  implements TriggerEvaluator<ZoneEnterTrigger | ZoneExitTrigger>
{
  evaluate(
    trigger: ZoneEnterTrigger | ZoneExitTrigger,
    context: RuleContext,
  ): boolean {
    const zoneEvents = (context as RuleContext & { zoneEvents?: ZoneEventInfo[] }).zoneEvents ?? [];

    if (zoneEvents.length > 0) {
      console.log(
        `[ZoneTrigger] Checking ${zoneEvents.length} zone events for`,
        trigger.type,
        'zoneTag:',
        trigger.zoneTag,
        'entityTag:',
        trigger.entityTag,
      );
    }

    return zoneEvents.some((event) => {
      const isCorrectEventType =
        (trigger.type === 'zone_enter' && event.type === 'enter') ||
        (trigger.type === 'zone_exit' && event.type === 'exit');

      const zoneHasTag = event.zone.tags?.includes(trigger.zoneTag) ?? false;
      const entityHasTag = event.entity.tags?.includes(trigger.entityTag) ?? false;

      const matched = isCorrectEventType && zoneHasTag && entityHasTag;

      if (matched) {
        console.log(
          '[ZoneTrigger] MATCHED:',
          trigger.type,
          'zone:',
          event.zone.id,
          'entity:',
          event.entity.id,
        );
      }

      return matched;
    });
  }
}

export interface ZoneEventInfo {
  zone: { id: string; tags?: string[] };
  entity: { id: string; tags?: string[] };
  type: 'enter' | 'exit';
}
