import type { EffectGraphSpec, CompiledPlan, ParamValue } from '@slopcade/shared/effects';
import { compileGraph } from '@slopcade/shared/effects';

/**
 * Wraps a single sprite effect as a minimal EffectGraphSpec with one node.
 * This helper bridges sprite effect calls to graph-based approach.
 */
export function createSingleEffectGraph(
  effectType: string,
  params: Record<string, ParamValue> = {}
): EffectGraphSpec {
  const nodeId = `${effectType}_node`;
  const bufferId = `${effectType}_buffer`;

  return {
    id: `single_${effectType}`,
    version: '1.0.0',
    engineApiVersion: '2.0.0',
    scope: 'entity',
    nodes: [
      {
        id: nodeId,
        type: effectType,
        family: 'filter',
        inputSlots: [
          {
            name: 'input',
            dataType: 'texture',
            connectedTo: null,
          },
        ],
        params,
        outputTarget: {
          bufferId,
          format: 'rgba8',
          resolution: 'full',
        },
        flags: {
          stateful: false,
          fusible: 'conditional',
        },
      },
    ],
    connections: [],
    feedbackEdges: [],
    lifecycle: {
      autoStart: true,
      stopMode: 'clear',
    },
  };
}

/**
 * Compiles a single sprite effect into a CompiledPlan ready for bridge.applyGraph()
 */
export function compileSingleEffect(
  effectType: string,
  params: Record<string, ParamValue> = {}
): CompiledPlan {
  const graph = createSingleEffectGraph(effectType, params);
  const result = compileGraph(graph);

  if (!result.success) {
    throw new Error(`Failed to compile effect ${effectType}: ${result.errors.map(e => e.message).join(', ')}`);
  }

  if (!result.plan) {
    throw new Error(`Compiler returned success but no plan for effect ${effectType}`);
  }

  return result.plan;
}
