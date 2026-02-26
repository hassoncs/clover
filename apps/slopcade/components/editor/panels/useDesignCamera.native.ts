import { useCallback, useRef } from "react";
import {
	MAX_SCALE,
	MIN_SCALE,
	useDesignCameraShared,
} from "./useDesignCamera.shared";

export function useDesignCamera() {
	const { camera, setCamera, resetCamera, zoomToFit } = useDesignCameraShared();
	const lastScaleRef = useRef(1);
	const lastTranslateRef = useRef({ x: 0, y: 0 });

	// For native, we'll return the camera and actions.
	// The actual gesture handling will be done via GestureDetector in the component
	// that uses this hook, but we can provide the logic to update the camera.

	const handlePanUpdate = useCallback(
		(translationX: number, translationY: number) => {
			setCamera((prev) => ({
				...prev,
				translateX:
					prev.translateX + (translationX - lastTranslateRef.current.x),
				translateY:
					prev.translateY + (translationY - lastTranslateRef.current.y),
			}));
			lastTranslateRef.current = { x: translationX, y: translationY };
		},
		[setCamera],
	);

	const handlePanStart = useCallback(() => {
		lastTranslateRef.current = { x: 0, y: 0 };
	}, []);

	const handlePinchUpdate = useCallback(
		(scale: number, focalX: number, focalY: number) => {
			const oldScale = camera.scale;
			const scaleFactor = scale / lastScaleRef.current;
			const newScale = Math.max(
				MIN_SCALE,
				Math.min(MAX_SCALE, oldScale * scaleFactor),
			);

			if (newScale === oldScale) return;

			const translateX =
				focalX - (focalX - camera.translateX) * (newScale / oldScale);
			const translateY =
				focalY - (focalY - camera.translateY) * (newScale / oldScale);

			setCamera({ translateX, translateY, scale: newScale });
			lastScaleRef.current = scale;
		},
		[camera, setCamera],
	);

	const handlePinchStart = useCallback(() => {
		lastScaleRef.current = 1;
	}, []);

	return {
		camera,
		setCamera,
		resetCamera,
		zoomToFit,
		handlePanStart,
		handlePanUpdate,
		handlePinchStart,
		handlePinchUpdate,
	};
}
