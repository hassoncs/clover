import type { DesignFrame } from "@slopcade/protocol/design";
import type { DesignCamera } from "./useDesignCamera.shared";

export interface UseDesignCameraResult {
	camera: DesignCamera;
	setCamera: (
		camera: DesignCamera | ((prev: DesignCamera) => DesignCamera),
	) => void;
	zoomToFit: (
		frames: DesignFrame[],
		viewportWidth: number,
		viewportHeight: number,
	) => void;
	resetCamera: () => void;
	// Web event handlers
	onWheel?: (e: any) => void;
	onMouseDown?: (e: any) => void;
	onMouseMove?: (e: any) => void;
	onMouseUp?: (e: any) => void;
	// Native event handlers/logic
	handlePanStart?: () => void;
	handlePanUpdate?: (translationX: number, translationY: number) => void;
	handlePinchStart?: () => void;
	handlePinchUpdate?: (scale: number, focalX: number, focalY: number) => void;
}

export function useDesignCamera(): UseDesignCameraResult {
	throw new Error(
		"useDesignCamera should be implemented by platform-specific files",
	);
}
