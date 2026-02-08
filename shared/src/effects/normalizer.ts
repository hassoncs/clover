import type {
  EffectGraphSpec,
  EffectNode,
  Connection,
  FeedbackEdge,
  ParamValue,
  NodeFamily,
  BufferFormat,
  ResolutionMode,
  FusibilityFlag,
} from './types';
import type { ManifestRegistry } from './registry';

export type NormalizationErrorCode =
  | 'E_PARSE_FAILED'
  | 'E_UNKNOWN_NODE_TYPE'
  | 'E_INVALID_PARAM_SHAPE'
  | 'E_MISSING_REQUIRED_FIELD'
  | 'E_INVALID_CONNECTION'
  | 'E_CANONICALIZATION_FAILED';

export interface NormalizationError {
  code: NormalizationErrorCode;
  message: string;
  path?: string;
}

export interface NormalizationResult {
  success: boolean;
  graph?: EffectGraphSpec;
  errors: NormalizationError[];
}

const REQUIRED_TOP_LEVEL_FIELDS = ['id', 'version', 'scope', 'nodes', 'connections'] as const;
const VALID_SCOPES = new Set(['screen', 'entity']);
const VALID_FAMILIES: Set<string> = new Set(['generator', 'filter', 'combiner']);
const VALID_FORMATS: Set<string> = new Set(['rgba8', 'rgba16f']);
const VALID_RESOLUTIONS: Set<string> = new Set(['full', 'half', 'quarter', 'custom']);
const VALID_FUSIBILITY: Set<string> = new Set(['always', 'conditional', 'never']);
const NUMERIC_PARAM_TYPES = new Set(['float', 'int', 'vec2', 'vec3', 'vec4', 'color']);
const BOOL_PARAM_TYPES = new Set(['bool']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseStructure(raw: unknown): { obj: Record<string, unknown> | null; errors: NormalizationError[] } {
  const errors: NormalizationError[] = [];

  if (!isRecord(raw)) {
    errors.push({ code: 'E_PARSE_FAILED', message: 'Input must be a non-null object' });
    return { obj: null, errors };
  }

  const missingFields = REQUIRED_TOP_LEVEL_FIELDS.filter((f) => !(f in raw));
  if (missingFields.length > 0) {
    for (const field of missingFields) {
      errors.push({
        code: 'E_MISSING_REQUIRED_FIELD',
        message: `Missing required field "${field}"`,
        path: field,
      });
    }
    return { obj: null, errors };
  }

  if (!Array.isArray(raw.nodes)) {
    errors.push({ code: 'E_PARSE_FAILED', message: '"nodes" must be an array', path: 'nodes' });
    return { obj: null, errors };
  }

  if (!Array.isArray(raw.connections)) {
    errors.push({ code: 'E_PARSE_FAILED', message: '"connections" must be an array', path: 'connections' });
    return { obj: null, errors };
  }

  if (!VALID_SCOPES.has(raw.scope as string)) {
    errors.push({ code: 'E_PARSE_FAILED', message: `Invalid scope "${String(raw.scope)}", expected "screen" or "entity"`, path: 'scope' });
    return { obj: null, errors };
  }

  return { obj: raw, errors };
}

function validateNodeTypes(
  nodes: unknown[],
  registry: ManifestRegistry,
  errors: NormalizationError[],
): boolean {
  let valid = true;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!isRecord(node)) {
      errors.push({ code: 'E_PARSE_FAILED', message: `Node at index ${i} is not an object`, path: `nodes[${i}]` });
      valid = false;
      continue;
    }
    const rawType = String(node.type ?? '');
    const resolved = registry.has(rawType) ? rawType : registry.resolveAlias(rawType);
    if (!resolved || !registry.has(resolved)) {
      errors.push({
        code: 'E_UNKNOWN_NODE_TYPE',
        message: `Unknown node type "${rawType}" at nodes[${i}]`,
        path: `nodes[${i}].type`,
      });
      valid = false;
    }
  }
  return valid;
}

