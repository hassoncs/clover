import type { PenNode } from "@slopcade/shared/types/pen";
import type { TextMeasureFn } from "./text-measure";
export type { LayoutNode, LayoutRect, SizingSpec } from "./layout-core";
export { parsePadding, parseSizing } from "./layout-core";
export declare function subscribeLayoutReady(fn: () => void): () => void;
import type { LayoutNode } from "./layout-core";
export declare function layoutTree(nodes: PenNode[], textMeasure: TextMeasureFn): LayoutNode[];
//# sourceMappingURL=layout.d.ts.map