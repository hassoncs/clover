import type { DesignDocument, DesignElement } from "@slopcade/shared";
export type CanvasOp = {
    type: "addFrame";
    id?: string;
    title?: string;
    width?: number;
    height?: number;
    x?: number;
    y?: number;
} | {
    type: "updateFrame";
    id: string;
    patch: Record<string, unknown>;
} | {
    type: "deleteFrame";
    id: string;
} | {
    type: "addElement";
    frameId: string;
    element: Omit<DesignElement, "id"> & {
        id?: string;
    };
} | {
    type: "updateElement";
    frameId: string;
    elementId: string;
    patch: Record<string, unknown>;
} | {
    type: "deleteElement";
    frameId: string;
    elementId: string;
};
/**
 * Apply a batch of canvas operations to a DesignDocument.
 * Pure function — returns a new document, never mutates input.
 */
export declare function applyCanvasOps(doc: DesignDocument, ops: CanvasOp[]): DesignDocument;
//# sourceMappingURL=canvasOps.d.ts.map