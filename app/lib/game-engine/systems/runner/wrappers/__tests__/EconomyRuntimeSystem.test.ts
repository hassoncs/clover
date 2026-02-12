import type { EconomyGraph } from "@slopcade/economy-engine";
import { SystemPhase } from "@slopcade/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SystemContext, UpdateContext } from "../../types";
import type {
	EconomySystemConfig,
	EconomySystemState,
} from "../EconomyRuntimeSystem";
import { EconomyRuntimeSystem } from "../EconomyRuntimeSystem";

function createMockSystemContext(): SystemContext {
	return {
		entityManager: {} as any,
		physics: {} as any,
		bridge: {} as any,
		eventBus: {
			emit: vi.fn(),
			on: vi.fn(),
			off: vi.fn(),
			clear: vi.fn(),
		} as any,
		eventQueue: {
			enqueue: vi.fn(),
			process: vi.fn(),
			clear: vi.fn(),
			flush: vi.fn(),
		} as any,
	};
}

function createUpdateContext(
	overrides: Partial<UpdateContext> = {},
): UpdateContext {
	return {
		dt: 0.016,
		elapsed: 0,
		frameId: 0,
		input: {} as any,
		gameState: { state: "playing" } as any,
		frame: { inputEvents: [], collisions: [] },
		...overrides,
	};
}

function createSimpleEconomyGraph(): EconomyGraph {
	return {
		id: "test-economy",
		resourceTypes: ["coins"],
		nodes: [
			{
				id: "coin-source",
				type: "source",
				label: "Coin Source",
				resourceType: "coins",
			},
			{
				id: "wallet",
				type: "pool",
				label: "Wallet",
				resourceType: "coins",
				initialValue: 10,
				capacity: 100,
			},
		],
		edges: [
			{
				id: "e1",
				type: "resource" as const,
				from: "coin-source",
				to: "wallet",
				formula: "1",
			},
		],
	};
}

