import type { EconomySetValueAction } from "@slopcade/shared";
import type { RuleContext } from "../types";
import type { ActionExecutor } from "./ActionExecutor";

export class EconomySetValueActionExecutor
	implements ActionExecutor<EconomySetValueAction>
{
	execute(action: EconomySetValueAction, context: RuleContext): void {
		if (!context.economyOps) return;
		context.economyOps.setPoolValue(action.poolId, action.value);
	}
}
