import type { GodotBridge } from "@slopcade/godot-bridge";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EffectDispatcher } from "../EffectDispatcher";
import { EntityManager } from "../EntityManager";

function createMockBridge(): GodotBridge {
	return {
		applySpriteEffect: vi.fn(),
		updateSpriteEffectParam: vi.fn(),
		clearSpriteEffect: vi.fn(),
	} as unknown as GodotBridge;
}

describe("EffectDispatcher", () => {
	let bridge: GodotBridge;
	let entityManager: EntityManager;

	beforeEach(() => {
		bridge = createMockBridge();
		entityManager = new EntityManager({
			prefabs: {
				gem: {
					id: "gem",
					effectStates: [
						{
							when: { hasTag: "held" },
							priority: 1,
							effects: [
								{
									effect: "glow",
									params: { intensity: 0.7, color: "#FF8800" },
								},
							],
						},
					],
				},
			} as Record<string, any>,
		});

		entityManager.loadEntities([
			{
				id: "gem-1",
				name: "Gem",
				prefab: "gem",
				transform: {
					x: 0,
					y: 0,
					angle: 0,
					scaleX: 1,
					scaleY: 1,
				},
			},
		] as any);
	});

	describe("tag-driven effect activation", () => {
		it("applies and clears effects from hasTag condition", () => {
			const dispatcher = new EffectDispatcher({
				entityManager,
				bridge,
			});

			expect(bridge.applySpriteEffect).not.toHaveBeenCalled();

			entityManager.addTag("gem-1", "held");
			expect(bridge.applySpriteEffect).toHaveBeenCalledTimes(1);
			expect(bridge.applySpriteEffect).toHaveBeenLastCalledWith(
				"gem-1",
				"glow",
				expect.objectContaining({
					intensity: 0.7,
					color: [1, 0.5333333333333333, 0],
				}),
			);

			entityManager.removeTag("gem-1", "held");
			expect(bridge.clearSpriteEffect).toHaveBeenCalledTimes(1);

			dispatcher.destroy();
		});

		it("activates effect when entity has any of the specified tags (hasAnyTag)", () => {
			const em = new EntityManager({
				prefabs: {
					item: {
						id: "item",
						effectStates: [
							{
								when: { hasAnyTag: ["selected", "highlighted"] },
								priority: 1,
								effects: [{ effect: "outline", params: { color: "#FFFFFF" } }],
							},
						],
					},
				},
			} as Record<string, any>);
			em.loadEntities([
				{
					id: "item-1",
					name: "Item",
					prefab: "item",
					transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
				},
			] as any);

			const dispatcher = new EffectDispatcher({ entityManager: em, bridge });

			em.addTag("item-1", "selected");
			expect(bridge.applySpriteEffect).toHaveBeenCalledWith(
				"item-1",
				"outline",
				expect.any(Object),
			);

			dispatcher.destroy();
		});

		it("activates effect only when entity has all specified tags (hasAllTags)", () => {
			const em = new EntityManager({
				prefabs: {
					item: {
						id: "item",
						effectStates: [
							{
								when: { hasAllTags: ["selected", "active"] },
								priority: 1,
								effects: [{ effect: "glow", params: { intensity: 1.0 } }],
							},
						],
					},
				},
			} as Record<string, any>);
			em.loadEntities([
				{
					id: "item-2",
					name: "Item",
					prefab: "item",
					transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
				},
			] as any);

			const dispatcher = new EffectDispatcher({ entityManager: em, bridge });

			em.addTag("item-2", "selected");
			expect(bridge.applySpriteEffect).not.toHaveBeenCalled();

			em.addTag("item-2", "active");
			expect(bridge.applySpriteEffect).toHaveBeenCalledWith(
				"item-2",
				"glow",
				expect.any(Object),
			);

			dispatcher.destroy();
		});

		it("activates effect when entity lacks specified tag (lacksTag)", () => {
			const em = new EntityManager({
				prefabs: {
					item: {
						id: "item",
						effectStates: [
							{
								when: { lacksTag: "hidden" },
								priority: 1,
								effects: [{ effect: "tint", params: { intensity: 0.5 } }],
							},
						],
					},
				},
			} as Record<string, any>);
			em.loadEntities([
				{
					id: "item-3",
					name: "Item",
					prefab: "item",
					transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
				},
			] as any);

			const dispatcher = new EffectDispatcher({ entityManager: em, bridge });

			// Effect should be active initially (no "hidden" tag)
			expect(bridge.applySpriteEffect).toHaveBeenCalledWith(
				"item-3",
				"tint",
				expect.any(Object),
			);

			(bridge.applySpriteEffect as ReturnType<typeof vi.fn>).mockClear();
			(bridge.clearSpriteEffect as ReturnType<typeof vi.fn>).mockClear();

			em.addTag("item-3", "hidden");
			expect(bridge.clearSpriteEffect).toHaveBeenCalledWith("item-3");

			dispatcher.destroy();
		});

		it("evaluates expression conditions (expr)", () => {
			const em = new EntityManager({
				prefabs: {
					item: {
						id: "item",
						effectStates: [
							{
								when: { expr: "score > 100" },
								priority: 1,
								effects: [{ effect: "glow", params: { intensity: 0.8 } }],
							},
						],
					},
				},
			} as Record<string, any>);
			em.loadEntities([
				{
					id: "item-4",
					name: "Item",
					prefab: "item",
					transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
				},
			] as any);

			const getVariables = () => ({ score: 50 });
			const dispatcher = new EffectDispatcher({
				entityManager: em,
				bridge,
				getVariables,
			});

			// score = 50, should not activate
			expect(bridge.applySpriteEffect).not.toHaveBeenCalled();

			dispatcher.destroy();
		});

		it("evaluates expression conditions with truthy result", () => {
			const em = new EntityManager({
				prefabs: {
					item: {
						id: "item",
						effectStates: [
							{
								when: { expr: "score > 100" },
								priority: 1,
								effects: [{ effect: "glow", params: { intensity: 0.8 } }],
							},
						],
					},
				},
			} as Record<string, any>);
			em.loadEntities([
				{
					id: "item-5",
					name: "Item",
					prefab: "item",
					transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
				},
			] as any);

			const getVariables = () => ({ score: 150 });
			const dispatcher = new EffectDispatcher({
				entityManager: em,
				bridge,
				getVariables,
			});

			// score = 150, should activate
			expect(bridge.applySpriteEffect).toHaveBeenCalledWith(
				"item-5",
				"glow",
				expect.any(Object),
			);

			dispatcher.destroy();
		});
	});

	describe("script API effect operations", () => {
		it("updates params by diff instead of reapplying", () => {
			const dispatcher = new EffectDispatcher({
				entityManager,
				bridge,
			});

			const effectId = dispatcher.applyScriptEffect("gem-1", "tint", {
				intensity: 0.2,
			});
			expect(effectId).not.toBe("");
			expect(bridge.applySpriteEffect).toHaveBeenCalledTimes(1);

			dispatcher.updateScriptEffectParam("gem-1", effectId, "intensity", 0.9);
			expect(bridge.applySpriteEffect).toHaveBeenCalledTimes(1);
			expect(bridge.updateSpriteEffectParam).toHaveBeenCalledTimes(1);
			expect(bridge.updateSpriteEffectParam).toHaveBeenCalledWith(
				"gem-1",
				"intensity",
				0.9,
			);

			dispatcher.clearScriptEffect("gem-1", effectId);
			expect(bridge.clearSpriteEffect).toHaveBeenCalledTimes(1);

			dispatcher.destroy();
		});

		it("script effects override declarative effects", () => {
			const dispatcher = new EffectDispatcher({
				entityManager,
				bridge,
			});

			// Add declarative effect via tag
			entityManager.addTag("gem-1", "held");
			expect(bridge.applySpriteEffect).toHaveBeenLastCalledWith(
				"gem-1",
				"glow",
				expect.any(Object),
			);

			(bridge.applySpriteEffect as ReturnType<typeof vi.fn>).mockClear();

			// Script effect should override
			dispatcher.applyScriptEffect("gem-1", "outline", { intensity: 1.0 });
			expect(bridge.applySpriteEffect).toHaveBeenLastCalledWith(
				"gem-1",
				"outline",
				expect.any(Object),
			);

			dispatcher.destroy();
		});

		it("clearing script effect falls back to declarative", () => {
			const dispatcher = new EffectDispatcher({
				entityManager,
				bridge,
			});

			entityManager.addTag("gem-1", "held");
			(bridge.applySpriteEffect as ReturnType<typeof vi.fn>).mockClear();
			(bridge.clearSpriteEffect as ReturnType<typeof vi.fn>).mockClear();

			const effectId = dispatcher.applyScriptEffect("gem-1", "outline", {});
			dispatcher.clearScriptEffect("gem-1", effectId);

			// Should fall back to declarative glow effect
			expect(bridge.applySpriteEffect).toHaveBeenCalledWith(
				"gem-1",
				"glow",
				expect.any(Object),
			);

			dispatcher.destroy();
		});

		it("supports multiple script effects with latest winning", () => {
			const dispatcher = new EffectDispatcher({
				entityManager,
				bridge,
			});

			dispatcher.applyScriptEffect("gem-1", "glow", { intensity: 0.3 });
			dispatcher.applyScriptEffect("gem-1", "outline", { intensity: 0.5 });

			// Last applied effect should be active
			expect(bridge.applySpriteEffect).toHaveBeenLastCalledWith(
				"gem-1",
				"outline",
				expect.any(Object),
			);

			dispatcher.destroy();
		});

		it("clears all script effects when no effectId provided", () => {
			const dispatcher = new EffectDispatcher({
				entityManager,
				bridge,
			});

			dispatcher.applyScriptEffect("gem-1", "glow", {});
			dispatcher.applyScriptEffect("gem-1", "outline", {});
			(bridge.applySpriteEffect as ReturnType<typeof vi.fn>).mockClear();

			dispatcher.clearScriptEffect("gem-1");
			expect(bridge.clearSpriteEffect).toHaveBeenCalledWith("gem-1");

			dispatcher.destroy();
		});

		it("returns empty string for non-existent entity", () => {
			const dispatcher = new EffectDispatcher({
				entityManager,
				bridge,
			});

			const effectId = dispatcher.applyScriptEffect("non-existent", "glow", {});
			expect(effectId).toBe("");

			dispatcher.destroy();
		});

		it("supports custom effect ID via params.id", () => {
			const dispatcher = new EffectDispatcher({
				entityManager,
				bridge,
			});

			const effectId = dispatcher.applyScriptEffect("gem-1", "glow", {
				id: "custom-effect-id",
			});
			expect(effectId).toBe("custom-effect-id");

			dispatcher.destroy();
		});
	});

	describe("entity lifecycle", () => {
		it("clears effects when entity is destroyed", () => {
			const dispatcher = new EffectDispatcher({
				entityManager,
				bridge,
			});

			entityManager.addTag("gem-1", "held");
			expect(bridge.applySpriteEffect).toHaveBeenCalled();

			entityManager.destroyEntity("gem-1");
			expect(bridge.clearSpriteEffect).toHaveBeenCalledWith("gem-1");

			dispatcher.destroy();
		});

		it("tracks entity count correctly", () => {
			const dispatcher = new EffectDispatcher({
				entityManager,
				bridge,
			});

			expect(dispatcher.getTrackedEntityCount()).toBe(0);

			entityManager.addTag("gem-1", "held");
			expect(dispatcher.getTrackedEntityCount()).toBe(1);

			entityManager.removeTag("gem-1", "held");
			expect(dispatcher.getTrackedEntityCount()).toBe(0);

			dispatcher.destroy();
		});

		it("clears all effects on dispatcher destroy", () => {
			const dispatcher = new EffectDispatcher({
				entityManager,
				bridge,
			});

			entityManager.addTag("gem-1", "held");
			expect(bridge.applySpriteEffect).toHaveBeenCalled();

			dispatcher.destroy();
			expect(bridge.clearSpriteEffect).toHaveBeenCalledWith("gem-1");
		});
	});

	describe("color normalization", () => {
		it("normalizes hex color to RGB tuple", () => {
			const dispatcher = new EffectDispatcher({
				entityManager,
				bridge,
			});

			entityManager.addTag("gem-1", "held");
			expect(bridge.applySpriteEffect).toHaveBeenCalledWith(
				"gem-1",
				"glow",
				expect.objectContaining({
					color: [1, 0.5333333333333333, 0], // #FF8800 normalized
				}),
			);

			dispatcher.destroy();
		});

		it("normalizes RGB tuple 0-255 to 0-1", () => {
			const em = new EntityManager({
				prefabs: {
					item: {
						id: "item",
						effectStates: [
							{
								when: { hasTag: "active" },
								priority: 1,
								effects: [
									{ effect: "glow", params: { color: [255, 128, 64] } },
								],
							},
						],
					},
				},
			} as Record<string, any>);
			em.loadEntities([
				{
					id: "item-color",
					name: "Item",
					prefab: "item",
					transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
				},
			] as any);

			const dispatcher = new EffectDispatcher({ entityManager: em, bridge });

			em.addTag("item-color", "active");
			expect(bridge.applySpriteEffect).toHaveBeenCalledWith(
				"item-color",
				"glow",
				expect.objectContaining({
					color: [1, 128 / 255, 64 / 255],
				}),
			);

			dispatcher.destroy();
		});

		it("preserves already-normalized RGB tuple", () => {
			const em = new EntityManager({
				prefabs: {
					item: {
						id: "item",
						effectStates: [
							{
								when: { hasTag: "active" },
								priority: 1,
								effects: [
									{ effect: "glow", params: { color: [0.5, 0.25, 0.1] } },
								],
							},
						],
					},
				},
			} as Record<string, any>);
			em.loadEntities([
				{
					id: "item-norm",
					name: "Item",
					prefab: "item",
					transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
				},
			] as any);

			const dispatcher = new EffectDispatcher({ entityManager: em, bridge });

			em.addTag("item-norm", "active");
			expect(bridge.applySpriteEffect).toHaveBeenCalledWith(
				"item-norm",
				"glow",
				expect.objectContaining({
					color: [0.5, 0.25, 0.1],
				}),
			);

			dispatcher.destroy();
		});
	});

	describe("precedence rules", () => {
		it("entity effects override prefab effects", () => {
			const em = new EntityManager({
				prefabs: {
					item: {
						id: "item",
						effects: [{ effect: "tint", params: { intensity: 0.3 } }],
						effectStates: [
							{
								when: { hasTag: "active" },
								priority: 1,
								effects: [{ effect: "glow", params: { intensity: 0.5 } }],
							},
						],
					},
				},
			} as Record<string, any>);
			em.loadEntities([
				{
					id: "item-prec",
					name: "Item",
					prefab: "item",
					effects: [{ effect: "outline", params: { intensity: 0.8 } }],
					transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
				},
			] as any);

			const dispatcher = new EffectDispatcher({ entityManager: em, bridge });

			// Entity effect should win over prefab base effect
			expect(bridge.applySpriteEffect).toHaveBeenCalledWith(
				"item-prec",
				"outline",
				expect.any(Object),
			);

			dispatcher.destroy();
		});

		it("higher priority effect state wins", () => {
			const em = new EntityManager({
				prefabs: {
					item: {
						id: "item",
						effectStates: [
							{
								when: { hasTag: "low" },
								priority: 1,
								effects: [{ effect: "tint", params: { intensity: 0.2 } }],
							},
							{
								when: { hasTag: "high" },
								priority: 10,
								effects: [{ effect: "glow", params: { intensity: 1.0 } }],
							},
						],
					},
				},
			} as Record<string, any>);
			em.loadEntities([
				{
					id: "item-prio",
					name: "Item",
					prefab: "item",
					transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
				},
			] as any);

			const dispatcher = new EffectDispatcher({ entityManager: em, bridge });

			em.addTag("item-prio", "low");
			expect(bridge.applySpriteEffect).toHaveBeenLastCalledWith(
				"item-prio",
				"tint",
				expect.any(Object),
			);

			em.addTag("item-prio", "high");
			expect(bridge.applySpriteEffect).toHaveBeenLastCalledWith(
				"item-prio",
				"glow",
				expect.any(Object),
			);

			dispatcher.destroy();
		});

		it("script effects have highest precedence", () => {
			const em = new EntityManager({
				prefabs: {
					item: {
						id: "item",
						effects: [{ effect: "tint", params: {} }],
						effectStates: [
							{
								when: { hasTag: "active" },
								priority: 100,
								effects: [{ effect: "glow", params: {} }],
							},
						],
					},
				},
			} as Record<string, any>);
			em.loadEntities([
				{
					id: "item-script",
					name: "Item",
					prefab: "item",
					transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
				},
			] as any);

			const dispatcher = new EffectDispatcher({ entityManager: em, bridge });

			em.addTag("item-script", "active");
			(bridge.applySpriteEffect as ReturnType<typeof vi.fn>).mockClear();

			dispatcher.applyScriptEffect("item-script", "outline", {});
			expect(bridge.applySpriteEffect).toHaveBeenLastCalledWith(
				"item-script",
				"outline",
				expect.any(Object),
			);

			dispatcher.destroy();
		});
	});

	describe("diffing behavior", () => {
		it("reapplies when effect type changes", () => {
			const dispatcher = new EffectDispatcher({
				entityManager,
				bridge,
			});

			dispatcher.applyScriptEffect("gem-1", "glow", { intensity: 0.5 });
			(bridge.applySpriteEffect as ReturnType<typeof vi.fn>).mockClear();

			dispatcher.applyScriptEffect("gem-1", "outline", { intensity: 0.5 });
			expect(bridge.applySpriteEffect).toHaveBeenCalledTimes(1);

			dispatcher.destroy();
		});

		it("reapplies when param is removed", () => {
			const em = new EntityManager({
				prefabs: {
					item: {
						id: "item",
						effectStates: [
							{
								when: { hasTag: "a" },
								priority: 1,
								effects: [{ effect: "glow", params: { intensity: 0.5 } }],
							},
							{
								when: { hasTag: "b" },
								priority: 2,
								effects: [{ effect: "glow", params: {} }],
							},
						],
					},
				},
			} as Record<string, any>);
			em.loadEntities([
				{
					id: "item-diff",
					name: "Item",
					prefab: "item",
					transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
				},
			] as any);

			const dispatcher = new EffectDispatcher({ entityManager: em, bridge });

			em.addTag("item-diff", "a");
			(bridge.applySpriteEffect as ReturnType<typeof vi.fn>).mockClear();

			em.addTag("item-diff", "b");
			// Higher priority state has no intensity param, should reapply
			expect(bridge.applySpriteEffect).toHaveBeenCalledTimes(1);

			dispatcher.destroy();
		});

		it("updates individual params when only values change", () => {
			const dispatcher = new EffectDispatcher({
				entityManager,
				bridge,
			});

			const effectId = dispatcher.applyScriptEffect("gem-1", "glow", {
				intensity: 0.5,
				color: "#FF0000",
			});
			(bridge.applySpriteEffect as ReturnType<typeof vi.fn>).mockClear();

			dispatcher.updateScriptEffectParam("gem-1", effectId, "intensity", 0.8);
			expect(bridge.updateSpriteEffectParam).toHaveBeenCalledWith(
				"gem-1",
				"intensity",
				0.8,
			);
			expect(bridge.applySpriteEffect).not.toHaveBeenCalled();

			dispatcher.destroy();
		});
	});
});
