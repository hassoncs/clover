const REQUIRED_TOP_LEVEL_FIELDS = ['id', 'version', 'scope', 'nodes', 'connections'];
const VALID_SCOPES = new Set(['screen', 'entity']);
const VALID_FAMILIES = new Set(['generator', 'filter', 'combiner']);
const VALID_FORMATS = new Set(['rgba8', 'rgba16f']);
const VALID_RESOLUTIONS = new Set(['full', 'half', 'quarter', 'custom']);
const VALID_FUSIBILITY = new Set(['always', 'conditional', 'never']);
const NUMERIC_PARAM_TYPES = new Set(['float', 'int', 'vec2', 'vec3', 'vec4', 'color']);
const BOOL_PARAM_TYPES = new Set(['bool']);
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function parseStructure(raw) {
    const errors = [];
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
    if (!VALID_SCOPES.has(raw.scope)) {
        errors.push({ code: 'E_PARSE_FAILED', message: `Invalid scope "${String(raw.scope)}", expected "screen" or "entity"`, path: 'scope' });
        return { obj: null, errors };
    }
    return { obj: raw, errors };
}
function validateNodeTypes(nodes, registry, errors) {
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
function validateParamShapes(nodes, registry, errors) {
    let valid = true;
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const rawType = String(node.type ?? '');
        const resolvedType = registry.has(rawType) ? rawType : registry.resolveAlias(rawType);
        if (!resolvedType)
            continue;
        const reg = registry.get(resolvedType);
        if (!reg)
            continue;
        const params = isRecord(node.params) ? node.params : {};
        for (const schema of reg.paramsSchema) {
            const val = params[schema.name];
            if (val === undefined)
                continue;
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
function validateConnections(connections, nodeIds, errors) {
    let valid = true;
    for (let i = 0; i < connections.length; i++) {
        const conn = connections[i];
        if (!isRecord(conn) || !isRecord(conn.from) || !isRecord(conn.to)) {
            errors.push({ code: 'E_INVALID_CONNECTION', message: `Connection at index ${i} has invalid structure`, path: `connections[${i}]` });
            valid = false;
            continue;
        }
        const from = conn.from;
        const to = conn.to;
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
function clampNumber(val, min, max) {
    return Math.min(max, Math.max(min, val));
}
function canonicalizeNode(raw, registry) {
    const rawType = String(raw.type);
    const resolvedType = registry.has(rawType) ? rawType : registry.resolveAlias(rawType);
    const reg = registry.get(resolvedType);
    const rawParams = isRecord(raw.params) ? raw.params : {};
    const params = {};
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
        params[schema.name] = val;
    }
    for (const [key, val] of Object.entries(rawParams)) {
        if (!(key in params)) {
            if (typeof val === 'string') {
                params[key] = val.trim();
            }
            else {
                params[key] = val;
            }
        }
    }
    const rawOutput = isRecord(raw.outputTarget)
        ? raw.outputTarget
        : { bufferId: `${String(raw.id)}-out`, format: 'rgba8', resolution: 'full' };
    const family = VALID_FAMILIES.has(String(raw.family))
        ? String(raw.family)
        : reg.family;
    const rawFlags = isRecord(raw.flags) ? raw.flags : {};
    return {
        id: String(raw.id),
        type: resolvedType,
        family,
        inputSlots: Array.isArray(raw.inputSlots)
            ? raw.inputSlots
            : reg.inputSlots.map((s) => ({
                name: s.name,
                dataType: s.dataType,
                connectedTo: null,
            })),
        params,
        outputTarget: {
            bufferId: String(rawOutput.bufferId ?? `${String(raw.id)}-out`),
            format: VALID_FORMATS.has(String(rawOutput.format))
                ? String(rawOutput.format)
                : 'rgba8',
            resolution: VALID_RESOLUTIONS.has(String(rawOutput.resolution))
                ? String(rawOutput.resolution)
                : 'full',
        },
        flags: {
            stateful: typeof rawFlags.stateful === 'boolean' ? rawFlags.stateful : false,
            fusible: VALID_FUSIBILITY.has(String(rawFlags.fusible))
                ? String(rawFlags.fusible)
                : 'conditional',
        },
    };
}
function canonicalizeConnection(raw) {
    const from = raw.from;
    const to = raw.to;
    return {
        from: { nodeId: String(from.nodeId), output: String(from.output) },
        to: { nodeId: String(to.nodeId), input: String(to.input) },
    };
}
function connectionSortKey(conn) {
    return `${conn.from.nodeId}:${conn.from.output}->${conn.to.nodeId}:${conn.to.input}`;
}
function feedbackEdgeSortKey(fb) {
    return `${fb.from.nodeId}:${fb.from.output}->${fb.to.nodeId}:${fb.to.input}`;
}
export function normalizeAIOutput(raw, registry) {
    const { obj, errors: parseErrors } = parseStructure(raw);
    if (!obj) {
        return { success: false, errors: parseErrors };
    }
    const errors = [...parseErrors];
    const rawNodes = obj.nodes;
    const rawConnections = obj.connections;
    const nodeTypeValid = validateNodeTypes(rawNodes, registry, errors);
    if (!nodeTypeValid) {
        return { success: false, errors };
    }
    const paramValid = validateParamShapes(rawNodes, registry, errors);
    if (!paramValid) {
        return { success: false, errors };
    }
    const nodeIds = new Set(rawNodes.map((n) => String(n.id)));
    const connValid = validateConnections(rawConnections, nodeIds, errors);
    if (!connValid) {
        return { success: false, errors };
    }
    const nodes = rawNodes
        .map((n) => canonicalizeNode(n, registry))
        .sort((a, b) => a.id.localeCompare(b.id));
    const connections = rawConnections
        .map((c) => canonicalizeConnection(c))
        .sort((a, b) => connectionSortKey(a).localeCompare(connectionSortKey(b)));
    const rawFeedback = Array.isArray(obj.feedbackEdges) ? obj.feedbackEdges : [];
    const feedbackEdges = rawFeedback
        .slice()
        .sort((a, b) => feedbackEdgeSortKey(a).localeCompare(feedbackEdgeSortKey(b)));
    const rawLifecycle = isRecord(obj.lifecycle) ? obj.lifecycle : {};
    const lifecycle = {
        autoStart: typeof rawLifecycle.autoStart === 'boolean' ? rawLifecycle.autoStart : true,
        stopMode: (rawLifecycle.stopMode === 'freeze' ? 'freeze' : 'clear'),
    };
    const graph = {
        id: String(obj.id),
        version: String(obj.version),
        engineApiVersion: String(obj.engineApiVersion ?? '1.0.0'),
        scope: obj.scope,
        nodes,
        connections,
        feedbackEdges,
        lifecycle,
    };
    return { success: true, graph, errors: [] };
}
//# sourceMappingURL=normalizer.js.map