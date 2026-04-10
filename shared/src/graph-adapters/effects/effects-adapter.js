const NODE_CATALOG = [
    {
        type: "noise",
        label: "Noise",
        category: "generator",
        defaultPorts: [{ id: "output", direction: "output", dataType: "texture" }],
    },
    {
        type: "gradient",
        label: "Gradient",
        category: "generator",
        defaultPorts: [{ id: "output", direction: "output", dataType: "texture" }],
    },
    {
        type: "solidColor",
        label: "Solid Color",
        category: "generator",
        defaultPorts: [{ id: "output", direction: "output", dataType: "texture" }],
    },
    {
        type: "blur",
        label: "Blur",
        category: "filter",
        defaultPorts: [
            { id: "input", direction: "input", dataType: "texture" },
            { id: "output", direction: "output", dataType: "texture" },
        ],
    },
    {
        type: "glow",
        label: "Glow",
        category: "filter",
        defaultPorts: [
            { id: "input", direction: "input", dataType: "texture" },
            { id: "output", direction: "output", dataType: "texture" },
        ],
    },
    {
        type: "outline",
        label: "Outline",
        category: "filter",
        defaultPorts: [
            { id: "input", direction: "input", dataType: "texture" },
            { id: "output", direction: "output", dataType: "texture" },
        ],
    },
    {
        type: "pixelate",
        label: "Pixelate",
        category: "filter",
        defaultPorts: [
            { id: "input", direction: "input", dataType: "texture" },
            { id: "output", direction: "output", dataType: "texture" },
        ],
    },
    {
        type: "chromaticAberration",
        label: "Chromatic Aberration",
        category: "filter",
        defaultPorts: [
            { id: "input", direction: "input", dataType: "texture" },
            { id: "output", direction: "output", dataType: "texture" },
        ],
    },
    {
        type: "tint",
        label: "Tint",
        category: "filter",
        defaultPorts: [
            { id: "input", direction: "input", dataType: "texture" },
            { id: "output", direction: "output", dataType: "texture" },
        ],
    },
    {
        type: "blend",
        label: "Blend",
        category: "combiner",
        defaultPorts: [
            { id: "inputA", direction: "input", dataType: "texture" },
            { id: "inputB", direction: "input", dataType: "texture" },
            { id: "output", direction: "output", dataType: "texture" },
        ],
    },
    {
        type: "composite",
        label: "Composite",
        category: "combiner",
        defaultPorts: [
            { id: "inputA", direction: "input", dataType: "texture" },
            { id: "inputB", direction: "input", dataType: "texture" },
            { id: "output", direction: "output", dataType: "texture" },
        ],
    },
    {
        type: "ramp",
        label: "Ramp",
        category: "generator",
        defaultPorts: [{ id: "output", direction: "output", dataType: "texture" }],
    },
    {
        type: "lfo",
        label: "LFO",
        category: "generator",
        defaultPorts: [{ id: "output", direction: "output", dataType: "texture" }],
    },
    {
        type: "constantColor",
        label: "Constant Color",
        category: "generator",
        defaultPorts: [{ id: "output", direction: "output", dataType: "texture" }],
    },
    {
        type: "circle",
        label: "Circle",
        category: "generator",
        defaultPorts: [{ id: "output", direction: "output", dataType: "texture" }],
    },
    {
        type: "rectangle",
        label: "Rectangle",
        category: "generator",
        defaultPorts: [{ id: "output", direction: "output", dataType: "texture" }],
    },
    {
        type: "level",
        label: "Level",
        category: "filter",
        defaultPorts: [
            { id: "input", direction: "input", dataType: "texture" },
            { id: "output", direction: "output", dataType: "texture" },
        ],
    },
    {
        type: "transform",
        label: "Transform",
        category: "filter",
        defaultPorts: [
            { id: "input", direction: "input", dataType: "texture" },
            { id: "output", direction: "output", dataType: "texture" },
        ],
    },
    {
        type: "displace",
        label: "Displace",
        category: "filter",
        defaultPorts: [
            { id: "input", direction: "input", dataType: "texture" },
            { id: "output", direction: "output", dataType: "texture" },
        ],
    },
    {
        type: "lookup",
        label: "Lookup",
        category: "filter",
        defaultPorts: [
            { id: "input", direction: "input", dataType: "texture" },
            { id: "output", direction: "output", dataType: "texture" },
        ],
    },
    {
        type: "math",
        label: "Math",
        category: "filter",
        defaultPorts: [
            { id: "input", direction: "input", dataType: "texture" },
            { id: "output", direction: "output", dataType: "texture" },
        ],
    },
    {
        type: "threshold",
        label: "Threshold",
        category: "filter",
        defaultPorts: [
            { id: "input", direction: "input", dataType: "texture" },
            { id: "output", direction: "output", dataType: "texture" },
        ],
    },
    {
        type: "hsvAdjust",
        label: "HSV Adjust",
        category: "filter",
        defaultPorts: [
            { id: "input", direction: "input", dataType: "texture" },
            { id: "output", direction: "output", dataType: "texture" },
        ],
    },
    {
        type: "edge",
        label: "Edge Detect",
        category: "filter",
        defaultPorts: [
            { id: "input", direction: "input", dataType: "texture" },
            { id: "output", direction: "output", dataType: "texture" },
        ],
    },
    {
        type: "channelMix",
        label: "Channel Mix",
        category: "filter",
        defaultPorts: [
            { id: "input", direction: "input", dataType: "texture" },
            { id: "output", direction: "output", dataType: "texture" },
        ],
    },
    {
        type: "crossFade",
        label: "Cross Fade",
        category: "filter",
        defaultPorts: [
            { id: "input", direction: "input", dataType: "texture" },
            { id: "output", direction: "output", dataType: "texture" },
        ],
    },
    {
        type: "over",
        label: "Over",
        category: "filter",
        defaultPorts: [
            { id: "input", direction: "input", dataType: "texture" },
            { id: "output", direction: "output", dataType: "texture" },
        ],
    },
    {
        type: "mirror",
        label: "Mirror",
        category: "filter",
        defaultPorts: [
            { id: "input", direction: "input", dataType: "texture" },
            { id: "output", direction: "output", dataType: "texture" },
        ],
    },
    {
        type: "crop",
        label: "Crop",
        category: "filter",
        defaultPorts: [
            { id: "input", direction: "input", dataType: "texture" },
            { id: "output", direction: "output", dataType: "texture" },
        ],
    },
    {
        type: "resize",
        label: "Resize",
        category: "filter",
        defaultPorts: [
            { id: "input", direction: "input", dataType: "texture" },
            { id: "output", direction: "output", dataType: "texture" },
        ],
    },
    {
        type: "invert",
        label: "Invert",
        category: "filter",
        defaultPorts: [
            { id: "input", direction: "input", dataType: "texture" },
            { id: "output", direction: "output", dataType: "texture" },
        ],
    },
    {
        type: "emboss",
        label: "Emboss",
        category: "filter",
        defaultPorts: [
            { id: "input", direction: "input", dataType: "texture" },
            { id: "output", direction: "output", dataType: "texture" },
        ],
    },
    {
        type: "sharpen",
        label: "Sharpen",
        category: "filter",
        defaultPorts: [
            { id: "input", direction: "input", dataType: "texture" },
            { id: "output", direction: "output", dataType: "texture" },
        ],
    },
    {
        type: "convolve",
        label: "Convolve",
        category: "filter",
        defaultPorts: [
            { id: "input", direction: "input", dataType: "texture" },
            { id: "output", direction: "output", dataType: "texture" },
        ],
    },
    {
        type: "kaleidoscope",
        label: "Kaleidoscope",
        category: "filter",
        defaultPorts: [
            { id: "input", direction: "input", dataType: "texture" },
            { id: "output", direction: "output", dataType: "texture" },
        ],
    },
    {
        type: "duotone",
        label: "Duotone",
        category: "filter",
        defaultPorts: [
            { id: "input", direction: "input", dataType: "texture" },
            { id: "output", direction: "output", dataType: "texture" },
        ],
    },
    {
        type: "gradientMap",
        label: "Gradient Map",
        category: "filter",
        defaultPorts: [
            { id: "input", direction: "input", dataType: "texture" },
            { id: "output", direction: "output", dataType: "texture" },
        ],
    },
    {
        type: "filmGrain",
        label: "Film Grain",
        category: "filter",
        defaultPorts: [
            { id: "input", direction: "input", dataType: "texture" },
            { id: "output", direction: "output", dataType: "texture" },
        ],
    },
    {
        type: "barrelDistort",
        label: "Barrel Distort",
        category: "filter",
        defaultPorts: [
            { id: "input", direction: "input", dataType: "texture" },
            { id: "output", direction: "output", dataType: "texture" },
        ],
    },
    {
        type: "mosaic",
        label: "Mosaic",
        category: "filter",
        defaultPorts: [
            { id: "input", direction: "input", dataType: "texture" },
            { id: "output", direction: "output", dataType: "texture" },
        ],
    },
];
const INSPECTOR_CONFIGS = {
    blur: {
        nodeType: "blur",
        sections: [
            {
                label: "Parameters",
                fields: [
                    { key: "radius", label: "Radius", type: "number", min: 0, max: 64 },
                ],
            },
        ],
    },
    glow: {
        nodeType: "glow",
        sections: [
            {
                label: "Parameters",
                fields: [
                    {
                        key: "intensity",
                        label: "Intensity",
                        type: "number",
                        min: 0,
                        max: 5,
                    },
                    { key: "radius", label: "Radius", type: "number", min: 0, max: 64 },
                    { key: "color", label: "Color", type: "color" },
                ],
            },
        ],
    },
    outline: {
        nodeType: "outline",
        sections: [
            {
                label: "Parameters",
                fields: [
                    {
                        key: "thickness",
                        label: "Thickness",
                        type: "number",
                        min: 0,
                        max: 16,
                    },
                    { key: "color", label: "Color", type: "color" },
                ],
            },
        ],
    },
    pixelate: {
        nodeType: "pixelate",
        sections: [
            {
                label: "Parameters",
                fields: [
                    {
                        key: "pixelSize",
                        label: "Pixel Size",
                        type: "number",
                        min: 1,
                        max: 64,
                    },
                ],
            },
        ],
    },
    chromaticAberration: {
        nodeType: "chromaticAberration",
        sections: [
            {
                label: "Parameters",
                fields: [
                    { key: "offset", label: "Offset", type: "number", min: 0, max: 20 },
                ],
            },
        ],
    },
    tint: {
        nodeType: "tint",
        sections: [
            {
                label: "Parameters",
                fields: [
                    { key: "color", label: "Color", type: "color" },
                    {
                        key: "intensity",
                        label: "Intensity",
                        type: "number",
                        min: 0,
                        max: 1,
                    },
                ],
            },
        ],
    },
    noise: {
        nodeType: "noise",
        sections: [
            {
                label: "Parameters",
                fields: [
                    { key: "scale", label: "Scale", type: "number", min: 0.1, max: 100 },
                    { key: "speed", label: "Speed", type: "number", min: 0, max: 10 },
                ],
            },
        ],
    },
    gradient: {
        nodeType: "gradient",
        sections: [
            {
                label: "Parameters",
                fields: [
                    { key: "colorA", label: "Color A", type: "color" },
                    { key: "colorB", label: "Color B", type: "color" },
                    {
                        key: "angle",
                        label: "Angle",
                        type: "number",
                        min: 0,
                        max: 360,
                    },
                ],
            },
        ],
    },
    solidColor: {
        nodeType: "solidColor",
        sections: [
            {
                label: "Parameters",
                fields: [{ key: "color", label: "Color", type: "color" }],
            },
        ],
    },
    blend: {
        nodeType: "blend",
        sections: [
            {
                label: "Parameters",
                fields: [
                    {
                        key: "mode",
                        label: "Blend Mode",
                        type: "select",
                        options: [
                            { label: "Normal", value: "normal" },
                            { label: "Additive", value: "additive" },
                            { label: "Multiply", value: "multiply" },
                            { label: "Screen", value: "screen" },
                        ],
                    },
                    {
                        key: "opacity",
                        label: "Opacity",
                        type: "number",
                        min: 0,
                        max: 1,
                    },
                ],
            },
        ],
    },
    composite: {
        nodeType: "composite",
        sections: [
            {
                label: "Parameters",
                fields: [
                    {
                        key: "operation",
                        label: "Operation",
                        type: "select",
                        options: [
                            { label: "Over", value: "over" },
                            { label: "Under", value: "under" },
                            { label: "Mask", value: "mask" },
                        ],
                    },
                ],
            },
        ],
    },
};
function effectNodeToPorts(node) {
    const ports = [];
    for (const slot of node.inputSlots) {
        ports.push({
            id: slot.name,
            direction: "input",
            dataType: slot.dataType,
        });
    }
    const outputs = node.outputs ?? [
        { name: "output", bufferId: node.outputTarget.bufferId },
    ];
    for (const out of outputs) {
        ports.push({
            id: out.name,
            direction: "output",
            dataType: "texture",
        });
    }
    return ports;
}
function detectCycle(nodeIds, adjacency) {
    const visited = new Set();
    const inStack = new Set();
    function dfs(nodeId) {
        visited.add(nodeId);
        inStack.add(nodeId);
        for (const neighbor of adjacency.get(nodeId) ?? []) {
            if (!visited.has(neighbor)) {
                if (dfs(neighbor))
                    return true;
            }
            else if (inStack.has(neighbor)) {
                return true;
            }
        }
        inStack.delete(nodeId);
        return false;
    }
    for (const nodeId of nodeIds) {
        if (!visited.has(nodeId)) {
            if (dfs(nodeId))
                return true;
        }
    }
    return false;
}
export class EffectsGraphAdapter {
    id = "effects";
    name = "Effects Graph Adapter";
    toGeneric(spec) {
        const nodes = {};
        for (const [i, node] of spec.nodes.entries()) {
            nodes[node.id] = {
                id: node.id,
                type: node.type,
                position: { x: i * 200, y: 0 },
                ports: effectNodeToPorts(node),
                data: {
                    family: node.family,
                    params: node.params,
                    flags: node.flags,
                    outputTarget: node.outputTarget,
                    inputSlotMeta: node.inputSlots.map((s) => ({
                        name: s.name,
                        dataType: s.dataType,
                    })),
                    version: spec.version,
                    engineApiVersion: spec.engineApiVersion,
                    scope: spec.scope,
                    lifecycle: spec.lifecycle,
                    ...(node.paramsSchema ? { paramsSchema: node.paramsSchema } : {}),
                },
            };
        }
        const edges = {};
        for (const [i, conn] of spec.connections.entries()) {
            const edgeId = `edge-${conn.from.nodeId}-${conn.from.output}-${conn.to.nodeId}-${conn.to.input}`;
            edges[edgeId] = {
                id: edgeId,
                from: { nodeId: conn.from.nodeId, portId: conn.from.output },
                to: { nodeId: conn.to.nodeId, portId: conn.to.input },
            };
        }
        return {
            id: spec.id,
            nodes,
            edges,
            viewport: { pan: { x: 0, y: 0 }, zoom: 1 },
        };
    }
    fromGeneric(doc) {
        const nodeEntries = Object.values(doc.nodes);
        const edgeEntries = Object.values(doc.edges);
        const edgesByTarget = new Map();
        for (const edge of edgeEntries) {
            const key = edge.to.nodeId;
            const existing = edgesByTarget.get(key) ?? [];
            existing.push(edge);
            edgesByTarget.set(key, existing);
        }
        let version = "1.0.0";
        let engineApiVersion = "1.0.0";
        let scope = "screen";
        let lifecycle = {
            autoStart: true,
            stopMode: "freeze",
        };
        const firstNode = nodeEntries[0];
        if (firstNode) {
            const d = firstNode.data;
            if (d.version)
                version = d.version;
            if (d.engineApiVersion)
                engineApiVersion = d.engineApiVersion;
            if (d.scope === "screen" || d.scope === "entity")
                scope = d.scope;
            if (d.lifecycle) {
                const stopMode = d.lifecycle.stopMode === "clear"
                    ? "clear"
                    : "freeze";
                lifecycle = { autoStart: d.lifecycle.autoStart, stopMode };
            }
        }
        const nodes = nodeEntries.map((gNode) => {
            const d = gNode.data;
            const incomingEdges = edgesByTarget.get(gNode.id) ?? [];
            const inputSlots = (d.inputSlotMeta ?? []).map((meta) => {
                const matchingEdge = incomingEdges.find((e) => e.to.portId === meta.name);
                return {
                    name: meta.name,
                    dataType: meta.dataType,
                    connectedTo: matchingEdge
                        ? {
                            nodeId: matchingEdge.from.nodeId,
                            output: matchingEdge.from.portId,
                        }
                        : null,
                };
            });
            const outputPorts = gNode.ports.filter((p) => p.direction === "output");
            const outputs = outputPorts.map((p) => ({
                name: p.id,
                bufferId: d.outputTarget?.bufferId ?? `${gNode.id}-out`,
            }));
            return {
                id: gNode.id,
                type: gNode.type,
                family: d.family,
                inputSlots,
                params: (d.params ?? {}),
                outputTarget: d.outputTarget ?? {
                    bufferId: `${gNode.id}-out`,
                    format: "rgba8",
                    resolution: "full",
                },
                outputs,
                flags: d.flags ?? { stateful: false, fusible: "always" },
                ...(d.paramsSchema
                    ? {
                        paramsSchema: d.paramsSchema,
                    }
                    : {}),
            };
        });
        const connections = edgeEntries.map((edge) => ({
            from: { nodeId: edge.from.nodeId, output: edge.from.portId },
            to: { nodeId: edge.to.nodeId, input: edge.to.portId },
        }));
        return {
            id: doc.id,
            version,
            engineApiVersion,
            scope,
            nodes,
            connections,
            feedbackEdges: [],
            lifecycle,
        };
    }
    validateDomain(spec) {
        const errors = [];
        const nodeIds = new Set(spec.nodes.map((n) => n.id));
        for (const conn of spec.connections) {
            if (!nodeIds.has(conn.from.nodeId)) {
                errors.push({
                    code: "DOMAIN_CONSTRAINT",
                    message: `Connection source node "${conn.from.nodeId}" not found`,
                    nodeId: conn.from.nodeId,
                });
            }
            if (!nodeIds.has(conn.to.nodeId)) {
                errors.push({
                    code: "DOMAIN_CONSTRAINT",
                    message: `Connection target node "${conn.to.nodeId}" not found`,
                    nodeId: conn.to.nodeId,
                });
            }
        }
        if (errors.length > 0) {
            return { valid: false, errors };
        }
        const adjacency = new Map();
        for (const id of nodeIds) {
            adjacency.set(id, []);
        }
        for (const conn of spec.connections) {
            adjacency.get(conn.from.nodeId).push(conn.to.nodeId);
        }
        if (detectCycle([...nodeIds], adjacency)) {
            errors.push({
                code: "DOMAIN_CONSTRAINT",
                message: "Cycle detected in effect graph connections",
            });
        }
        return { valid: errors.length === 0, errors };
    }
    getNodeCatalog() {
        return NODE_CATALOG;
    }
    getInspectorConfig(nodeType) {
        const config = INSPECTOR_CONFIGS[nodeType];
        if (config)
            return config;
        const inCatalog = NODE_CATALOG.some((entry) => entry.type === nodeType);
        if (inCatalog) {
            return {
                nodeType,
                sections: [{ label: "Parameters", fields: [] }],
            };
        }
        return null;
    }
}
//# sourceMappingURL=effects-adapter.js.map