function validateParamShapes(
  nodes: unknown[],
  registry: ManifestRegistry,
  errors: NormalizationError[],
): boolean {
  let valid = true;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i] as Record<string, unknown>;
    const rawType = String(node.type ?? '');
    const resolvedType = registry.has(rawType) ? rawType : registry.resolveAlias(rawType);
    if (!resolvedType) continue;
    const reg = registry.get(resolvedType);
    if (!reg) continue;

    const params = isRecord(node.params) ? node.params : {};
    for (const schema of reg.paramsSchema) {
      const val = params[schema.name];
      if (val === undefined) continue;

      if (NUMERIC_PARAM_TYPES.has(schema.type) && typeof val !== 'number') {
        errors.push({
          code: 'E_INVALID_PARAM_SHAPE',
          message: `Parameter "${schema.name}" on node "${String(node.id)}" expected number, got ${typeof val}`,
          path: `nodes[${i}].params.${schema.name}`,
        });
        valid = false;
      }
      if (BOOL_PARAM_TYPES.has(schema.type) && typeof val !== 'boolean') {
        errors.push({
          code: 'E_INVALID_PARAM_SHAPE',
          message: `Parameter "${schema.name}" on node "${String(node.id)}" expected boolean, got ${typeof val}`,
          path: `nodes[${i}].params.${schema.name}`,
        });
        valid = false;
      }
    }
  }
  return valid;
}

function validateConnections(
  connections: unknown[],
  nodeIds: Set<string>,
  errors: NormalizationError[],
): boolean {
  let valid = true;
  for (let i = 0; i < connections.length; i++) {
    const conn = connections[i] as Record<string, unknown>;
    if (!isRecord(conn) || !isRecord(conn.from) || !isRecord(conn.to)) {
      errors.push({ code: 'E_INVALID_CONNECTION', message: `Connection at index ${i} has invalid structure`, path: `connections[${i}]` });
      valid = false;
      continue;
    }
    const from = conn.from as Record<string, unknown>;
    const to = conn.to as Record<string, unknown>;

    if (!nodeIds.has(String(from.nodeId))) {
      errors.push({
        code: 'E_INVALID_CONNECTION',
        message: `Connection[${i}] references non-existent source node "${String(from.nodeId)}"`,
        path: `connections[${i}].from.nodeId`,
      });
      valid = false;
    }
    if (!nodeIds.has(String(to.nodeId))) {
      errors.push({
        code: 'E_INVALID_CONNECTION',
        message: `Connection[${i}] references non-existent target node "${String(to.nodeId)}"`,
        path: `connections[${i}].to.nodeId`,
      });
      valid = false;
    }
  }
  return valid;
}

