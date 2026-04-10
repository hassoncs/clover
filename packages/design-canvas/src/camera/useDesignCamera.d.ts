import type { DesignFrame } from "@slopcade/shared";
import type { DesignCamera } from "./useDesignCamera.shared";
export interface UseDesignCameraResult {
    camera: DesignCamera;
    setCamera: (camera: DesignCamera | ((prev: DesignCamera) => DesignCamera)) => void;
    zoomToFit: (frames: DesignFrame[], viewportWidth: number, viewportHeight: number) => void;
    resetCamera: () => void;
    onWheel?: (e: any) => void;
    onMouseDown?: (e: any) => void;
    onMouseMove?: (e: any) => void;
    onMouseUp?: (e: any) => void;
    handlePanStart?: () => void;
    handlePanUpdate?: (translationX: number, translationY: number) => void;
    handlePinchStart?: () => void;
    handlePinchUpdate?: (scale: number, focalX: number, focalY: number) => void;
}
export declare function useDesignCamera(): UseDesignCameraResult;
//# sourceMappingURL=useDesignCamera.d.ts.map