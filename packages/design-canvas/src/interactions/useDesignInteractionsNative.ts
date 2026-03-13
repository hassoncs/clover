import type {
	DesignDocument,
	DesignElement,
	DesignFrame,
} from "@slopcade/protocol/design";
import { useCallback, useRef, useState } from "react";
import { Gesture, type GestureType } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { hitTestDesignCanvas, screenToWorld } from "../core/designCanvasHitTest";
import type { SnapLine } from "./useDesignInteractions";

const PATH_DEFAULT_SIZE = 40;

function cloneDesignDocument(document: DesignDocument): DesignDocument {
	return JSON.parse(JSON.stringify(document)) as DesignDocument;
}

export function useDesignInteractionsNative(params: {
	document: DesignDocument | null;
	camera: { translateX: number; translateY: number; scale: number };
	selectedFrameId: string | null;
	selectedElementId: string | null;
	selectedElementIds: string[];
	setSelectedElementIds: (
		ids: string[] | ((prev: string[]) => string[]),
	) => void;
	saveDesignDocument: (doc: DesignDocument) => void;
	selectDesignElement: (elementId: string, frameId: string) => void;
	selectDesignFrame: (frameId: string) => void;
	clearDesignSelection: () => void;
	setDesignMode: (mode: string) => void;
	cameraHandlers: {
		handlePanStart?: () => void;
		handlePanUpdate?: (translationX: number, translationY: number) => void;
		handlePinchStart?: () => void;
		handlePinchUpdate?: (scale: number, focalX: number, focalY: number) => void;
	};
}): {
	gesture: GestureType;
	isDragging: boolean;
	isResizing: boolean;
	isRotating: boolean;
	snapLines: SnapLine[];
	liveDocument: DesignDocument | null;
} {
	const {
		document,
		camera,
		selectedFrameId,
		selectedElementId,
		selectedElementIds,
		setSelectedElementIds,
		saveDesignDocument,
		selectDesignElement,
		selectDesignFrame,
		clearDesignSelection,
		setDesignMode,
		cameraHandlers,
	} = params;

	const [isDragging, setIsDragging] = useState(false);
	const [isResizing, setIsResizing] = useState(false);
	const [isRotating, setIsRotating] = useState(false);
	const [snapLines, setSnapLines] = useState<SnapLine[]>([]);
	const [liveDocument, setLiveDocument] = useState<DesignDocument | null>(null);

	const interactionState = useRef<{
		type: "idle" | "drag" | "resize" | "rotate" | "multi-drag";
		handle?: string;
		startX: number;
		startY: number;
		initialElement: DesignElement | null;
		initialFrame: DesignFrame | null;
		initialElements: Record<string, DesignElement>;
	}>({
		type: "idle",
		startX: 0,
		startY: 0,
		initialElement: null,
		initialFrame: null,
		initialElements: {},
	});

	const pinchState = useRef<{
		type: "idle" | "element-scale" | "camera";
		frameId: string | null;
		elementId: string | null;
		initialElement: DesignElement | null;
	}>({
		type: "idle",
		frameId: null,
		elementId: null,
		initialElement: null,
	});

	const rotationState = useRef<{
		startRotationDeg: number;
	}>({
		startRotationDeg: 0,
	});

	const getElementBounds = useCallback(
		(element: DesignElement, frame: DesignFrame) => {
			let selX: number;
			let selY: number;
			let selW: number;
			let selH: number;

			if (element.type === "line") {
				selX = frame.position.x + Math.min(element.x1, element.x2);
				selY = frame.position.y + Math.min(element.y1, element.y2);
				selW = Math.abs(element.x2 - element.x1);
				selH = Math.abs(element.y2 - element.y1);
			} else if (element.type === "path") {
				selX = frame.position.x + element.x;
				selY = frame.position.y + element.y;
				selW = PATH_DEFAULT_SIZE;
				selH = PATH_DEFAULT_SIZE;
			} else {
				selX = frame.position.x + element.x;
				selY = frame.position.y + element.y;
				selW = element.width;
				selH = element.height;
			}

			return { selX, selY, selW, selH };
		},
		[],
	);

	const hitTestHandles = useCallback(
		(worldX: number, worldY: number) => {
			if (!document || !selectedFrameId || !selectedElementId) {
				return null;
			}

			const frame = document.frames.find((f) => f.id === selectedFrameId);
			const element = frame?.elements.find((e) => e.id === selectedElementId);
			if (!frame || !element) {
				return null;
			}

			const { selX, selY, selW, selH } = getElementBounds(element, frame);
			const hitRadius = 10 / camera.scale;

			const handles = [
				{ id: "tl", x: selX, y: selY },
				{ id: "tc", x: selX + selW / 2, y: selY },
				{ id: "tr", x: selX + selW, y: selY },
				{ id: "rc", x: selX + selW, y: selY + selH / 2 },
				{ id: "br", x: selX + selW, y: selY + selH },
				{ id: "bc", x: selX + selW / 2, y: selY + selH },
				{ id: "bl", x: selX, y: selY + selH },
				{ id: "lc", x: selX, y: selY + selH / 2 },
			];

			for (const handle of handles) {
				if (
					Math.abs(worldX - handle.x) <= hitRadius &&
					Math.abs(worldY - handle.y) <= hitRadius
				) {
					return { type: "resize" as const, handle: handle.id };
				}
			}

			const rotX = selX + selW / 2;
			const rotY = selY - 24;
			if (
				Math.abs(worldX - rotX) <= hitRadius &&
				Math.abs(worldY - rotY) <= hitRadius
			) {
				return { type: "rotate" as const };
			}

			return null;
		},
		[
			camera.scale,
			document,
			getElementBounds,
			selectedElementId,
			selectedFrameId,
		],
	);

	const resetInteractionFlags = useCallback(() => {
		setIsDragging(false);
		setIsResizing(false);
		setIsRotating(false);
		setSnapLines([]);
	}, []);

	const applyPanStart = useCallback(
		(screenX: number, screenY: number) => {
			if (!document) {
				interactionState.current.type = "idle";
				if (cameraHandlers.handlePanStart) {
					cameraHandlers.handlePanStart();
				}
				return;
			}

			const { worldX, worldY } = screenToWorld(screenX, screenY, camera);
			const handleHit = hitTestHandles(worldX, worldY);

			if (handleHit) {
				const frame = document.frames.find((f) => f.id === selectedFrameId);
				const element = frame?.elements.find(
					(el) => el.id === selectedElementId,
				);
				if (frame && element) {
					interactionState.current = {
						type: handleHit.type,
						handle: handleHit.type === "resize" ? handleHit.handle : undefined,
						startX: worldX,
						startY: worldY,
						initialElement: JSON.parse(JSON.stringify(element)),
						initialFrame: frame,
						initialElements: {},
					};
					if (handleHit.type === "resize") {
						setIsResizing(true);
					}
					if (handleHit.type === "rotate") {
						rotationState.current.startRotationDeg = element.rotation ?? 0;
						setIsRotating(true);
					}
					setDesignMode("design");
					return;
				}
			}

			const hit = hitTestDesignCanvas(document.frames, worldX, worldY);

			if (
				hit.elementId &&
				selectedElementIds.length >= 2 &&
				selectedElementIds.includes(hit.elementId)
			) {
				const frame = document.frames.find((f) => f.id === hit.frameId);
				if (frame) {
					const initialElements: Record<string, DesignElement> = {};
					for (const element of frame.elements) {
						if (selectedElementIds.includes(element.id)) {
							initialElements[element.id] = JSON.parse(JSON.stringify(element));
						}
					}

					interactionState.current = {
						type: "multi-drag",
						startX: worldX,
						startY: worldY,
						initialElement: null,
						initialFrame: frame,
						initialElements,
					};
					setIsDragging(true);
					setDesignMode("design");
					return;
				}
			}

			if (hit.elementId && hit.elementId === selectedElementId) {
				const frame = document.frames.find((f) => f.id === hit.frameId);
				const element = frame?.elements.find((el) => el.id === hit.elementId);
				if (frame && element) {
					interactionState.current = {
						type: "drag",
						startX: worldX,
						startY: worldY,
						initialElement: JSON.parse(JSON.stringify(element)),
						initialFrame: frame,
						initialElements: {},
					};
					setIsDragging(true);
					setDesignMode("design");
					return;
				}
			}

			interactionState.current.type = "idle";
			if (cameraHandlers.handlePanStart) {
				cameraHandlers.handlePanStart();
			}
		},
		[
			camera,
			cameraHandlers,
			document,
			hitTestHandles,
			selectedElementId,
			selectedElementIds,
			selectedFrameId,
			setDesignMode,
		],
	);

	const applyPanUpdate = useCallback(
		(
			screenX: number,
			screenY: number,
			translationX: number,
			translationY: number,
		) => {
			const state = interactionState.current;
			if (state.type === "idle") {
				if (cameraHandlers.handlePanUpdate) {
					cameraHandlers.handlePanUpdate(translationX, translationY);
				}
				return;
			}

			if (!document) {
				return;
			}

			const { worldX, worldY } = screenToWorld(screenX, screenY, camera);
			const dx = worldX - state.startX;
			const dy = worldY - state.startY;

			if (state.type === "multi-drag") {
				if (!state.initialFrame) {
					return;
				}

				const newDoc = cloneDesignDocument(document);
				const frame = newDoc.frames.find(
					(f) => f.id === state.initialFrame!.id,
				);
				if (!frame) {
					return;
				}

				for (const element of frame.elements) {
					const initialElement = state.initialElements[element.id] as
						| DesignElement
						| undefined;
					if (!initialElement) {
						continue;
					}

					if (element.type === "line" && initialElement.type === "line") {
						element.x1 = initialElement.x1 + dx;
						element.y1 = initialElement.y1 + dy;
						element.x2 = initialElement.x2 + dx;
						element.y2 = initialElement.y2 + dy;
					} else if (
						element.type !== "line" &&
						initialElement.type !== "line"
					) {
						element.x = initialElement.x + dx;
						element.y = initialElement.y + dy;
					}
				}

				setLiveDocument(newDoc);
				setSnapLines([]);
				return;
			}

			if (!state.initialElement || !state.initialFrame) {
				return;
			}

			const newDoc = cloneDesignDocument(document);
			const frame = newDoc.frames.find((f) => f.id === state.initialFrame!.id);
			const element = frame?.elements.find(
				(el) => el.id === state.initialElement!.id,
			);
			if (!frame || !element) {
				return;
			}

			const newSnapLines: SnapLine[] = [];

			if (state.type === "drag") {
				if (element.type === "line" && state.initialElement.type === "line") {
					element.x1 = state.initialElement.x1 + dx;
					element.y1 = state.initialElement.y1 + dy;
					element.x2 = state.initialElement.x2 + dx;
					element.y2 = state.initialElement.y2 + dy;
				} else if (
					element.type !== "line" &&
					state.initialElement.type !== "line"
				) {
					let newX = state.initialElement.x + dx;
					let newY = state.initialElement.y + dy;

					const SNAP_DIST = 8 / camera.scale;
					const frameX = frame.position.x;
					const frameY = frame.position.y;
					const elW =
						element.type === "path" ? PATH_DEFAULT_SIZE : element.width;
					const elH =
						element.type === "path" ? PATH_DEFAULT_SIZE : element.height;

					const worldElX = frameX + newX;
					const worldElY = frameY + newY;
					const worldElCX = worldElX + elW / 2;
					const worldElCY = worldElY + elH / 2;
					const worldElR = worldElX + elW;
					const worldElB = worldElY + elH;

					const xTargets = [
						frameX,
						frameX + frame.width / 2,
						frameX + frame.width,
					];
					const yTargets = [
						frameY,
						frameY + frame.height / 2,
						frameY + frame.height,
					];

					for (const other of frame.elements) {
						if (other.id === element.id) {
							continue;
						}
						const { selX, selY, selW, selH } = getElementBounds(other, frame);
						xTargets.push(selX, selX + selW / 2, selX + selW);
						yTargets.push(selY, selY + selH / 2, selY + selH);
					}

					let bestXSnap: { target: number; offset: number } | null = null;
					let minXDist = SNAP_DIST;
					for (const target of xTargets) {
						if (Math.abs(worldElX - target) < minXDist) {
							minXDist = Math.abs(worldElX - target);
							bestXSnap = { target, offset: 0 };
						}
						if (Math.abs(worldElCX - target) < minXDist) {
							minXDist = Math.abs(worldElCX - target);
							bestXSnap = { target, offset: elW / 2 };
						}
						if (Math.abs(worldElR - target) < minXDist) {
							minXDist = Math.abs(worldElR - target);
							bestXSnap = { target, offset: elW };
						}
					}

					let bestYSnap: { target: number; offset: number } | null = null;
					let minYDist = SNAP_DIST;
					for (const target of yTargets) {
						if (Math.abs(worldElY - target) < minYDist) {
							minYDist = Math.abs(worldElY - target);
							bestYSnap = { target, offset: 0 };
						}
						if (Math.abs(worldElCY - target) < minYDist) {
							minYDist = Math.abs(worldElCY - target);
							bestYSnap = { target, offset: elH / 2 };
						}
						if (Math.abs(worldElB - target) < minYDist) {
							minYDist = Math.abs(worldElB - target);
							bestYSnap = { target, offset: elH };
						}
					}

					if (bestXSnap) {
						newX = bestXSnap.target - bestXSnap.offset - frameX;
						newSnapLines.push({ axis: "x", position: bestXSnap.target });
					}

					if (bestYSnap) {
						newY = bestYSnap.target - bestYSnap.offset - frameY;
						newSnapLines.push({ axis: "y", position: bestYSnap.target });
					}

					element.x = newX;
					element.y = newY;
				}
			} else if (state.type === "resize") {
				if (element.type !== "line" && element.type !== "path") {
					const initialElement = state.initialElement;
					if (
						initialElement.type !== "line" &&
						initialElement.type !== "path"
					) {
						let newX = initialElement.x;
						let newY = initialElement.y;
						let newW = initialElement.width;
						let newH = initialElement.height;

						if (state.handle?.includes("l")) {
							newX = initialElement.x + dx;
							newW = initialElement.width - dx;
						}
						if (state.handle?.includes("r")) {
							newW = initialElement.width + dx;
						}
						if (state.handle?.includes("t")) {
							newY = initialElement.y + dy;
							newH = initialElement.height - dy;
						}
						if (state.handle?.includes("b")) {
							newH = initialElement.height + dy;
						}

						if (newW < 4) {
							if (state.handle?.includes("l")) {
								newX -= 4 - newW;
							}
							newW = 4;
						}

						if (newH < 4) {
							if (state.handle?.includes("t")) {
								newY -= 4 - newH;
							}
							newH = 4;
						}

						element.x = newX;
						element.y = newY;
						element.width = newW;
						element.height = newH;
					}
				}
			}

			setSnapLines(newSnapLines);
			setLiveDocument(newDoc);
		},
		[camera, cameraHandlers, document, getElementBounds],
	);

	const applyPanEnd = useCallback(() => {
		if (interactionState.current.type !== "idle") {
			setLiveDocument((currentLiveDocument) => {
				if (currentLiveDocument) {
					saveDesignDocument(currentLiveDocument);
				}
				return null;
			});
		}

		interactionState.current = {
			type: "idle",
			startX: 0,
			startY: 0,
			handle: undefined,
			initialElement: null,
			initialFrame: null,
			initialElements: {},
		};
		resetInteractionFlags();
	}, [resetInteractionFlags, saveDesignDocument]);

	const applyRotationUpdate = useCallback(
		(rotationRadians: number) => {
			if (interactionState.current.type !== "rotate") {
				return;
			}

			const state = interactionState.current;
			if (!document || !state.initialElement || !state.initialFrame) {
				return;
			}

			const newDoc = cloneDesignDocument(document);
			const frame = newDoc.frames.find((f) => f.id === state.initialFrame!.id);
			const element = frame?.elements.find(
				(el) => el.id === state.initialElement!.id,
			);
			if (!element || !frame) {
				return;
			}

			element.rotation =
				rotationState.current.startRotationDeg +
				(rotationRadians * 180) / Math.PI;
			setLiveDocument(newDoc);
		},
		[document],
	);

	const applyPinchStart = useCallback(() => {
		if (!document || !selectedFrameId || !selectedElementId) {
			pinchState.current = {
				type: "camera",
				frameId: null,
				elementId: null,
				initialElement: null,
			};
			if (cameraHandlers.handlePinchStart) {
				cameraHandlers.handlePinchStart();
			}
			return;
		}

		const frame = document.frames.find((f) => f.id === selectedFrameId);
		const element = frame?.elements.find((el) => el.id === selectedElementId);
		if (
			!frame ||
			!element ||
			element.type === "line" ||
			element.type === "path"
		) {
			pinchState.current = {
				type: "camera",
				frameId: null,
				elementId: null,
				initialElement: null,
			};
			if (cameraHandlers.handlePinchStart) {
				cameraHandlers.handlePinchStart();
			}
			return;
		}

		pinchState.current = {
			type: "element-scale",
			frameId: frame.id,
			elementId: element.id,
			initialElement: JSON.parse(JSON.stringify(element)),
		};
		setIsResizing(true);
		setDesignMode("design");
	}, [
		cameraHandlers,
		document,
		selectedElementId,
		selectedFrameId,
		setDesignMode,
	]);

	const applyPinchUpdate = useCallback(
		(scale: number, focalX: number, focalY: number) => {
			if (pinchState.current.type === "camera") {
				if (cameraHandlers.handlePinchUpdate) {
					cameraHandlers.handlePinchUpdate(scale, focalX, focalY);
				}
				return;
			}

			if (
				pinchState.current.type !== "element-scale" ||
				!document ||
				!pinchState.current.initialElement ||
				!pinchState.current.frameId ||
				!pinchState.current.elementId
			) {
				return;
			}

			const initialElement = pinchState.current.initialElement;
			if (initialElement.type === "line" || initialElement.type === "path") {
				return;
			}

			const newDoc = cloneDesignDocument(document);
			const frame = newDoc.frames.find(
				(f) => f.id === pinchState.current.frameId,
			);
			const element = frame?.elements.find(
				(el) => el.id === pinchState.current.elementId,
			);

			if (
				!frame ||
				!element ||
				element.type === "line" ||
				element.type === "path"
			) {
				return;
			}

			const clampedScale = Math.max(0.1, scale);
			const nextWidth = Math.max(4, initialElement.width * clampedScale);
			const nextHeight = Math.max(4, initialElement.height * clampedScale);
			const centerX = initialElement.x + initialElement.width / 2;
			const centerY = initialElement.y + initialElement.height / 2;

			element.width = nextWidth;
			element.height = nextHeight;
			element.x = centerX - nextWidth / 2;
			element.y = centerY - nextHeight / 2;

			setLiveDocument(newDoc);
			setSnapLines([]);
		},
		[cameraHandlers, document],
	);

	const applyPinchEnd = useCallback(() => {
		if (pinchState.current.type === "element-scale") {
			setLiveDocument((currentLiveDocument) => {
				if (currentLiveDocument) {
					saveDesignDocument(currentLiveDocument);
				}
				return null;
			});
		}

		pinchState.current = {
			type: "idle",
			frameId: null,
			elementId: null,
			initialElement: null,
		};

		if (interactionState.current.type === "idle") {
			setIsResizing(false);
			setSnapLines([]);
		}
	}, [saveDesignDocument]);

	const applyTap = useCallback(
		(screenX: number, screenY: number) => {
			if (!document) {
				return;
			}

			const { worldX, worldY } = screenToWorld(screenX, screenY, camera);
			const hit = hitTestDesignCanvas(document.frames, worldX, worldY);

			if (hit.frameId && hit.elementId) {
				selectDesignElement(hit.elementId, hit.frameId);
				setSelectedElementIds([hit.elementId]);
				setDesignMode("design");
				return;
			}

			if (hit.frameId) {
				selectDesignFrame(hit.frameId);
				setSelectedElementIds([]);
				setDesignMode("design");
				return;
			}

			clearDesignSelection();
			setSelectedElementIds([]);
			setDesignMode("camera");
		},
		[
			camera,
			clearDesignSelection,
			document,
			selectDesignElement,
			selectDesignFrame,
			setDesignMode,
			setSelectedElementIds,
		],
	);

	const unifiedPan = Gesture.Pan()
		.onStart((event) => {
			runOnJS(applyPanStart)(event.absoluteX, event.absoluteY);
		})
		.onUpdate((event) => {
			runOnJS(applyPanUpdate)(
				event.absoluteX,
				event.absoluteY,
				event.translationX,
				event.translationY,
			);
		})
		.onEnd(() => {
			runOnJS(applyPanEnd)();
		});

	const unifiedPinch = Gesture.Pinch()
		.onStart(() => {
			runOnJS(applyPinchStart)();
		})
		.onUpdate((event) => {
			runOnJS(applyPinchUpdate)(event.scale, event.focalX, event.focalY);
		})
		.onEnd(() => {
			runOnJS(applyPinchEnd)();
		});

	const elementRotation = Gesture.Rotation()
		.onUpdate((event) => {
			runOnJS(applyRotationUpdate)(event.rotation);
		})
		.onEnd(() => {
			runOnJS(applyPanEnd)();
		});

	const tap = Gesture.Tap().onEnd((event, success) => {
		if (!success) {
			return;
		}
		runOnJS(applyTap)(event.absoluteX, event.absoluteY);
	});

	const gesture = Gesture.Simultaneous(
		unifiedPan,
		unifiedPinch,
		elementRotation,
		tap,
	) as unknown as GestureType;

	return {
		gesture,
		isDragging,
		isResizing,
		isRotating,
		snapLines,
		liveDocument,
	};
}
