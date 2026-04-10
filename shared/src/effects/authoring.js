import { normalizeAIOutput } from './normalizer';
import { validateGraph } from './validator';
import { compileGraph } from './compiler';
export function authorGraph(raw, registry, options) {
    const normResult = normalizeAIOutput(raw, registry);
    if (!normResult.success) {
        return { success: false, errors: normResult.errors };
    }
    const graph = normResult.graph;
    const validationResult = validateGraph(graph, {
        platformTier: options?.platformTier,
    });
    if (!validationResult.valid) {
        return { success: false, graph, errors: validationResult.errors };
    }
    const compileResult = compileGraph(graph, {
        platformTier: options?.platformTier,
    });
    if (!compileResult.success) {
        return { success: false, graph, errors: compileResult.errors };
    }
    return {
        success: true,
        plan: compileResult.plan,
        graph,
        errors: [],
    };
}
//# sourceMappingURL=authoring.js.map