import type {
	EconomyEmitEventAction,
	EconomyPoolAboveCondition,
	EconomyPoolBelowCondition,
	EconomyPoolEqualsCondition,
	EconomySetValueAction,
	EconomyTransferAction,
} from "@slopcade/shared";
import { beforeEach, describe, expect, test } from "vitest";
import { EconomyEmitEventActionExecutor } from "../actions/EconomyEmitEventActionExecutor";
import { EconomySetValueActionExecutor } from "../actions/EconomySetValueActionExecutor";
import { EconomyTransferActionExecutor } from "../actions/EconomyTransferActionExecutor";
import { EconomyPoolConditionEvaluator } from "../conditions/EconomyPoolConditionEvaluator";
import type { IEconomyOps, RuleContext } from "../types";

function createMockEconomyOps(
	initialValues: Record<string, number> = {},
): IEconomyOps & {
	emittedEvents: Array<{ type: string; data?: Record<string, unknown> }>;
} {
	const nodeValues = { ...initialValues };
	const emittedEvents: Array<{ type: string; data?: Record<string, unknown> }> =
		[];
	return {
		getPoolValue(poolId: string): number | undefined {
			return nodeValues[poolId];
		},
		setPoolValue(poolId: string, value: number): void {
			nodeValues[poolId] = value;
		},
		transfer(fromPoolId: string, toPoolId: string, amount: number): boolean {
			const fromValue = nodeValues[fromPoolId];
			if (fromValue === undefined || fromValue < amount) return false;
			nodeValues[fromPoolId] = fromValue - amount;
			nodeValues[toPoolId] = (nodeValues[toPoolId] ?? 0) + amount;
			return true;
		},
		emitEvent(eventType: string, data?: Record<string, unknown>): void {
			emittedEvents.push({ type: eventType, data });
		},
		emittedEvents,
	};
}

function createMinimalContext(economyOps?: IEconomyOps): RuleContext {
	return {
		entityManager: {} as RuleContext["entityManager"],
		physics: {} as RuleContext["physics"],
		mutator: {
			getElapsed: () => 0,
			setGameState: () => {},
			triggerEvent: () => {},
			setVariable: () => {},
			getVariable: () => undefined,
			setCooldown: () => {},
			getList: () => undefined,
			setList: () => {},
			pushToList: () => {},
			popFromList: () => undefined,
			shuffleList: () => {},
			listContains: () => false,
		},
		elapsed: 0,
		collisions: [],
		events: new Map(),
		input: {} as RuleContext["input"],
		inputEvents: {} as RuleContext["inputEvents"],
		economyOps,
	};
}

describe("Economy Action Executors", () => {
	describe("EconomyTransferActionExecutor", () => {
		let executor: EconomyTransferActionExecutor;

		beforeEach(() => {
			executor = new EconomyTransferActionExecutor();
		});

		test("transfers resources between pools", () => {
			const ops = createMockEconomyOps({ gold: 100, shop: 0 });
			const ctx = createMinimalContext(ops);

			const action: EconomyTransferAction = {
				type: "economy_transfer",
				fromPool: "gold",
				toPool: "shop",
				amount: 30,
			};

			executor.execute(action, ctx);

			expect(ops.getPoolValue("gold")).toBe(70);
			expect(ops.getPoolValue("shop")).toBe(30);
		});

		test("does nothing when economyOps not available", () => {
			const ctx = createMinimalContext(undefined);

			const action: EconomyTransferAction = {
				type: "economy_transfer",
				fromPool: "gold",
				toPool: "shop",
				amount: 30,
			};

			executor.execute(action, ctx);
		});

		test("transfer fails when insufficient funds", () => {
			const ops = createMockEconomyOps({ gold: 10, shop: 0 });
			const ctx = createMinimalContext(ops);

			const action: EconomyTransferAction = {
				type: "economy_transfer",
				fromPool: "gold",
				toPool: "shop",
				amount: 30,
			};

			executor.execute(action, ctx);

			expect(ops.getPoolValue("gold")).toBe(10);
			expect(ops.getPoolValue("shop")).toBe(0);
		});
	});

	describe("EconomyEmitEventActionExecutor", () => {
		let executor: EconomyEmitEventActionExecutor;

		beforeEach(() => {
			executor = new EconomyEmitEventActionExecutor();
		});

		test("emits economy event with data", () => {
			const ops = createMockEconomyOps();
			const ctx = createMinimalContext(ops);

			const action: EconomyEmitEventAction = {
				type: "economy_emit_event",
				eventType: "purchase_complete",
				data: { itemId: "sword", cost: 50 },
			};

			executor.execute(action, ctx);

			expect(ops.emittedEvents).toHaveLength(1);
			expect(ops.emittedEvents[0]).toEqual({
				type: "purchase_complete",
				data: { itemId: "sword", cost: 50 },
			});
		});

		test("emits economy event without data", () => {
			const ops = createMockEconomyOps();
			const ctx = createMinimalContext(ops);

			const action: EconomyEmitEventAction = {
				type: "economy_emit_event",
				eventType: "market_open",
			};

			executor.execute(action, ctx);

			expect(ops.emittedEvents).toHaveLength(1);
			expect(ops.emittedEvents[0]).toEqual({
				type: "market_open",
				data: undefined,
			});
		});

		test("does nothing when economyOps not available", () => {
			const ctx = createMinimalContext(undefined);

			const action: EconomyEmitEventAction = {
				type: "economy_emit_event",
				eventType: "test",
			};

			executor.execute(action, ctx);
		});
	});

	describe("EconomySetValueActionExecutor", () => {
		let executor: EconomySetValueActionExecutor;

		beforeEach(() => {
			executor = new EconomySetValueActionExecutor();
		});

		test("sets pool value directly", () => {
			const ops = createMockEconomyOps({ health: 50 });
			const ctx = createMinimalContext(ops);

			const action: EconomySetValueAction = {
				type: "economy_set_value",
				poolId: "health",
				value: 100,
			};

			executor.execute(action, ctx);

			expect(ops.getPoolValue("health")).toBe(100);
		});

		test("sets value on non-existent pool (creates it)", () => {
			const ops = createMockEconomyOps({});
			const ctx = createMinimalContext(ops);

			const action: EconomySetValueAction = {
				type: "economy_set_value",
				poolId: "mana",
				value: 75,
			};

			executor.execute(action, ctx);

			expect(ops.getPoolValue("mana")).toBe(75);
		});

		test("does nothing when economyOps not available", () => {
			const ctx = createMinimalContext(undefined);

			const action: EconomySetValueAction = {
				type: "economy_set_value",
				poolId: "health",
				value: 100,
			};

			executor.execute(action, ctx);
		});
	});
});

