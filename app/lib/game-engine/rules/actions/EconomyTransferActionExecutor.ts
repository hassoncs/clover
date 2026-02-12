import type { EconomyTransferAction } from "@slopcade/shared";
import type { RuleContext } from "../types";
import type { ActionExecutor } from "./ActionExecutor";

export class EconomyTransferActionExecutor
	implements ActionExecutor<EconomyTransferAction>
{
	execute(action: EconomyTransferAction, context: RuleContext): void {
		if (!context.economyOps) return;
		context.economyOps.transfer(action.fromPool, action.toPool, action.amount);
	}
}
