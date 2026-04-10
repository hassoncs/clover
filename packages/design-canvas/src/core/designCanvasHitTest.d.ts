import type { DesignDocument } from "@slopcade/shared";
export type HitTestResult = {
    frameId: string;
    elementId: string;
} | {
    frameId: string;
    elementId: null;
} | {
    frameId: null;
    elementId: null;
};
export declare function hitTestDesignCanvas(frames: DesignDocument["frames"], worldX: number, worldY: number): HitTestResult;
export declare function screenToWorld(screenX: number, screenY: number, camera: {
    translateX: number;
    translateY: number;
    scale: number;
}): {
    worldX: number;
    worldY: number;
};
//# sourceMappingURL=designCanvasHitTest.d.ts.map