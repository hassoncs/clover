import { useCallback, useRef } from "react";
import type { UseDesignCameraResult } from "./useDesignCamera";
import {
	MAX_SCALE,
	MIN_SCALE,
	useDesignCameraShared,
} from "./useDesignCamera.shared";

export function useDesignCamera(): UseDesignCameraResult {
	const { camera, setCamera, resetCamera, zoomToFit } = useDesignCameraShared();
	const isDraggingRef = useRef(false);
	const lastMousePosRef = useRef({ x: 0, y: 0 });

	const onWheel = useCallback(
		(e: React.WheelEvent) => {
			e.preventDefault();

			const delta = e.deltaY;
			const scaleFactor = 0.999 ** delta;
			const oldScale = camera.scale;
			const newScale = Math.max(
				MIN_SCALE,
				Math.min(MAX_SCALE, oldScale * scaleFactor),
			);

			if (newScale === oldScale) return;

			// Zoom toward cursor position
			// We need the cursor position relative to the canvas element
			// For now, we'll assume the event target is the canvas or we use clientX/Y
			// and adjust by the bounding rect if needed.
			// In a real app, we'd pass the rect or use a ref to the container.
			const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
			const cursorX = e.clientX - rect.left;
			const cursorY = e.clientY - rect.top;

			const translateX =
				cursorX - (cursorX - camera.translateX) * (newScale / oldScale);
			const translateY =
				cursorY - (cursorY - camera.translateY) * (newScale / oldScale);

			setCamera({ translateX, translateY, scale: newScale });
		},
		[camera, setCamera],
	);

	const onMouseDown = useCallback((e: React.MouseEvent) => {
		if (e.button !== 0 && e.button !== 1) return; // Only left or middle click
		isDraggingRef.current = true;
		lastMousePosRef.current = { x: e.clientX, y: e.clientY };
	}, []);

	const onMouseMove = useCallback(
		(e: React.MouseEvent) => {
			if (!isDraggingRef.current) return;

			const dx = e.clientX - lastMousePosRef.current.x;
			const dy = e.clientY - lastMousePosRef.current.y;

			setCamera((prev) => ({
				...prev,
				translateX: prev.translateX + dx,
				translateY: prev.translateY + dy,
			}));

			lastMousePosRef.current = { x: e.clientX, y: e.clientY };
		},
		[setCamera],
	);

	const onMouseUp = useCallback(() => {
		isDraggingRef.current = false;
	}, []);

	return {
		camera,
		setCamera,
		resetCamera,
		zoomToFit,
		onWheel,
		onMouseDown,
		onMouseMove,
		onMouseUp,
	};
}
