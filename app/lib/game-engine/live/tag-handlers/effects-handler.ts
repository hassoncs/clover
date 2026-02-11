import type {
	CompiledPlan,
	EffectGraphSpec as EffectGraph,
} from "@slopcade/shared/effects";
import { compileGraph } from "@slopcade/shared/effects";
import type { TagHotReloadHandler } from "./types";

type EffectsPayload = {
	graphs?: Record<string, EffectGraph>;
	plans?: Record<string, CompiledPlan>;
	shaders: Record<string, string>;
};

function compilePlans(
	graphs: Record<string, EffectGraph> | undefined,
	label: "old" | "new" | "reload",
): Record<string, CompiledPlan> | null {
	if (!graphs || Object.keys(graphs).length === 0) {
		return {};
	}

	const compiled: Record<string, CompiledPlan> = {};

	for (const [graphId, graph] of Object.entries(graphs)) {
		const result = compileGraph(graph);
		if (!result.success || !result.plan) {
			const errorText = result.errors.map((error) => error.message).join(", ");
			console.error(
				`[effects-handler] Failed to compile ${label} graph '${graphId}': ${errorText}`,
			);
			return null;
		}

		compiled[graphId] = result.plan;
	}

	return compiled;
}

function selectPrimaryPlan(
	plans: Record<string, CompiledPlan> | undefined,
): CompiledPlan | null {
	if (!plans) {
		return null;
	}

	const keys = Object.keys(plans).sort((a, b) => a.localeCompare(b));
	if (keys.length === 0) {
		return null;
	}

	return plans[keys[0]] ?? null;
}

function extractStructureSignature(plan: CompiledPlan): unknown {
	const planWithOptionalTopology = plan as CompiledPlan & {
		topologyHash?: string;
	};

	return {
		topologyHash: planWithOptionalTopology.topologyHash,
		resourceMap: plan.resourceMap,
		feedbackPolicies: plan.feedbackPolicies,
		passes: plan.passes.map((pass) => ({
			id: pass.id,
			requires: pass.requires,
			provides: pass.provides,
			params: pass.params,
			persistence: pass.persistence,
			qualityTier: pass.qualityTier,
			constraints: pass.constraints,
		})),
	};
}

function hasStructuralPlanChange(
	oldPlan: CompiledPlan | null,
	newPlan: CompiledPlan | null,
): boolean {
	if (!oldPlan && !newPlan) {
		return false;
	}

	if (!oldPlan || !newPlan) {
		return true;
	}

	const oldSignature = extractStructureSignature(oldPlan);
	const newSignature = extractStructureSignature(newPlan);

	return JSON.stringify(oldSignature) !== JSON.stringify(newSignature);
}

function getChangedShaders(
	oldShaders: Record<string, string>,
	newShaders: Record<string, string>,
): Array<[shaderId: string, source: string]> {
	const changed: Array<[string, string]> = [];

	for (const [shaderId, source] of Object.entries(newShaders)) {
		if (oldShaders[shaderId] !== source) {
			changed.push([shaderId, source]);
		}
	}

	return changed;
}

export const effectsHandler: TagHotReloadHandler<EffectsPayload> = {
	canHotSwap(_oldHash, _newHash, context) {
		return context.mode === "edit";
	},

	async hotSwap(oldPayload, newPayload, context) {
		const oldCompiledPlans =
			oldPayload.plans ?? compilePlans(oldPayload.graphs, "old");
		if (oldCompiledPlans === null) {
			return;
		}

		const newCompiledPlans =
			newPayload.plans ?? compilePlans(newPayload.graphs, "new");
		if (newCompiledPlans === null) {
			return;
		}

		const oldPlan = selectPrimaryPlan(oldCompiledPlans);
		const newPlan = selectPrimaryPlan(newCompiledPlans);
		const structuralChanged = hasStructuralPlanChange(oldPlan, newPlan);

		if (structuralChanged && newPlan) {
			try {
				await context.bridge.applyGraph(newPlan);
			} catch (error) {
				console.error(
					"[effects-handler] Failed to apply compiled graph",
					error,
				);
			}
			return;
		}

		const changedShaders = getChangedShaders(
			oldPayload.shaders,
			newPayload.shaders,
		);

		for (const [shaderId, source] of changedShaders) {
			context.bridge.hotSwapShader(shaderId, source);
		}
	},

	async fullReload(payload, context) {
		const compiledPlans =
			payload.plans ?? compilePlans(payload.graphs, "reload");
		if (compiledPlans === null) {
			return;
		}

		const nextPlan = selectPrimaryPlan(compiledPlans);
		if (nextPlan) {
			try {
				await context.bridge.applyGraph(nextPlan);
				return;
			} catch (error) {
				console.error(
					"[effects-handler] Failed to apply compiled graph during full reload",
					error,
				);
				return;
			}
		}

		for (const [shaderId, source] of Object.entries(payload.shaders)) {
			context.bridge.hotSwapShader(shaderId, source);
		}
	},
};
