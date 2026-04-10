import type { DesignDocument } from "@slopcade/shared";
export interface SnapLine {
    axis: "x" | "y";
    position: number;
}
export interface InteractionState {
    isDragging: boolean;
    isResizing: boolean;
    isRotating: boolean;
    snapLines: SnapLine[];
    showGrid: boolean;
    liveDocument: DesignDocument | null;
    onMouseDown: (e: any) => void;
    onMouseMove: (e: any) => void;
    onMouseUp: (e: any) => void;
    onMouseLeave: (e: any) => void;
}
export declare function useDesignInteractions(params: {
    document: DesignDocument | null;
    camera: {
        translateX: number;
        translateY: number;
        scale: number;
    };
    selectedFrameId: string | null;
    selectedElementId: string | null;
    selectedElementIds?: string[];
    saveDesignDocument: (doc: DesignDocument) => void;
    cameraHandlers: {
        onMouseDown: (e: any) => void;
        onMouseMove: (e: any) => void;
        onMouseUp: (e: any) => void;
    };
}): InteractionState;
//# sourceMappingURL=useDesignInteractions.d.ts.map