describe("EconomyRuntimeSystem", () => {
	let system: EconomyRuntimeSystem;
	let ctx: SystemContext;

	beforeEach(() => {
		ctx = createMockSystemContext();
	});

	describe("Lifecycle", () => {
		it("should have correct id, phase, and priority", () => {
			system = new EconomyRuntimeSystem();

			expect(system.id).toBe("economy");
			expect(system.phase).toBe(SystemPhase.GAME_LOGIC);
			expect(system.priority).toBe(40);
		});

		it("should initialize with economy graph config", () => {
			system = new EconomyRuntimeSystem();
			const config: EconomySystemConfig = {
				economyGraph: createSimpleEconomyGraph(),
			};

			system.initialize(ctx, config);

			const state = system.getState();
			expect(state.simulatorState).toBeDefined();
			expect(state.simulatorState?.tick).toBe(0);
			expect(state.simulatorState?.nodeValues["wallet"]).toBe(10);
		});

		it("should handle empty config (no economy)", () => {
			system = new EconomyRuntimeSystem();
			const config: EconomySystemConfig = {};

			system.initialize(ctx, config);

			const state = system.getState();
			expect(state.simulatorState).toBeNull();
		});

		it("should clean up on destroy", () => {
			system = new EconomyRuntimeSystem();
			system.initialize(ctx, { economyGraph: createSimpleEconomyGraph() });

			system.destroy();

			const state = system.getState();
			expect(state.simulatorState).toBeNull();
		});
	});

	describe("Tick Updates", () => {
		it("should not update when no economy is configured", () => {
			system = new EconomyRuntimeSystem();
			system.initialize(ctx, {});

			const updateCtx = createUpdateContext({ dt: 1.0 });
			system.update(updateCtx, system.getState());

			expect(system.getState().simulatorState).toBeNull();
		});

		it("should accumulate dt and tick at the configured rate", () => {
			system = new EconomyRuntimeSystem();
			system.initialize(ctx, {
				economyGraph: createSimpleEconomyGraph(),
				tickRate: 1, // 1 tick per second
			});

			// Simulate 0.5 seconds - should NOT tick yet
			system.update(createUpdateContext({ dt: 0.5 }), system.getState());
			expect(system.getState().simulatorState!.tick).toBe(0);
			expect(system.getState().accumulatedDt).toBeCloseTo(0.5);

			// Simulate another 0.6 seconds - should tick once (total 1.1s)
			system.update(createUpdateContext({ dt: 0.6 }), system.getState());
			expect(system.getState().simulatorState!.tick).toBe(1);
			expect(system.getState().accumulatedDt).toBeCloseTo(0.1);
		});

		it("should tick multiple times if enough dt accumulated", () => {
			system = new EconomyRuntimeSystem();
			system.initialize(ctx, {
				economyGraph: createSimpleEconomyGraph(),
				tickRate: 1,
			});

			// Simulate 2.5 seconds at once - should tick 2 times
			system.update(createUpdateContext({ dt: 2.5 }), system.getState());
			expect(system.getState().simulatorState!.tick).toBe(2);
			expect(system.getState().accumulatedDt).toBeCloseTo(0.5);
		});

		it("should use default tick rate of 1 when not specified", () => {
			system = new EconomyRuntimeSystem();
			system.initialize(ctx, {
				economyGraph: createSimpleEconomyGraph(),
			});

			system.update(createUpdateContext({ dt: 1.0 }), system.getState());
			expect(system.getState().simulatorState!.tick).toBe(1);
		});

		it("should transfer resources according to economy graph", () => {
			system = new EconomyRuntimeSystem();
			system.initialize(ctx, {
				economyGraph: createSimpleEconomyGraph(),
				tickRate: 1,
			});

			// Initial wallet = 10, source sends 1 per tick
			system.update(createUpdateContext({ dt: 1.0 }), system.getState());
			expect(system.getState().simulatorState!.nodeValues["wallet"]).toBe(11);
		});
	});

	describe("State Serialization", () => {
		it("should return serializable state", () => {
			system = new EconomyRuntimeSystem();
			system.initialize(ctx, {
				economyGraph: createSimpleEconomyGraph(),
				tickRate: 1,
			});

			const state = system.getState();
			const serialized = JSON.stringify(state);
			const deserialized = JSON.parse(serialized) as EconomySystemState;

			expect(deserialized.simulatorState).toEqual(state.simulatorState);
			expect(deserialized.accumulatedDt).toBe(state.accumulatedDt);
		});

		it("should return null simulator state when no economy", () => {
			system = new EconomyRuntimeSystem();
			system.initialize(ctx, {});

			const state = system.getState();
			expect(state.simulatorState).toBeNull();
			expect(state.accumulatedDt).toBe(0);
		});
	});

	describe("Event Bus Integration", () => {
		it("should emit economy events to the event bus", () => {
			const graph: EconomyGraph = {
				id: "event-test",
				resourceTypes: ["coins"],
				nodes: [
					{
						id: "source",
						type: "source",
						label: "Source",
						resourceType: "coins",
					},
					{
						id: "pool",
						type: "pool",
						label: "Pool",
						resourceType: "coins",
						initialValue: 99,
						capacity: 100,
					},
				],
				edges: [
					{
						id: "e1",
						type: "resource" as const,
						from: "source",
						to: "pool",
						formula: "2",
					},
				],
			};

			system = new EconomyRuntimeSystem();
			system.initialize(ctx, { economyGraph: graph, tickRate: 1 });

			system.update(createUpdateContext({ dt: 1.0 }), system.getState());

			// Pool capacity is 100, was at 99, source sends 2 → should cap at 100 and emit pool_full
			const emitFn = ctx.eventBus.emit as ReturnType<typeof vi.fn>;
			const calls = emitFn.mock.calls;
			const economyEventCalls = calls.filter(
				(c: unknown[]) => c[0] === "economy:pool_full",
			);
			expect(economyEventCalls.length).toBeGreaterThan(0);
		});

		it("should emit pool_empty events", () => {
			const graph: EconomyGraph = {
				id: "empty-test",
				resourceTypes: ["coins"],
				nodes: [
					{
						id: "pool",
						type: "pool",
						label: "Pool",
						resourceType: "coins",
						initialValue: 1,
					},
					{ id: "drain", type: "drain", label: "Drain", resourceType: "coins" },
				],
				edges: [
					{
						id: "e1",
						type: "resource" as const,
						from: "pool",
						to: "drain",
						formula: "1",
					},
				],
			};

			system = new EconomyRuntimeSystem();
			system.initialize(ctx, { economyGraph: graph, tickRate: 1 });

			system.update(createUpdateContext({ dt: 1.0 }), system.getState());

			const emitFn = ctx.eventBus.emit as ReturnType<typeof vi.fn>;
			const calls = emitFn.mock.calls;
			const emptyEvents = calls.filter(
				(c: unknown[]) => c[0] === "economy:pool_empty",
			);
			expect(emptyEvents.length).toBeGreaterThan(0);
		});

		it("should not emit events when no economy configured", () => {
			system = new EconomyRuntimeSystem();
			system.initialize(ctx, {});

			system.update(createUpdateContext({ dt: 1.0 }), system.getState());

			const emitFn = ctx.eventBus.emit as ReturnType<typeof vi.fn>;
			expect(emitFn).not.toHaveBeenCalled();
		});
	});

	describe("Seed Determinism", () => {
		it("should use the graph id as seed basis for deterministic simulation", () => {
			const graph = createSimpleEconomyGraph();

			const system1 = new EconomyRuntimeSystem();
			system1.initialize(createMockSystemContext(), {
				economyGraph: graph,
				tickRate: 1,
			});
			system1.update(createUpdateContext({ dt: 3.0 }), system1.getState());
			const state1 = system1.getState();

			const system2 = new EconomyRuntimeSystem();
			system2.initialize(createMockSystemContext(), {
				economyGraph: graph,
				tickRate: 1,
			});
			system2.update(createUpdateContext({ dt: 3.0 }), system2.getState());
			const state2 = system2.getState();

			expect(state1.simulatorState).toEqual(state2.simulatorState);
		});
	});
});
