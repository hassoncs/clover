import type { DesignFrame } from "@slopcade/shared";
export interface DesignCamera {
    translateX: number;
    translateY: number;
    scale: number;
}
export declare const INITIAL_CAMERA: DesignCamera;
export declare const MIN_SCALE = 0.05;
export declare const MAX_SCALE = 10;
export declare function useDesignCameraShared(): {
    camera: DesignCamera;
    setCamera: import("react").Dispatch<import("react").SetStateAction<DesignCamera>>;
    resetCamera: () => void;
    zoomToFit: (frames: DesignFrame[], viewportWidth: number, viewportHeight: number) => void;
};
//# sourceMappingURL=useDesignCamera.shared.d.ts.map