import type { TiltTrigger } from "@slopcade/shared";
import { describe, expect, it, vi } from "vitest";
import type { RuleContext } from "../../types";
import { InputTriggerEvaluator } from "../InputTriggerEvaluator";

function makeContext(tiltX: number, tiltY: number): RuleContext {
	return {
		entityManager: {} as any,
		physics: {} as any,
		mutator: {} as any,
		elapsed: 0,
		collisions: [],
		events: new Map(),
		input: {
			tilt: { x: tiltX, y: tiltY },
		},
		inputEvents: {},
	} as RuleContext;
}

describe("InputTriggerEvaluator — tilt", () => {
	const evaluator = new InputTriggerEvaluator();

	describe("legacy behavior (no direction field)", () => {
		it("triggers on positive tilt exceeding threshold", () => {
			const trigger: TiltTrigger = { type: "tilt", axis: "x", threshold: 0.3 };
			expect(evaluator.evaluate(trigger, makeContext(0.5, 0))).toBe(true);
		});

		it("triggers on negative tilt exceeding threshold (abs)", () => {
			const trigger: TiltTrigger = { type: "tilt", axis: "x", threshold: 0.3 };
			expect(evaluator.evaluate(trigger, makeContext(-0.5, 0))).toBe(true);
		});

		it("does not trigger below threshold", () => {
			const trigger: TiltTrigger = { type: "tilt", axis: "x", threshold: 0.3 };
			expect(evaluator.evaluate(trigger, makeContext(0.1, 0))).toBe(false);
		});

		it("uses default threshold of 0.1", () => {
			const trigger: TiltTrigger = { type: "tilt", axis: "x" };
			expect(evaluator.evaluate(trigger, makeContext(0.05, 0))).toBe(false);
			expect(evaluator.evaluate(trigger, makeContext(0.2, 0))).toBe(true);
		});

		it("triggers on either axis when axis is 'both' or undefined", () => {
			const trigger: TiltTrigger = { type: "tilt", threshold: 0.1 };
			expect(evaluator.evaluate(trigger, makeContext(0.5, 0))).toBe(true);
			expect(evaluator.evaluate(trigger, makeContext(0, 0.5))).toBe(true);
			expect(evaluator.evaluate(trigger, makeContext(0, 0))).toBe(false);
		});
	});

	describe("direction: 'any'", () => {
		it("behaves the same as no direction field", () => {
			const trigger: TiltTrigger = {
				type: "tilt",
				axis: "x",
				threshold: 0.3,
				direction: "any",
			};
			expect(evaluator.evaluate(trigger, makeContext(0.5, 0))).toBe(true);
			expect(evaluator.evaluate(trigger, makeContext(-0.5, 0))).toBe(true);
			expect(evaluator.evaluate(trigger, makeContext(0.1, 0))).toBe(false);
		});
	});

	describe("direction: 'positive'", () => {
		it("triggers only on positive tilt exceeding threshold", () => {
			const trigger: TiltTrigger = {
				type: "tilt",
				axis: "x",
				threshold: 0.3,
				direction: "positive",
			};
			expect(evaluator.evaluate(trigger, makeContext(0.5, 0))).toBe(true);
		});

		it("does not trigger on negative tilt", () => {
			const trigger: TiltTrigger = {
				type: "tilt",
				axis: "x",
				threshold: 0.3,
				direction: "positive",
			};
			expect(evaluator.evaluate(trigger, makeContext(-0.5, 0))).toBe(false);
		});

		it("does not trigger below threshold", () => {
			const trigger: TiltTrigger = {
				type: "tilt",
				axis: "x",
				threshold: 0.3,
				direction: "positive",
			};
			expect(evaluator.evaluate(trigger, makeContext(0.1, 0))).toBe(false);
		});

		it("works on y axis", () => {
			const trigger: TiltTrigger = {
				type: "tilt",
				axis: "y",
				threshold: 0.2,
				direction: "positive",
			};
			expect(evaluator.evaluate(trigger, makeContext(0, 0.5))).toBe(true);
			expect(evaluator.evaluate(trigger, makeContext(0, -0.5))).toBe(false);
		});
	});

	describe("direction: 'negative'", () => {
		it("triggers only on negative tilt exceeding threshold", () => {
			const trigger: TiltTrigger = {
				type: "tilt",
				axis: "x",
				threshold: 0.3,
				direction: "negative",
			};
			expect(evaluator.evaluate(trigger, makeContext(-0.5, 0))).toBe(true);
		});

		it("does not trigger on positive tilt", () => {
			const trigger: TiltTrigger = {
				type: "tilt",
				axis: "x",
				threshold: 0.3,
				direction: "negative",
			};
			expect(evaluator.evaluate(trigger, makeContext(0.5, 0))).toBe(false);
		});

		it("does not trigger below threshold", () => {
			const trigger: TiltTrigger = {
				type: "tilt",
				axis: "x",
				threshold: 0.3,
				direction: "negative",
			};
			expect(evaluator.evaluate(trigger, makeContext(-0.1, 0))).toBe(false);
		});

		it("works on y axis", () => {
			const trigger: TiltTrigger = {
				type: "tilt",
				axis: "y",
				threshold: 0.2,
				direction: "negative",
			};
			expect(evaluator.evaluate(trigger, makeContext(0, -0.5))).toBe(true);
			expect(evaluator.evaluate(trigger, makeContext(0, 0.5))).toBe(false);
		});
	});

	describe("no tilt input", () => {
		it("returns false when tilt is not available", () => {
			const trigger: TiltTrigger = {
				type: "tilt",
				axis: "x",
				direction: "positive",
			};
			const context = {
				...makeContext(0, 0),
				input: {},
			} as RuleContext;
			expect(evaluator.evaluate(trigger, context)).toBe(false);
		});
	});
});
