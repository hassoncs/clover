import { SystemPhase } from "@slopcade/shared";
import type { PartyRoomState } from "@slopcade/shared/types/party";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SystemContext, UpdateContext } from "../../types";
import {
	NetworkRuntimeSystem,
	type NetworkSystemConfig,
} from "../NetworkRuntimeSystem";

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
			emit: vi.fn(),
			flush: vi.fn(() => []),
			subscribe: vi.fn(),
			clear: vi.fn(),
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
		gameState: {
			state: "playing",
			variables: {} as Record<string, unknown>,
		} as any,
		frame: { inputEvents: [], collisions: [] },
		...overrides,
	};
}

function makeRoomState(overrides?: Partial<PartyRoomState>): PartyRoomState {
	return {
		phase: "lobby",
		players: [
			{ id: "host-1", name: "Host", connected: true, isHost: true },
			{ id: "p1", name: "Alice", connected: true },
		],
		hostId: "host-1",
		sharedData: {},
		currentRound: 0,
		stateVersion: 0,
		...overrides,
	};
}

describe("NetworkRuntimeSystem", () => {
	let system: NetworkRuntimeSystem;
	let ctx: SystemContext;

	beforeEach(() => {
		ctx = createMockSystemContext();
		vi.spyOn(performance, "now").mockReturnValue(0);
	});

	describe("Lifecycle", () => {
		it("has correct id, phase, and priority", () => {
			system = new NetworkRuntimeSystem({ role: "host" });
			expect(system.id).toBe("network");
			expect(system.phase).toBe(SystemPhase.PRE_UPDATE);
			expect(system.priority).toBe(90);
		});

		it("initializes and returns initial state", () => {
			system = new NetworkRuntimeSystem({ role: "player" });
			system.initialize(ctx, { role: "player" });
			const state = system.getState();
			expect(state.connectionStatus).toBe("disconnected");
			expect(state.role).toBe("player");
			expect(state.playerCount).toBe(0);
		});

		it("cleans up on destroy", () => {
			system = new NetworkRuntimeSystem({ role: "host" });
			system.initialize(ctx, { role: "host" });
			system.pushUpdate(makeRoomState(), "connected");
			system.destroy();
			const state = system.getState();
			expect(state.playerCount).toBe(0);
		});
	});

	describe("Network state → gameState.variables mapping", () => {
		it("maps room phase to room.phase variable", () => {
			system = new NetworkRuntimeSystem({ role: "host" });
			system.initialize(ctx, { role: "host" });

			system.pushUpdate(makeRoomState({ phase: "playing" }), "connected");

			const updateCtx = createUpdateContext();
			(performance.now as any).mockReturnValue(200);
			system.update(updateCtx, system.getState());

			const vars = updateCtx.gameState.variables as Record<string, unknown>;
			expect(vars["room.phase"]).toBe("playing");
			expect(vars["networkStatus"]).toBe("connected");
			expect(vars["role"]).toBe("host");
		});

		it("maps player data to indexed variables", () => {
			system = new NetworkRuntimeSystem({ role: "host" });
			system.initialize(ctx, { role: "host" });

			const roomState = makeRoomState({
				players: [
					{ id: "host-1", name: "Host", connected: true, isHost: true },
					{
						id: "p1",
						name: "Alice",
						connected: true,
						score: 42,
					},
				],
			});
			system.pushUpdate(roomState, "connected");

			const updateCtx = createUpdateContext();
			(performance.now as any).mockReturnValue(200);
			system.update(updateCtx, system.getState());

			const vars = updateCtx.gameState.variables as Record<string, unknown>;
			expect(vars["room.player0_name"]).toBe("Host");
			expect(vars["room.player1_name"]).toBe("Alice");
			expect(vars["room.player1_score"]).toBe(42);
			expect(vars["room.player1_connected"]).toBe(true);
			expect(vars["room.playerCount"]).toBe(2);
		});

		it("maps sharedData primitives to room.* variables", () => {
			system = new NetworkRuntimeSystem({ role: "player" });
			system.initialize(ctx, { role: "player" });

			const roomState = makeRoomState({
				sharedData: {
					currentQuestion: "What is 2+2?",
					roundTimer: 30,
					isActive: true,
					nested: { should: "be ignored" },
				},
			});
			system.pushUpdate(roomState, "connected");

			const updateCtx = createUpdateContext();
			(performance.now as any).mockReturnValue(200);
			system.update(updateCtx, system.getState());

			const vars = updateCtx.gameState.variables as Record<string, unknown>;
			expect(vars["room.currentQuestion"]).toBe("What is 2+2?");
			expect(vars["room.roundTimer"]).toBe(30);
			expect(vars["room.isActive"]).toBe(true);
			expect(vars["room.nested"]).toBeUndefined();
		});

		it("maps currentRound and maxRounds", () => {
			system = new NetworkRuntimeSystem({ role: "host" });
			system.initialize(ctx, { role: "host" });

			system.pushUpdate(
				makeRoomState({ currentRound: 3, maxRounds: 10 }),
				"connected",
			);

			const updateCtx = createUpdateContext();
			(performance.now as any).mockReturnValue(200);
			system.update(updateCtx, system.getState());

			const vars = updateCtx.gameState.variables as Record<string, unknown>;
			expect(vars["room.currentRound"]).toBe(3);
			expect(vars["room.maxRounds"]).toBe(10);
		});
	});

	describe("Events", () => {
		it("emits network:status_change on status change", () => {
			system = new NetworkRuntimeSystem({ role: "host" });
			system.initialize(ctx, { role: "host" });

			system.pushUpdate(makeRoomState(), "connected");

			const updateCtx = createUpdateContext();
			(performance.now as any).mockReturnValue(200);
			system.update(updateCtx, system.getState());

			expect(ctx.eventQueue.emit).toHaveBeenCalledWith(
				"network:status_change",
				expect.objectContaining({
					status: "connected",
					previousStatus: "disconnected",
				}),
			);
		});

		it("emits network:phase_change on room phase change", () => {
			system = new NetworkRuntimeSystem({ role: "host" });
			system.initialize(ctx, { role: "host" });

			system.pushUpdate(makeRoomState({ phase: "lobby" }), "connected");
			const updateCtx1 = createUpdateContext();
			(performance.now as any).mockReturnValue(200);
			system.update(updateCtx1, system.getState());

			system.pushUpdate(makeRoomState({ phase: "playing" }), "connected");
			const updateCtx2 = createUpdateContext();
			(performance.now as any).mockReturnValue(500);
			system.update(updateCtx2, system.getState());

			expect(ctx.eventQueue.emit).toHaveBeenCalledWith(
				"network:phase_change",
				expect.objectContaining({
					phase: "playing",
					previousPhase: "lobby",
				}),
			);
		});

		it("emits network:player_count_change", () => {
			system = new NetworkRuntimeSystem({ role: "host" });
			system.initialize(ctx, { role: "host" });

			system.pushUpdate(
				makeRoomState({
					players: [
						{ id: "host-1", name: "Host", connected: true, isHost: true },
					],
				}),
				"connected",
			);
			const updateCtx1 = createUpdateContext();
			(performance.now as any).mockReturnValue(200);
			system.update(updateCtx1, system.getState());

			system.pushUpdate(
				makeRoomState({
					players: [
						{ id: "host-1", name: "Host", connected: true, isHost: true },
						{ id: "p1", name: "Alice", connected: true },
					],
				}),
				"connected",
			);
			const updateCtx2 = createUpdateContext();
			(performance.now as any).mockReturnValue(500);
			system.update(updateCtx2, system.getState());

			expect(ctx.eventQueue.emit).toHaveBeenCalledWith(
				"network:player_count_change",
				expect.objectContaining({
					count: 2,
					previousCount: 1,
				}),
			);
		});
	});

	describe("Rate limiting buffer", () => {
		it("skips update if under min interval", () => {
			system = new NetworkRuntimeSystem({ role: "host" });
			system.initialize(ctx, { role: "host" });

			system.pushUpdate(makeRoomState(), "connected");
			const updateCtx1 = createUpdateContext();
			(performance.now as any).mockReturnValue(0);
			system.update(updateCtx1, system.getState());

			system.pushUpdate(makeRoomState({ phase: "playing" }), "connected");
			const updateCtx2 = createUpdateContext();
			(performance.now as any).mockReturnValue(50);
			system.update(updateCtx2, system.getState());

			const vars = updateCtx2.gameState.variables as Record<string, unknown>;
			expect(vars["room.phase"]).toBeUndefined();
		});

		it("uses latest buffered state when processing", () => {
			system = new NetworkRuntimeSystem({ role: "host" });
			system.initialize(ctx, { role: "host" });

			system.pushUpdate(makeRoomState({ phase: "lobby" }), "connecting");
			system.pushUpdate(makeRoomState({ phase: "playing" }), "connected");

			const updateCtx = createUpdateContext();
			(performance.now as any).mockReturnValue(200);
			system.update(updateCtx, system.getState());

			const vars = updateCtx.gameState.variables as Record<string, unknown>;
			expect(vars["room.phase"]).toBe("playing");
			expect(vars["networkStatus"]).toBe("connected");
		});
	});
});
