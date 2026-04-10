// Shared types and utilities used by both layout.ts (native) and layout.web.ts (web).
// Keeping these in a separate file avoids circular imports caused by Metro's
// .web.ts platform extension resolution.
export function parseSizing(s) {
    if (s === undefined)
        return { kind: "auto" };
    if (typeof s === "number")
        return { kind: "fixed", value: s };
    if (s === "fill_container")
        return { kind: "fill_container", fallback: null };
    if (s === "fit_content")
        return { kind: "fit_content", fallback: null };
    const fillMatch = s.match(/^fill_container\((\d+(?:\.\d+)?)\)$/);
    if (fillMatch)
        return { kind: "fill_container", fallback: parseFloat(fillMatch[1]) };
    const fitMatch = s.match(/^fit_content\((\d+(?:\.\d+)?)\)$/);
    if (fitMatch)
        return { kind: "fit_content", fallback: parseFloat(fitMatch[1]) };
    return { kind: "auto" };
}
export function parsePadding(p) {
    if (p === undefined)
        return [0, 0, 0, 0];
    if (typeof p === "number")
        return [p, p, p, p];
    if (p.length === 2)
        return [p[0], p[1], p[0], p[1]];
    const q = p;
    return [q[0], q[1], q[2], q[3]];
}
//# sourceMappingURL=layout-core.js.map