function clampNumber(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function canonicalizeNode(
  raw: Record<string, unknown>,
  registry: ManifestRegistry,
): EffectNode {
  const rawType = String(raw.type);
  const resolvedType = registry.has(rawType) ? rawType : registry.resolveAlias(rawType)!;
  const reg = registry.get(resolvedType)!;

  const rawParams = isRecord(raw.params) ? raw.params : {};
  const params: Record<string, ParamValue> = {};

  for (const schema of reg.paramsSchema) {
    let val = rawParams[schema.name];
    if (val === undefined) {
      val = schema.defaultValue;
    }

    if (typeof val === 'number' && schema.range) {
      val = clampNumber(val, schema.range.min, schema.range.max);
    }
    if (typeof val === 'string') {
      val = val.trim();
    }
    params[schema.name] = val as ParamValue;
  }

  for (const [key, val] of Object.entries(rawParams)) {
    if (!(key in params)) {
      if (typeof val === 'string') {
        params[key] = val.trim();
      } else {
        params[key] = val as ParamValue;
      }
    }
  }

  const rawOutput = isRecord(raw.outputTarget)
    ? raw.outputTarget
    : { bufferId: `${String(raw.id)}-out`, format: 'rgba8', resolution: 'full' };

  const family = VALID_FAMILIES.has(String(raw.family))
    ? (String(raw.family) as NodeFamily)
    : reg.family;

  const rawFlags = isRecord(raw.flags) ? raw.flags : {};

  return {
    id: String(raw.id),
    type: resolvedType,
    family,
    inputSlots: Array.isArray(raw.inputSlots)
      ? (raw.inputSlots as EffectNode['inputSlots'])
      : reg.inputSlots.map((s) => ({
          name: s.name,
          dataType: s.dataType as EffectNode['inputSlots'][number]['dataType'],
          connectedTo: null,
        })),
    params,
    outputTarget: {
      bufferId: String(rawOutput.bufferId ?? `${String(raw.id)}-out`),
      format: VALID_FORMATS.has(String(rawOutput.format))
        ? (String(rawOutput.format) as BufferFormat)
        : 'rgba8',
      resolution: VALID_RESOLUTIONS.has(String(rawOutput.resolution))
        ? (String(rawOutput.resolution) as ResolutionMode)
        : 'full',
    },
    flags: {
      stateful: typeof rawFlags.stateful === 'boolean' ? rawFlags.stateful : false,
      fusible: VALID_FUSIBILITY.has(String(rawFlags.fusible))
        ? (String(rawFlags.fusible) as FusibilityFlag)
        : 'conditional',
    },
  };
}

function canonicalizeConnection(raw: Record<string, unknown>): Connection {
  const from = raw.from as Record<string, unknown>;
  const to = raw.to as Record<string, unknown>;
  return {
    from: { nodeId: String(from.nodeId), output: String(from.output) },
    to: { nodeId: String(to.nodeId), input: String(to.input) },
  };
}

function connectionSortKey(conn: Connection): string {
  return `${conn.from.nodeId}:${conn.from.output}->${conn.to.nodeId}:${conn.to.input}`;
}

function feedbackEdgeSortKey(fb: FeedbackEdge): string {
  return `${fb.from.nodeId}:${fb.from.output}->${fb.to.nodeId}:${fb.to.input}`;
}

export function normalizeAIOutput(raw: unknown, registry: ManifestRegistry): NormalizationResult {
  const { obj, errors: parseErrors } = parseStructure(raw);
  if (!obj) {
    return { success: false, errors: parseErrors };
  }
  const errors: NormalizationError[] = [...parseErrors];

  const rawNodes = obj.nodes as unknown[];
  const rawConnections = obj.connections as unknown[];

  const nodeTypeValid = validateNodeTypes(rawNodes, registry, errors);
  if (!nodeTypeValid) {
    return { success: false, errors };
  }

  const paramValid = validateParamShapes(rawNodes, registry, errors);
  if (!paramValid) {
    return { success: false, errors };
  }

  const nodeIds = new Set(rawNodes.map((n) => String((n as Record<string, unknown>).id)));
  const connValid = validateConnections(rawConnections, nodeIds, errors);
  if (!connValid) {
    return { success: false, errors };
  }

  const nodes = rawNodes
    .map((n) => canonicalizeNode(n as Record<string, unknown>, registry))
    .sort((a, b) => a.id.localeCompare(b.id));

  const connections = rawConnections
    .map((c) => canonicalizeConnection(c as Record<string, unknown>))
    .sort((a, b) => connectionSortKey(a).localeCompare(connectionSortKey(b)));

  const rawFeedback = Array.isArray(obj.feedbackEdges) ? obj.feedbackEdges : [];
  const feedbackEdges = (rawFeedback as FeedbackEdge[])
    .slice()
    .sort((a, b) => feedbackEdgeSortKey(a).localeCompare(feedbackEdgeSortKey(b)));

  const rawLifecycle = isRecord(obj.lifecycle) ? obj.lifecycle : {};
  const lifecycle = {
    autoStart: typeof rawLifecycle.autoStart === 'boolean' ? rawLifecycle.autoStart : true,
    stopMode: (rawLifecycle.stopMode === 'freeze' ? 'freeze' : 'clear') as 'freeze' | 'clear',
  };

  const graph: EffectGraphSpec = {
    id: String(obj.id),
    version: String(obj.version),
    engineApiVersion: String(obj.engineApiVersion ?? '1.0.0'),
    scope: obj.scope as 'screen' | 'entity',
    nodes,
    connections,
    feedbackEdges,
    lifecycle,
  };

  return { success: true, graph, errors: [] };
}
