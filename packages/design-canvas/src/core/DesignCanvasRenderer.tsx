import {
	Canvas,
	Circle,
	DashPathEffect,
	Group,
	Image,
	Line,
	LinearGradient,
	Paragraph,
	Path,
	RadialGradient,
	Rect,
	Shadow,
	Skia,
	Text as SkiaText,
	TextAlign,
	useFont,
	useFonts,
	useImage,
	vec,
} from "@shopify/react-native-skia";
import type {
	DesignDocument,
	DesignElement,
	DesignFrame,
} from "@slopcade/shared";
import type React from "react";
import { useCallback, useMemo, useRef } from "react";
import { TouchableWithoutFeedback, View } from "react-native";
import { FREDOKA_REGULAR } from "../assets/fontSources";
import { useDesignImageResolver } from "../assets/useDesignImageResolver";
import { hitTestDesignCanvas, screenToWorld } from "./designCanvasHitTest";

interface WorldBounds {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

function getElementWorldBounds(
	element: DesignElement,
	framePosition: { x: number; y: number },
): WorldBounds {
	if (element.type === "line") {
		return {
			left: framePosition.x + Math.min(element.x1, element.x2),
			top: framePosition.y + Math.min(element.y1, element.y2),
			right: framePosition.x + Math.max(element.x1, element.x2),
			bottom: framePosition.y + Math.max(element.y1, element.y2),
		};
	}
	if (element.type === "path") {
		return {
			left: framePosition.x + element.x,
			top: framePosition.y + element.y,
			right: framePosition.x + element.x + 40,
			bottom: framePosition.y + element.y + 40,
		};
	}
	return {
		left: framePosition.x + element.x,
		top: framePosition.y + element.y,
		right: framePosition.x + element.x + element.width,
		bottom: framePosition.y + element.y + element.height,
	};
}

function isOutsideViewport(
	bounds: WorldBounds,
	viewport: {
		worldLeft: number;
		worldTop: number;
		worldRight: number;
		worldBottom: number;
	},
): boolean {
	return (
		bounds.right < viewport.worldLeft ||
		bounds.left > viewport.worldRight ||
		bounds.bottom < viewport.worldTop ||
		bounds.top > viewport.worldBottom
	);
}

import type { SnapLine } from "../interactions/useDesignInteractions";

export interface DesignCanvasRendererProps {
	document: DesignDocument;
	camera: { translateX: number; translateY: number; scale: number };
	selectedFrameId: string | null;
	selectedElementId: string | null;
	selectedElementIds?: string[];
	onElementTap?: (
		frameId: string,
		elementId: string | null,
		shiftKey?: boolean,
	) => void;
	width: number;
	height: number;
	snapLines?: SnapLine[];
	showGrid?: boolean;
}

function applyEffects(element: any, children: React.ReactNode) {
	const opacity = element.opacity ?? 1;

	let content = children;

	if (element.shadow) {
		content = (
			<Group>
				<Shadow
					dx={element.shadow.offsetX}
					dy={element.shadow.offsetY}
					blur={element.shadow.blur}
					color={element.shadow.color}
				/>
				{content}
			</Group>
		);
	}

	return <Group opacity={opacity}>{content}</Group>;
}

function renderGradient(element: any, elX: number, elY: number) {
	if (!element.gradient) return null;

	const { type, stops, angle = 0 } = element.gradient;
	const colors = stops.map((s: any) => s.color);
	const positions = stops.map((s: any) => s.position);

	if (type === "linear") {
		// Calculate start/end based on angle and bounding box
		// For simplicity, just doing horizontal/vertical for now
		const rad = (angle * Math.PI) / 180;
		const cx = elX + element.width / 2;
		const cy = elY + element.height / 2;
		const r = Math.max(element.width, element.height) / 2;

		const startX = cx - Math.cos(rad) * r;
		const startY = cy - Math.sin(rad) * r;
		const endX = cx + Math.cos(rad) * r;
		const endY = cy + Math.sin(rad) * r;

		return (
			<LinearGradient
				start={vec(startX, startY)}
				end={vec(endX, endY)}
				colors={colors}
				positions={positions}
			/>
		);
	} else if (type === "radial") {
		return (
			<RadialGradient
				c={vec(elX + element.width / 2, elY + element.height / 2)}
				r={Math.max(element.width, element.height) / 2}
				colors={colors}
				positions={positions}
			/>
		);
	}

	return null;
}

function renderRectElement(
	element: any,
	framePosition: { x: number; y: number },
) {
	const elX = framePosition.x + element.x;
	const elY = framePosition.y + element.y;

	return applyEffects(
		element,
		<Group key={element.id}>
			<Rect
				x={elX}
				y={elY}
				width={element.width}
				height={element.height}
				color={element.fill || "#E0E0E0"}
			>
				{renderGradient(element, elX, elY)}
			</Rect>
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
		</Group>,
	);
}

function renderImageElement(
	element: any,
	framePosition: { x: number; y: number },
	font: any,
	resolvedUrl: string | null,
) {
	return (
		<ImageElementRenderer
			key={element.id}
			element={element}
			framePosition={framePosition}
			font={font}
			resolvedUrl={resolvedUrl}
		/>
	);
}

function ImageElementRenderer({
	element,
	framePosition,
	font,
	resolvedUrl,
}: {
	element: any;
	framePosition: { x: number; y: number };
	font: any;
	resolvedUrl: string | null;
}) {
	const elX = framePosition.x + element.x;
	const elY = framePosition.y + element.y;

	const image = useImage(resolvedUrl || undefined);

	const fallback = (
		<Group>
			<Rect
				x={elX}
				y={elY}
				width={element.width}
				height={element.height}
				color="#E0E0E0"
			/>
			<Rect
				x={elX}
				y={elY}
				width={element.width}
				height={element.height}
				color="#FF3333"
				style="stroke"
				strokeWidth={2}
			/>
			{font && (
				<SkiaText
					x={elX + element.width / 2 - 20}
					y={elY + element.height / 2 + 4}
					text="⚠ IMG"
					font={font}
					color="#FF3333"
				/>
			)}
		</Group>
	);

	return applyEffects(
		element,
		<Group>
			{image ? (
				<Image
					image={image}
					x={elX}
					y={elY}
					width={element.width}
					height={element.height}
					fit={element.fit || "contain"}
				/>
			) : (
				fallback
			)}
		</Group>,
	);
}

function TextElementRenderer({
	element,
	framePosition,
	fontMgr,
}: {
	element: any;
	framePosition: { x: number; y: number };
	fontMgr: any | null;
}) {
	const elX = framePosition.x + element.x;
	const elY = framePosition.y + element.y;

	const paragraph = useMemo(() => {
		if (!fontMgr) return null;

		const textAlignMap: Record<string, TextAlign> = {
			left: TextAlign.Left,
			center: TextAlign.Center,
			right: TextAlign.Right,
		};
		const textAlign = textAlignMap[element.align ?? "left"] ?? TextAlign.Left;
		const builder = Skia.ParagraphBuilder.Make({ textAlign }, fontMgr);

		const fontStyle: { weight?: number } = {};
		if (element.fontWeight === "bold" || element.fontWeight === "700") {
			fontStyle.weight = 700;
		}

		builder.pushStyle({
			color: Skia.Color(element.color || "#333333"),
			fontSize: element.fontSize,
			fontFamilies: ["Fredoka"],
			fontStyle,
		});
		builder.addText(element.content);
		builder.pop();

		return builder.build();
	}, [
		fontMgr,
		element.content,
		element.color,
		element.fontSize,
		element.fontWeight,
		element.align,
	]);

	if (!fontMgr) {
		return applyEffects(
			element,
			<Group>
				<Rect
					x={elX}
					y={elY}
					width={element.width}
					height={element.height}
					color="#E0E0E0"
				/>
				<Rect
					x={elX}
					y={elY}
					width={element.width}
					height={element.height}
					color="#FF3333"
					style="stroke"
					strokeWidth={2}
				/>
			</Group>,
		);
	}

	return applyEffects(
		element,
		<Group>
			<Rect
				x={elX}
				y={elY}
				width={element.width}
				height={element.height}
				color="transparent"
			/>
			{paragraph && (
				<Paragraph
					paragraph={paragraph}
					x={elX}
					y={elY}
					width={element.width}
				/>
			)}
		</Group>,
	);
}

function renderCircleElement(
	element: any,
	framePosition: { x: number; y: number },
) {
	const elX = framePosition.x + element.x;
	const elY = framePosition.y + element.y;
	const cx = elX + element.width / 2;
	const cy = elY + element.height / 2;
	const r = Math.min(element.width, element.height) / 2;

	return applyEffects(
		element,
		<Group key={element.id}>
			<Circle cx={cx} cy={cy} r={r} color={element.fill || "#E0E0E0"}>
				{renderGradient(element, elX, elY)}
			</Circle>
			{element.stroke && (
				<Circle
					cx={cx}
					cy={cy}
					r={r}
					color={element.stroke}
					style="stroke"
					strokeWidth={element.strokeWidth || 1}
				/>
			)}
		</Group>,
	);
}

function renderLineElement(
	element: any,
	framePosition: { x: number; y: number },
) {
	const elX1 = framePosition.x + element.x1;
	const elY1 = framePosition.y + element.y1;
	const elX2 = framePosition.x + element.x2;
	const elY2 = framePosition.y + element.y2;

	return applyEffects(
		element,
		<Group key={element.id}>
			<Line
				p1={vec(elX1, elY1)}
				p2={vec(elX2, elY2)}
				color={element.stroke || "#000000"}
				style="stroke"
				strokeWidth={element.strokeWidth || 1}
			/>
		</Group>,
	);
}

function renderPathElement(
	element: any,
	framePosition: { x: number; y: number },
	font: any,
) {
	const elX = framePosition.x + element.x;
	const elY = framePosition.y + element.y;

	if (!element.data) {
		return applyEffects(
			element,
			<Group key={element.id}>
				<Rect x={elX} y={elY} width={40} height={40} color="#E0E0E0" />
				<Rect
					x={elX}
					y={elY}
					width={40}
					height={40}
					color="#FF3333"
					style="stroke"
					strokeWidth={2}
				/>
				{font && (
					<SkiaText
						x={elX + 4}
						y={elY + 24}
						text="⚠ PATH"
						font={font}
						color="#FF3333"
					/>
				)}
			</Group>,
		);
	}

	return applyEffects(
		element,
		<Group
			key={element.id}
			transform={[{ translateX: elX }, { translateY: elY }]}
		>
			<Path path={element.data} color={element.fill || "#E0E0E0"}>
				{renderGradient(element, 0, 0)}
			</Path>
			{element.stroke && (
				<Path
					path={element.data}
					color={element.stroke}
					style="stroke"
					strokeWidth={element.strokeWidth || 1}
				/>
			)}
		</Group>,
	);
}

export function DesignCanvasRenderer({
	document,
	camera,
	selectedFrameId,
	selectedElementId,
	selectedElementIds,
	onElementTap,
	width,
	height,
	snapLines = [],
	showGrid = false,
}: DesignCanvasRendererProps) {
	const font = useFont(FREDOKA_REGULAR as any, 12);
	const fontMgr = useFonts({
		Fredoka: [FREDOKA_REGULAR as any],
	});

	const renderCount = useRef(0);

	const viewportBounds = useMemo(() => {
		const worldLeft = -camera.translateX / camera.scale;
		const worldTop = -camera.translateY / camera.scale;
		return {
			worldLeft,
			worldTop,
			worldRight: worldLeft + width / camera.scale,
			worldBottom: worldTop + height / camera.scale,
		};
	}, [camera.translateX, camera.translateY, camera.scale, width, height]);

	const sortedElementsByFrameId = useMemo(() => {
		const map = new Map<string, DesignElement[]>();
		for (const frame of document.frames) {
			map.set(
				frame.id,
				frame.elements.slice().sort((a, b) => a.zIndex - b.zIndex),
			);
		}
		return map;
	}, [document.frames]);

	if (__DEV__) {
		renderCount.current += 1;
		let totalCount = 0;
		let culledCount = 0;
		for (const frame of document.frames) {
			const elements = sortedElementsByFrameId.get(frame.id) ?? [];
			for (const el of elements) {
				totalCount++;
				if (
					isOutsideViewport(
						getElementWorldBounds(el, frame.position),
						viewportBounds,
					)
				) {
					culledCount++;
				}
			}
		}
		console.log(
			`[DesignCanvas] Render #${renderCount.current}: ${totalCount - culledCount} visible / ${totalCount} total (${culledCount} culled)`,
		);
	}

	const handlePress = useCallback(
		(event: any) => {
			if (!onElementTap) return;

			const { locationX, locationY } = event.nativeEvent;
			const { worldX, worldY } = screenToWorld(locationX, locationY, camera);
			const hit = hitTestDesignCanvas(document.frames, worldX, worldY);
			const shiftKey = event.nativeEvent.shiftKey ?? false;

			onElementTap(hit.frameId ?? "", hit.elementId, shiftKey);
		},
		[document.frames, camera, onElementTap],
	);

	const allElements = useMemo(() => {
		return document.frames.flatMap((f) => f.elements);
	}, [document.frames]);

	const resolvedImages = useDesignImageResolver(allElements);

	const canvasContent = (
		<View style={{ width, height }}>
			<Canvas style={{ width, height }}>
				<Group
					transform={[
						{ translateX: camera.translateX },
						{ translateY: camera.translateY },
						{ scale: camera.scale },
					]}
				>
					{document.frames.map((frame) => {
						const frameBounds: WorldBounds = {
							left: frame.position.x,
							top: frame.position.y,
							right: frame.position.x + frame.width,
							bottom: frame.position.y + frame.height,
						};
						if (isOutsideViewport(frameBounds, viewportBounds)) return null;

						const sortedElements = sortedElementsByFrameId.get(frame.id) ?? [];

						return (
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

								{sortedElements.map((element) => {
									if (
										isOutsideViewport(
											getElementWorldBounds(element, frame.position),
											viewportBounds,
										)
									) {
										return null;
									}

									if (element.type === "rect") {
										return renderRectElement(element, frame.position);
									}

									if (element.type === "image") {
										return renderImageElement(
											element,
											frame.position,
											font,
											resolvedImages.get(element.id) ?? null,
										);
									}

									if (element.type === "text") {
										return (
											<TextElementRenderer
												key={element.id}
												element={element}
												framePosition={frame.position}
												fontMgr={fontMgr}
											/>
										);
									}

									if (element.type === "circle") {
										return renderCircleElement(element, frame.position);
									}

									if (element.type === "line") {
										return renderLineElement(element, frame.position);
									}

									if (element.type === "path") {
										return renderPathElement(element, frame.position, font);
									}

									if (element.type === "group") {
										return (
											<Group key={element.id} opacity={element.opacity ?? 1}>
												{/* Children are rendered as part of the flat list in this schema version */}
											</Group>
										);
									}

									if (__DEV__) {
										console.warn(
											`[DesignCanvas] Unknown element type: ${(element as any).type}`,
										);
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
											.map((element) => {
												let selX: number,
													selY: number,
													selW: number,
													selH: number;
												if (element.type === "line") {
													selX =
														frame.position.x + Math.min(element.x1, element.x2);
													selY =
														frame.position.y + Math.min(element.y1, element.y2);
													selW = Math.abs(element.x2 - element.x1);
													selH = Math.abs(element.y2 - element.y1);
												} else if (element.type === "path") {
													selX = frame.position.x + element.x;
													selY = frame.position.y + element.y;
													selW = 40;
													selH = 40;
												} else {
													selX = frame.position.x + element.x;
													selY = frame.position.y + element.y;
													selW = element.width;
													selH = element.height;
												}
												const HANDLE_SIZE = 12;
												const HANDLE_OFFSET = HANDLE_SIZE / 2;
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

												return (
													<Group key={`sel-group-${element.id}`}>
														<Rect
															x={selX}
															y={selY}
															width={selW}
															height={selH}
															color="#2563EB"
															style="stroke"
															strokeWidth={2}
														/>
														<Line
															p1={vec(selX + selW / 2, selY)}
															p2={vec(selX + selW / 2, selY - 24)}
															color="#2563EB"
															style="stroke"
															strokeWidth={2}
														/>
														<Circle
															cx={selX + selW / 2}
															cy={selY - 24}
															r={6}
															color="#FFFFFF"
														/>
														<Circle
															cx={selX + selW / 2}
															cy={selY - 24}
															r={6}
															color="#2563EB"
															style="stroke"
															strokeWidth={2}
														/>
														{handles.map((h) => (
															<Group key={`handle-${h.id}`}>
																<Rect
																	x={h.x - HANDLE_OFFSET}
																	y={h.y - HANDLE_OFFSET}
																	width={HANDLE_SIZE}
																	height={HANDLE_SIZE}
																	color="#FFFFFF"
																/>
																<Rect
																	x={h.x - HANDLE_OFFSET}
																	y={h.y - HANDLE_OFFSET}
																	width={HANDLE_SIZE}
																	height={HANDLE_SIZE}
																	color="#2563EB"
																	style="stroke"
																	strokeWidth={2}
																/>
															</Group>
														))}
													</Group>
												);
											})}
									</Group>
								)}
							</Group>
						);
					})}

					{snapLines.map((line, i) => {
						if (line.axis === "x") {
							return (
								<Line
									key={`snap-x-${i}-${line.position}`}
									p1={vec(line.position, viewportBounds.worldTop)}
									p2={vec(line.position, viewportBounds.worldBottom)}
									color="#2563EB"
									style="stroke"
									strokeWidth={1 / camera.scale}
								/>
							);
						} else {
							return (
								<Line
									key={`snap-y-${i}-${line.position}`}
									p1={vec(viewportBounds.worldLeft, line.position)}
									p2={vec(viewportBounds.worldRight, line.position)}
									color="#2563EB"
									style="stroke"
									strokeWidth={1 / camera.scale}
								/>
							);
						}
					})}

					{selectedElementIds &&
						selectedElementIds.length >= 2 &&
						(() => {
							let minX = Infinity,
								minY = Infinity,
								maxX = -Infinity,
								maxY = -Infinity;
							for (const frame of document.frames) {
								for (const el of frame.elements) {
									if (!selectedElementIds.includes(el.id)) continue;
									const bounds = getElementWorldBounds(el, frame.position);
									minX = Math.min(minX, bounds.left);
									minY = Math.min(minY, bounds.top);
									maxX = Math.max(maxX, bounds.right);
									maxY = Math.max(maxY, bounds.bottom);
								}
							}
							if (minX === Infinity) return null;
							const pad = 4 / camera.scale;
							const bx = minX - pad;
							const by = minY - pad;
							const bw = maxX - minX + pad * 2;
							const bh = maxY - minY + pad * 2;
							const sw = 2 / camera.scale;
							const dashLen = 6 / camera.scale;
							const gapLen = 3 / camera.scale;
							const pathStr = `M ${bx} ${by} L ${bx + bw} ${by} L ${bx + bw} ${by + bh} L ${bx} ${by + bh} Z`;
							return (
								<Path
									key="multi-select-bbox"
									path={pathStr}
									color="#2563EB"
									style="stroke"
									strokeWidth={sw}
								>
									<DashPathEffect intervals={[dashLen, gapLen]} />
								</Path>
							);
						})()}
				</Group>
			</Canvas>
		</View>
	);

	if (onElementTap) {
		return (
			<TouchableWithoutFeedback onPress={handlePress}>
				{canvasContent}
			</TouchableWithoutFeedback>
		);
	}

	return canvasContent;
}

// Default export for React.lazy() consumers
export default DesignCanvasRenderer;