describe("Economy Condition Evaluators", () => {
	describe("EconomyPoolConditionEvaluator", () => {
		let evaluator: EconomyPoolConditionEvaluator;

		beforeEach(() => {
			evaluator = new EconomyPoolConditionEvaluator();
		});

		test("economy_pool_above returns true when pool > threshold", () => {
			const ops = createMockEconomyOps({ gold: 100 });
			const ctx = createMinimalContext(ops);

			const condition: EconomyPoolAboveCondition = {
				type: "economy_pool_above",
				poolId: "gold",
				threshold: 50,
			};

			expect(evaluator.evaluate(condition, ctx)).toBe(true);
		});

		test("economy_pool_above returns false when pool <= threshold", () => {
			const ops = createMockEconomyOps({ gold: 50 });
			const ctx = createMinimalContext(ops);

			const condition: EconomyPoolAboveCondition = {
				type: "economy_pool_above",
				poolId: "gold",
				threshold: 50,
			};

			expect(evaluator.evaluate(condition, ctx)).toBe(false);
		});

		test("economy_pool_below returns true when pool < threshold", () => {
			const ops = createMockEconomyOps({ health: 10 });
			const ctx = createMinimalContext(ops);

			const condition: EconomyPoolBelowCondition = {
				type: "economy_pool_below",
				poolId: "health",
				threshold: 20,
			};

			expect(evaluator.evaluate(condition, ctx)).toBe(true);
		});

		test("economy_pool_below returns false when pool >= threshold", () => {
			const ops = createMockEconomyOps({ health: 20 });
			const ctx = createMinimalContext(ops);

			const condition: EconomyPoolBelowCondition = {
				type: "economy_pool_below",
				poolId: "health",
				threshold: 20,
			};

			expect(evaluator.evaluate(condition, ctx)).toBe(false);
		});

		test("economy_pool_equals returns true when pool == threshold", () => {
			const ops = createMockEconomyOps({ lives: 3 });
			const ctx = createMinimalContext(ops);

			const condition: EconomyPoolEqualsCondition = {
				type: "economy_pool_equals",
				poolId: "lives",
				threshold: 3,
			};

			expect(evaluator.evaluate(condition, ctx)).toBe(true);
		});

		test("economy_pool_equals returns false when pool != threshold", () => {
			const ops = createMockEconomyOps({ lives: 2 });
			const ctx = createMinimalContext(ops);

			const condition: EconomyPoolEqualsCondition = {
				type: "economy_pool_equals",
				poolId: "lives",
				threshold: 3,
			};

			expect(evaluator.evaluate(condition, ctx)).toBe(false);
		});

		test("returns false when economyOps not available", () => {
			const ctx = createMinimalContext(undefined);

			const condition: EconomyPoolAboveCondition = {
				type: "economy_pool_above",
				poolId: "gold",
				threshold: 50,
			};

			expect(evaluator.evaluate(condition, ctx)).toBe(false);
		});

		test("returns false when pool does not exist", () => {
			const ops = createMockEconomyOps({});
			const ctx = createMinimalContext(ops);

			const condition: EconomyPoolAboveCondition = {
				type: "economy_pool_above",
				poolId: "nonexistent",
				threshold: 0,
			};

			expect(evaluator.evaluate(condition, ctx)).toBe(false);
		});
	});
});
