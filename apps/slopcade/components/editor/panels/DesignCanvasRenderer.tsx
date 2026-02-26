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
import React, { useCallback } from "react";
import { TouchableWithoutFeedback, View } from "react-native";

export interface DesignCanvasRendererProps {
	document: DesignDocument;
	camera: { translateX: number; translateY: number; scale: number };
	selectedFrameId: string | null;
	selectedElementId: string | null;
	onElementTap?: (frameId: string, elementId: string | null) => void;
	width: number;
	height: number;
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
	// We'll use a default system font if useFont is null, but Skia requires a font object for text.
	// For now, we can try to load a basic font or just use a fallback.
	// In React Native Skia, if we don't have a font, we can't render text easily without one.
	// Let's see if we can use a default font or just skip text if font is null.
	// Actually, Skia's Text component requires a font prop.
	// We might need to load a font. Let's assume we can use a standard font or just skip text rendering if font is not loaded.
	// For simplicity, we'll just render a placeholder rect for text if font is missing.
	const font = null; // TODO: load a font if needed, or use a bundled one.

	const handlePress = useCallback(
		(event: any) => {
			if (!onElementTap) return;

			// Get coordinates relative to the canvas
			const { locationX, locationY } = event.nativeEvent;

			// Convert screen coordinates to world coordinates
			const worldX = (locationX - camera.translateX) / camera.scale;
			const worldY = (locationY - camera.translateY) / camera.scale;

			// Find the tapped element (reverse order for z-index/rendering order)
			for (let i = document.frames.length - 1; i >= 0; i--) {
				const frame = document.frames[i];

				// Check if tap is within frame bounds
				if (
					worldX >= frame.position.x &&
					worldX <= frame.position.x + frame.width &&
					worldY >= frame.position.y &&
					worldY <= frame.position.y + frame.height
				) {
					// Check elements in reverse order
					const sortedElements = [...frame.elements].sort(
						(a, b) => b.zIndex - a.zIndex,
					);

					for (const element of sortedElements) {
						const elX = frame.position.x + element.x;
						const elY = frame.position.y + element.y;

						if (
							worldX >= elX &&
							worldX <= elX + element.width &&
							worldY >= elY &&
							worldY <= elY + element.height
						) {
							onElementTap(frame.id, element.id);
							return;
						}
					}

					// If no element was tapped, select the frame
					onElementTap(frame.id, null);
					return;
				}
			}

			// Clicked outside any frame
			onElementTap("", null); // Or maybe don't call it, or call with nulls to clear selection
		},
		[document, camera, onElementTap],
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
								{/* Frame Background */}
								<Rect
									x={frame.position.x}
									y={frame.position.y}
									width={frame.width}
									height={frame.height}
									color="#FFFFFF"
								/>
								{/* Frame Border */}
								<Rect
									x={frame.position.x}
									y={frame.position.y}
									width={frame.width}
									height={frame.height}
									color="#CCCCCC"
									style="stroke"
									strokeWidth={1}
								/>

								{/* Frame Title (Placeholder if no font) */}
								{/* We would render text here if we had a font */}

								{/* Elements */}
								{frame.elements
									.slice()
									.sort((a, b) => a.zIndex - b.zIndex)
									.map((element) => {
										const elX = frame.position.x + element.x;
										const elY = frame.position.y + element.y;

										if (element.type === "rect") {
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

										if (element.type === "image") {
											return (
												<Group key={element.id}>
													<Rect
														x={elX}
														y={elY}
														width={element.width}
														height={element.height}
														color="#C8D8E8"
													/>
													{/* Image placeholder border */}
													<Rect
														x={elX}
														y={elY}
														width={element.width}
														height={element.height}
														color="#A0B0C0"
														style="stroke"
														strokeWidth={1}
													/>
												</Group>
											);
										}

										if (element.type === "text") {
											return (
												<Group key={element.id}>
													{/* Text placeholder since we might not have a font loaded yet */}
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

										return null;
									})}

								{/* Selection Overlay for Frame */}
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

								{/* Selection Overlay for Element */}
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
