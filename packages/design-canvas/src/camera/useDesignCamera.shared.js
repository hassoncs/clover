import { useCallback, useState } from "react";
export const INITIAL_CAMERA = {
    translateX: 0,
    translateY: 0,
    scale: 1,
};
export const MIN_SCALE = 0.05;
export const MAX_SCALE = 10;
export function useDesignCameraShared() {
    const [camera, setCamera] = useState(INITIAL_CAMERA);
    const resetCamera = useCallback(() => {
        setCamera(INITIAL_CAMERA);
    }, []);
    const zoomToFit = useCallback((frames, viewportWidth, viewportHeight) => {
        if (frames.length === 0)
            return;
        // Calculate bounding box of all frames
        const minX = Math.min(...frames.map((f) => f.position.x));
        const minY = Math.min(...frames.map((f) => f.position.y));
        const maxX = Math.max(...frames.map((f) => f.position.x + f.width));
        const maxY = Math.max(...frames.map((f) => f.position.y + f.height));
        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        if (contentWidth === 0 || contentHeight === 0)
            return;
        // Scale to fit with 10% padding
        const scaleX = (viewportWidth * 0.9) / contentWidth;
        const scaleY = (viewportHeight * 0.9) / contentHeight;
        const newScale = Math.max(MIN_SCALE, Math.min(scaleX, scaleY, 2)); // cap at 2x
        // Center the content
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const translateX = viewportWidth / 2 - centerX * newScale;
        const translateY = viewportHeight / 2 - centerY * newScale;
        setCamera({ translateX, translateY, scale: newScale });
    }, []);
    return {
        camera,
        setCamera,
        resetCamera,
        zoomToFit,
    };
}
//# sourceMappingURL=useDesignCamera.shared.js.map