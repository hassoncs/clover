import type {
  BufferFormat,
  ResolutionMode,
  EffectGraphSpec,
  Connection,
  FeedbackEdge,
  EffectNode,
} from './types';

// ---------------------------------------------------------------------------
// Scope target — where the effect graph applies
// ---------------------------------------------------------------------------

export type ScopeTarget =
  | { type: 'screen' }
  | { type: 'entity'; entityId: string };

// ---------------------------------------------------------------------------
// Resource kind — what type of resource this is
// ---------------------------------------------------------------------------

export type ResourceKind = 'screenColor' | 'entityTexture' | 'intermediate' | 'feedback';

// ---------------------------------------------------------------------------
// Resource node — explicit resource in the graph
// ---------------------------------------------------------------------------

export interface ResourceNode {
  id: string;
  kind: ResourceKind;
  format: BufferFormat;
  resolution: ResolutionMode;
  customWidth?: number;
  customHeight?: number;
  providedBy: string | null;
  consumedBy: string[];
}

// ---------------------------------------------------------------------------
// Resource binding — maps a pass input/output to a resource
// ---------------------------------------------------------------------------

export interface ResourceBinding {
  passId: string;
  direction: 'input' | 'output';
  slotName: string;
  resourceId: string;
}

// ---------------------------------------------------------------------------
// Resource graph — the complete resource allocation plan
// ---------------------------------------------------------------------------

export interface ResourceGraph {
  scope: ScopeTarget;
  resources: Map<string, ResourceNode>;
  bindings: ResourceBinding[];
}

// ---------------------------------------------------------------------------
// Resolution errors
// ---------------------------------------------------------------------------

export type ResourceResolutionErrorCode =
  | 'E_RESOURCE_UNRESOLVED'
  | 'E_FORMAT_MISMATCH'
  | 'E_RESOLUTION_MISMATCH'
  | 'E_DUPLICATE_PROVIDER';

export interface ResourceResolutionError {
  code: ResourceResolutionErrorCode;
  message: string;
  resourceId?: string;
  nodeIds?: string[];
}

export interface ResourceResolutionResult {
  success: boolean;
  graph?: ResourceGraph;
  errors: ResourceResolutionError[];
}

// ---------------------------------------------------------------------------
// Format & resolution compatibility
// ---------------------------------------------------------------------------

export function areFormatsCompatible(source: BufferFormat, target: BufferFormat): boolean {
  if (source === target) return true;
  if (source === 'rgba16f' && target === 'rgba8') return true;
  return false;
}

export function areResolutionsCompatible(source: ResolutionMode, target: ResolutionMode): boolean {
  if (source === target) return true;
  const order: Record<ResolutionMode, number> = { full: 0, half: 1, quarter: 2, custom: -1 };
  if (source === 'custom' || target === 'custom') return false;
  return order[source] <= order[target];
}

export function resolveEffectiveResolution(
  mode: ResolutionMode,
  customWidth?: number,
  customHeight?: number,
): { widthScale: number; heightScale: number } {
  switch (mode) {
    case 'full':
      return { widthScale: 1.0, heightScale: 1.0 };
    case 'half':
      return { widthScale: 0.5, heightScale: 0.5 };
    case 'quarter':
      return { widthScale: 0.25, heightScale: 0.25 };
    case 'custom':
      return {
        widthScale: customWidth ?? 1.0,
        heightScale: customHeight ?? 1.0,
      };
  }
}

// ---------------------------------------------------------------------------
// Resource ID generation — deterministic from node + output name
// ---------------------------------------------------------------------------

function makeResourceId(nodeId: string, outputName: string): string {
  return `${nodeId}:${outputName}`;
}

function makeImplicitInputId(scope: 'screen' | 'entity'): string {
  return scope === 'screen' ? '__screenColor' : '__entityTexture';
}

function makeFeedbackResourceId(fromNodeId: string, toNodeId: string): string {
  return `__feedback:${fromNodeId}->${toNodeId}`;
}

// ---------------------------------------------------------------------------
// buildResourceGraph — build a resource graph from an EffectGraphSpec
// ---------------------------------------------------------------------------

