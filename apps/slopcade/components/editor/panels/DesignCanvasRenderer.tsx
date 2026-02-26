import {
	Canvas,
	Group,
	Rect,
	Text as SkiaText,
	useFont,
} from "@shopify/react-native-skia";
import type {
	DesignDocument,
	DesignElement,
	DesignFrame,
} from "@slopcade/shared";
import React, { useCallback, useRef } from "react";
import { TouchableWithoutFeedback, View } from "react-native";
import { hitTestDesignCanvas, screenToWorld } from "./designCanvasHitTest";

export interface DesignCanvasRendererProps {
	document: DesignDocument;
	camera: { translateX: number; translateY: number; scale: number };
	selectedFrameId: string | null;
	selectedElementId: string | null;
	onElementTap?: (frameId: string, elementId: string | null) => void;
	width: number;
	height: number;
}

function renderRectElement(element: any, framePosition: { x: number; y: number }) {
	const elX = framePosition.x + element.x;
	const elY = framePosition.y + element.y;
	return (
		<Group key={element.id}>
			<Rect
				x={elX}
				y={elY}
				width={element.width}
				height={element.height}
				color={element.fill || "#E0E0E0"}
			/>
			{element.stroke && (
				<Rect
					x={elX}
					y={elY}
					width={element.width}
					height={element.height}
					color={element.stroke}
					style="stroke"
					strokeWidth={element.strokeWidth || 1}
				/>
			)}
		</Group>
	);
}

function renderImageElement(element: any, framePosition: { x: number; y: number }, font: any) {
	const elX = framePosition.x + element.x;
	const elY = framePosition.y + element.y;
	return (
		<Group key={element.id}>
			<Rect
				x={elX}
				y={elY}
				width={element.width}
				height={element.height}
				color="#C8D8E8"
			/>
			<Rect
				x={elX}
				y={elY}
				width={element.width}
				height={element.height}
				color="#A0B0C0"
				style="stroke"
				strokeWidth={1}
			/>
			{font && (
				<SkiaText
					x={elX + element.width / 2 - 10}
					y={elY + element.height / 2 + 4}
					text="IMG"
					font={font}
					color="#607080"
				/>
			)}
		</Group>
	);
}

function renderTextElement(element: any, framePosition: { x: number; y: number }, font: any) {
	const elX = framePosition.x + element.x;
	const elY = framePosition.y + element.y;
	return (
		<Group key={element.id}>
			<Rect
				x={elX}
				y={elY}
				width={element.width}
				height={element.height}
				color="transparent"
			/>
			{font && (
				<SkiaText
					x={elX}
					y={elY + element.fontSize}
					text={element.content}
					font={font}
					color={element.color || "#333333"}
				/>
			)}
		</Group>
	);
}

export function DesignCanvasRenderer({
	document,
	camera,
	selectedFrameId,
	selectedElementId,
	onElementTap,
	width,
	height,
}: DesignCanvasRendererProps) {
	const font = useFont(
		require("../../../assets/fonts/Fredoka-Regular.ttf"),
		12,
	);

	const renderCount = useRef(0);

	if (__DEV__) {
		renderCount.current += 1;
		const startTime = Date.now();
		let elementCount = 0;
		document.frames.forEach((f) => {
			elementCount += f.elements.length;
		});
		const duration = Date.now() - startTime;
		console.log(
			`[DesignCanvas] Rendered ${elementCount} elements in ${duration}ms (Call #${renderCount.current})`,
		);
	}

	const handlePress = useCallback(
		(event: any) => {
			if (!onElementTap) return;

			const { locationX, locationY } = event.nativeEvent;
			const { worldX, worldY } = screenToWorld(locationX, locationY, camera);
			const hit = hitTestDesignCanvas(document.frames, worldX, worldY);

			onElementTap(hit.frameId ?? "", hit.elementId);
		},
		[document.frames, camera, onElementTap],
	);

	return (
		<TouchableWithoutFeedback onPress={handlePress}>
			<View style={{ width, height }}>
				<Canvas style={{ width, height }}>
					<Group
						transform={[
							{ translateX: camera.translateX },
							{ translateY: camera.translateY },
							{ scale: camera.scale },
						]}
					>
						{document.frames.map((frame) => (
							<Group key={frame.id}>
								<Rect
									x={frame.position.x}
									y={frame.position.y}
									width={frame.width}
									height={frame.height}
									color="#FFFFFF"
								/>
								<Rect
									x={frame.position.x}
									y={frame.position.y}
									width={frame.width}
									height={frame.height}
									color="#CCCCCC"
									style="stroke"
									strokeWidth={1}
								/>

								{font && (
									<SkiaText
										x={frame.position.x}
										y={frame.position.y - 8}
										text={frame.title}
										font={font}
										color="#666666"
									/>
								)}

								{frame.elements
									.slice()
									.sort((a, b) => a.zIndex - b.zIndex)
									.map((element) => {
										if (element.type === "rect") {
											return renderRectElement(element, frame.position);
										}

										if (element.type === "image") {
											return renderImageElement(element, frame.position, font);
										}

										if (element.type === "text") {
											return renderTextElement(element, frame.position, font);
										}

										if (__DEV__) {
											console.warn(`[DesignCanvas] Unknown element type: ${(element as any).type}`);
										}
										return null;
									})}

								{selectedFrameId === frame.id && !selectedElementId && (
									<Rect
										x={frame.position.x}
										y={frame.position.y}
										width={frame.width}
										height={frame.height}
										color="#2563EB"
										style="stroke"
										strokeWidth={2}
									/>
								)}

								{selectedFrameId === frame.id && selectedElementId && (
									<Group>
										{frame.elements
											.filter((e) => e.id === selectedElementId)
											.map((element) => (
												<Rect
													key={`sel-${element.id}`}
													x={frame.position.x + element.x}
													y={frame.position.y + element.y}
													width={element.width}
													height={element.height}
													color="#2563EB"
													style="stroke"
													strokeWidth={2}
												/>
											))}
									</Group>
								)}
							</Group>
						))}
					</Group>
				</Canvas>
			</View>
		</TouchableWithoutFeedback>
	);
}
