import type { DesignCamera } from "../camera/useDesignCamera.shared";
import type { PenPath } from "@slopcade/shared/types/pen";
export interface PenAnchor {
    docX: number;
    docY: number;
    handleInDocX: number;
    handleInDocY: number;
    handleOutDocX: number;
    handleOutDocY: number;
}
export interface PenDrawingState {
    anchors: PenAnchor[];
    cursorDocX: number | null;
    cursorDocY: number | null;
    isDraggingHandle: boolean;
}
export declare const EMPTY_PEN_STATE: PenDrawingState;
export declare function screenToDoc(screenX: number, screenY: number, camera: DesignCamera): [number, number];
export declare function buildPathGeometry(anchors: PenAnchor[], closed: boolean): string;
export declare function buildPathNode(anchors: PenAnchor[], closed: boolean): PenPath | null;
//# sourceMappingURL=penToolState.d.ts.map