export function buildResourceGraph(spec: EffectGraphSpec): ResourceResolutionResult {
  const errors: ResourceResolutionError[] = [];
  const resources = new Map<string, ResourceNode>();
  const bindings: ResourceBinding[] = [];

  const scope: ScopeTarget =
    spec.scope === 'screen'
      ? { type: 'screen' }
      : { type: 'entity', entityId: '' };

  const nodeMap = new Map<string, EffectNode>();
  for (const node of spec.nodes) {
    nodeMap.set(node.id, node);
  }

  const implicitInputId = makeImplicitInputId(spec.scope);
  const implicitKind: ResourceKind = spec.scope === 'screen' ? 'screenColor' : 'entityTexture';
  resources.set(implicitInputId, {
    id: implicitInputId,
    kind: implicitKind,
    format: 'rgba8',
    resolution: 'full',
    providedBy: null,
    consumedBy: [],
  });

  const outputResourceMap = new Map<string, string>();

  for (const node of spec.nodes) {
    const resId = makeResourceId(node.id, node.outputTarget.bufferId);

    if (resources.has(resId)) {
      errors.push({
        code: 'E_DUPLICATE_PROVIDER',
        message: `Resource '${resId}' already has a provider`,
        resourceId: resId,
        nodeIds: [resources.get(resId)!.providedBy!, node.id],
      });
      continue;
    }

    resources.set(resId, {
      id: resId,
      kind: 'intermediate',
      format: node.outputTarget.format,
      resolution: node.outputTarget.resolution,
      customWidth: node.outputTarget.customWidth,
      customHeight: node.outputTarget.customHeight,
      providedBy: node.id,
      consumedBy: [],
    });

    const outputKey = `${node.id}:${node.outputTarget.bufferId}`;
    outputResourceMap.set(outputKey, resId);

    bindings.push({
      passId: node.id,
      direction: 'output',
      slotName: node.outputTarget.bufferId,
      resourceId: resId,
    });
  }

  for (const fb of spec.feedbackEdges) {
    const feedbackResId = makeFeedbackResourceId(fb.from.nodeId, fb.to.nodeId);

    resources.set(feedbackResId, {
      id: feedbackResId,
      kind: 'feedback',
      format: fb.policy.bufferFormat,
      resolution: 'full',
      providedBy: fb.from.nodeId,
      consumedBy: [fb.to.nodeId],
    });

    bindings.push({
      passId: fb.from.nodeId,
      direction: 'output',
      slotName: fb.from.output,
      resourceId: feedbackResId,
    });

    bindings.push({
      passId: fb.to.nodeId,
      direction: 'input',
      slotName: fb.to.input,
      resourceId: feedbackResId,
    });
  }

  for (const conn of spec.connections) {
    const sourceKey = `${conn.from.nodeId}:${conn.from.output}`;
    const sourceResId = outputResourceMap.get(sourceKey);

    if (!sourceResId) {
      errors.push({
        code: 'E_RESOURCE_UNRESOLVED',
        message: `Input '${conn.to.input}' on node '${conn.to.nodeId}' connects to non-existent output '${conn.from.output}' on node '${conn.from.nodeId}'`,
        resourceId: sourceKey,
        nodeIds: [conn.from.nodeId, conn.to.nodeId],
      });
      continue;
    }

    const sourceResource = resources.get(sourceResId)!;
    const targetNode = nodeMap.get(conn.to.nodeId);

    if (targetNode) {
      const targetSlot = targetNode.inputSlots.find((s) => s.name === conn.to.input);
      if (targetSlot && targetSlot.dataType === 'texture') {
        const targetOutputFormat = targetNode.outputTarget.format;
        if (!areFormatsCompatible(sourceResource.format, targetOutputFormat)) {
          errors.push({
            code: 'E_FORMAT_MISMATCH',
            message: `Format mismatch: source '${conn.from.nodeId}' outputs ${sourceResource.format} but target '${conn.to.nodeId}' expects compatible format (has ${targetOutputFormat})`,
            resourceId: sourceResId,
            nodeIds: [conn.from.nodeId, conn.to.nodeId],
          });
        }

        if (
          !areResolutionsCompatible(sourceResource.resolution, targetNode.outputTarget.resolution)
        ) {
          errors.push({
            code: 'E_RESOLUTION_MISMATCH',
            message: `Resolution mismatch: source '${conn.from.nodeId}' outputs ${sourceResource.resolution} but target '${conn.to.nodeId}' has ${targetNode.outputTarget.resolution}`,
            resourceId: sourceResId,
            nodeIds: [conn.from.nodeId, conn.to.nodeId],
          });
        }
      }
    }

    sourceResource.consumedBy.push(conn.to.nodeId);

    bindings.push({
      passId: conn.to.nodeId,
      direction: 'input',
      slotName: conn.to.input,
      resourceId: sourceResId,
    });
  }

  for (const node of spec.nodes) {
    for (const slot of node.inputSlots) {
      const isFeedbackInput = spec.feedbackEdges.some(
        (fb) => fb.to.nodeId === node.id && fb.to.input === slot.name,
      );
      if (isFeedbackInput) continue;

      const isConnected = spec.connections.some(
        (c) => c.to.nodeId === node.id && c.to.input === slot.name,
      );
      if (isConnected) continue;

      const hasBinding = bindings.some(
        (b) => b.passId === node.id && b.direction === 'input' && b.slotName === slot.name,
      );
      if (!hasBinding) {
        const implicitResource = resources.get(implicitInputId);
        if (implicitResource) {
          implicitResource.consumedBy.push(node.id);
          bindings.push({
            passId: node.id,
            direction: 'input',
            slotName: slot.name,
            resourceId: implicitInputId,
          });
        }
      }
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    graph: { scope, resources, bindings },
    errors: [],
  };
}
