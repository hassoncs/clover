import type {
	EconomyPoolAboveCondition,
	EconomyPoolBelowCondition,
	EconomyPoolEqualsCondition,
} from "@slopcade/shared";
import type { RuleContext } from "../types";
import type { ConditionEvaluator } from "./ConditionEvaluator";

type EconomyPoolCondition =
	| EconomyPoolAboveCondition
	| EconomyPoolBelowCondition
	| EconomyPoolEqualsCondition;

export class EconomyPoolConditionEvaluator
	implements ConditionEvaluator<EconomyPoolCondition>
{
	evaluate(condition: EconomyPoolCondition, context: RuleContext): boolean {
		if (!context.economyOps) return false;

		const value = context.economyOps.getPoolValue(condition.poolId);
		if (value === undefined) return false;

		switch (condition.type) {
			case "economy_pool_above":
				return value > condition.threshold;
			case "economy_pool_below":
				return value < condition.threshold;
			case "economy_pool_equals":
				return value === condition.threshold;
			default:
				return false;
		}
	}
}
