import type { PenPadding, PenSizing } from "@slopcade/shared/types/pen";
export interface LayoutRect {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface LayoutNode {
    node: import("@slopcade/shared/types/pen").PenNode;
    rect: LayoutRect;
    children: LayoutNode[];
    clip: boolean;
}
export type SizingSpec = {
    kind: "fixed";
    value: number;
} | {
    kind: "fill_container";
    fallback: number | null;
} | {
    kind: "fit_content";
    fallback: number | null;
} | {
    kind: "auto";
};
export declare function parseSizing(s: PenSizing | undefined): SizingSpec;
export declare function parsePadding(p: PenPadding | undefined): [number, number, number, number];
//# sourceMappingURL=layout-core.d.ts.map