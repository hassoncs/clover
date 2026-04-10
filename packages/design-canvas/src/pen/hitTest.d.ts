import type { DesignCamera } from "../camera/useDesignCamera.shared";
import type { LayoutNode } from "./layout";
export declare function hitTestLayoutTree(layoutNodes: LayoutNode[], worldX: number, worldY: number): string[] | null;
export declare function screenToWorldPen(screenX: number, screenY: number, camera: DesignCamera): {
    x: number;
    y: number;
};
//# sourceMappingURL=hitTest.d.ts.map