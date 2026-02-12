import type { EconomyEmitEventAction } from "@slopcade/shared";
import type { RuleContext } from "../types";
import type { ActionExecutor } from "./ActionExecutor";

export class EconomyEmitEventActionExecutor
	implements ActionExecutor<EconomyEmitEventAction>
{
	execute(action: EconomyEmitEventAction, context: RuleContext): void {
		if (!context.economyOps) return;
		context.economyOps.emitEvent(action.eventType, action.data);
	}
}
