import {
	Canvas,
	Circle,
	Group,
	Image,
	Line,
	LinearGradient,
	Path,
	RadialGradient,
	Rect,
	Shadow,
	Text as SkiaText,
	useFont,
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
import { hitTestDesignCanvas, screenToWorld } from "./designCanvasHitTest";
import { useDesignImageResolver } from "./useDesignImageResolver";

export interface DesignCanvasRendererProps {
	document: DesignDocument;
	camera: { translateX: number; translateY: number; scale: number };
	selectedFrameId: string | null;
	selectedElementId: string | null;
	onElementTap?: (frameId: string, elementId: string | null) => void;
	width: number;
	height: number;
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

function renderTextElement(
	element: any,
	framePosition: { x: number; y: number },
	font: any,
) {
	const elX = framePosition.x + element.x;
	const elY = framePosition.y + element.y;

	// Paragraph API is not available in the current version of react-native-skia we are using,
	// or it requires a different setup. Let's stick to SkiaText for now, but we can try to use Paragraph if it's exported.
	// Wait, Paragraph is exported from @shopify/react-native-skia.

	return applyEffects(
		element,
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
) {
	const elX = framePosition.x + element.x;
	const elY = framePosition.y + element.y;

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

	// Collect all elements for image resolution
	const allElements = useMemo(() => {
		return document.frames.flatMap((f) => f.elements);
	}, [document.frames]);

	const resolvedImages = useDesignImageResolver(allElements);

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
											return renderImageElement(
												element,
												frame.position,
												font,
												resolvedImages.get(element.id) ?? null,
											);
										}

										if (element.type === "text") {
											return renderTextElement(element, frame.position, font);
										}

										if (element.type === "circle") {
											return renderCircleElement(element, frame.position);
										}

										if (element.type === "line") {
											return renderLineElement(element, frame.position);
										}

										if (element.type === "path") {
											return renderPathElement(element, frame.position);
										}

										if (element.type === "group") {
											// Render group as a transparent container for now
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
												return (
													<Rect
														key={`sel-${element.id}`}
														x={selX}
														y={selY}
														width={selW}
														height={selH}
														color="#2563EB"
														style="stroke"
														strokeWidth={2}
													/>
												);
											})}
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
