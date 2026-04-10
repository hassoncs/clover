import type { DesignDocument } from "@slopcade/shared";
import type { SnapLine } from "../interactions/useDesignInteractions";
export interface DesignCanvasRendererProps {
    document: DesignDocument;
    camera: {
        translateX: number;
        translateY: number;
        scale: number;
    };
    selectedFrameId: string | null;
    selectedElementId: string | null;
    selectedElementIds?: string[];
    onElementTap?: (frameId: string, elementId: string | null, shiftKey?: boolean) => void;
    width: number;
    height: number;
    snapLines?: SnapLine[];
    showGrid?: boolean;
}
export declare function DesignCanvasRenderer({ document, camera, selectedFrameId, selectedElementId, selectedElementIds, onElementTap, width, height, snapLines, showGrid, }: DesignCanvasRendererProps): import("react/jsx-runtime").JSX.Element;
export default DesignCanvasRenderer;
//# sourceMappingURL=DesignCanvasRenderer.d.ts.map