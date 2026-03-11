/**
 * SkiaWebReproFixture — Minimal Skia-only web debugging fixture
 *
 * PURPOSE:
 * Isolate and progressively test Skia rendering features on web.
 * Each stage builds on the previous to identify failure points.
 *
 * STAGES (controlled by `stage` prop):
 * 1. SOLID_RECT      — Basic Rect with solid color fill
 * 2. ROUNDED_RECT    — RoundedRect with corner radius
 * 3. FRAME_CHILDREN  — Group with nested children
 * 4. TEXT            — Paragraph API with font loading
 * 5. IMAGE           — useImage + ImageShader
 * 6. EFFECTS         — Shadows, blur, backdrop filter
 *
 * USAGE:
 * <SkiaWebReproFixture stage={Stage.TEXT} />
 *
 * IMPORTANT:
 * - Must be wrapped in WithSkiaWeb on web (use SkiaWebReproFixtureWrapper)
 * - No HTML fallback — pure Skia rendering
 * - Each stage isolates a feature class for debugging
 */

import {
	BackdropFilter,
	Blur,
	Canvas,
	DashPathEffect,
	Group,
	ImageShader,
	Paint,
	Rect,
	RoundedRect,
	Shadow,
	Text,
	useFont,
	useImage,
} from "@shopify/react-native-skia";
import { useEffect } from "react";
import { View } from "react-native";
import {
	useDerivedValue,
	useSharedValue,
	withRepeat,
	withTiming,
} from "react-native-reanimated";

export enum Stage {
	SOLID_RECT = 1,
	ROUNDED_RECT = 2,
	FRAME_CHILDREN = 3,
	TEXT = 4,
	IMAGE = 5,
	EFFECTS = 6,
	/** Isolated effect sub-stages for crash surface identification */
	EFFECT_SHADOW_ONLY = 7,
	EFFECT_BLUR_ONLY = 8,
	EFFECT_BACKDROP_ONLY = 9,
	FRESH_NODE_CHROME = 10,
}

export interface SkiaWebReproFixtureProps {
	/** Which rendering stage to test */
	stage?: Stage;
	/** Canvas dimensions */
	width?: number;
	height?: number;
	/** Optional test data overrides */
	testImageUrl?: string;
	testFontUrl?: string;
}

// =============================================================================
// STAGE 1: Solid Rect — Basic Skia primitive
// =============================================================================

function StageSolidRect({ width, height }: { width: number; height: number }) {
	return (
		<Rect
			x={20}
			y={20}
			width={width - 40}
			height={height - 40}
			color="#4F86FF"
		/>
	);
}

// =============================================================================
// STAGE 2: Rounded Rect — Corner radius support
// =============================================================================

function StageRoundedRect({
	width,
	height,
}: {
	width: number;
	height: number;
}) {
	return (
		<RoundedRect
			x={20}
			y={20}
			width={width - 40}
			height={height - 40}
			r={16}
			color="#4F86FF"
		/>
	);
}

// =============================================================================
// STAGE 3: Frame with Children — Group and nesting
// =============================================================================

function StageFrameChildren({
	width,
	height,
}: {
	width: number;
	height: number;
}) {
	return (
		<Group>
			{/* Parent frame */}
			<RoundedRect
				x={20}
				y={20}
				width={width - 40}
				height={height - 40}
				r={12}
				color="#1E293B"
			/>
			{/* Child 1 */}
			<Rect x={40} y={40} width={80} height={60} color="#4F86FF" />
			{/* Child 2 */}
			<Rect x={140} y={40} width={80} height={60} color="#10B981" />
			{/* Child 3 */}
			<Rect x={40} y={120} width={180} height={40} color="#818CF8" />
		</Group>
	);
}

// =============================================================================
// STAGE 4: Text — Font loading and Paragraph API
// =============================================================================

function StageText({
	width,
	height,
	testFontUrl,
}: {
	width: number;
	height: number;
	testFontUrl?: string;
}) {
	const fontUrl = testFontUrl ?? "/fonts/Fredoka-Regular.ttf";
	const font = useFont(fontUrl, 24);

	if (!font) {
		return (
			<Group>
				<Rect x={20} y={20} width={width - 40} height={60} color="#FEF3C7" />
			</Group>
		);
	}

	return (
		<Group>
			<RoundedRect
				x={20}
				y={20}
				width={width - 40}
				height={height - 40}
				r={12}
				color="#1E293B"
			/>
			<Text x={40} y={60} text="Hello Skia Web!" font={font} color="#F8FAFC" />
			<Text
				x={40}
				y={100}
				text="Font loaded successfully"
				font={font}
				color="#94A3B8"
			/>
		</Group>
	);
}

// =============================================================================
// STAGE 5: Image — useImage and ImageShader
// =============================================================================

function StageImage({
	width,
	height,
	testImageUrl,
}: {
	width: number;
	height: number;
	testImageUrl?: string;
}) {
	const imageUrl = testImageUrl ?? "https://picsum.photos/200/200";
	const image = useImage(imageUrl);

	if (!image) {
		return (
			<Group>
				<Rect
					x={20}
					y={20}
					width={width - 40}
					height={height - 40}
					color="#374151"
				/>
				<Rect
					x={30}
					y={height / 2 - 15}
					width={100}
					height={20}
					color="#4B5563"
				/>
			</Group>
		);
	}

	const imgSize = Math.min(width, height) - 80;
	const imgX = (width - imgSize) / 2;
	const imgY = (height - imgSize) / 2;

	return (
		<Group>
			<RoundedRect
				x={20}
				y={20}
				width={width - 40}
				height={height - 40}
				r={12}
				color="#1E293B"
			/>
			<Rect x={imgX} y={imgY} width={imgSize} height={imgSize}>
				<Paint style="fill">
					<ImageShader
						image={image}
						fit="cover"
						tx="decal"
						ty="decal"
						rect={{ x: imgX, y: imgY, width: imgSize, height: imgSize }}
					/>
				</Paint>
			</Rect>
		</Group>
	);
}

// =============================================================================
// STAGE 6: Effects — Shadows, Blur, BackdropFilter
// =============================================================================

function StageEffects({ width, height }: { width: number; height: number }) {
	return (
		<Group>
			{/* Background */}
			<Rect x={0} y={0} width={width} height={height} color="#0F172A" />

			{/* Card with shadow */}
			<Group>
				<RoundedRect
					x={40}
					y={40}
					width={width - 80}
					height={120}
					r={16}
					color="#1E293B"
				>
					<Shadow dx={0} dy={4} blur={20} color="rgba(0,0,0,0.5)" />
				</RoundedRect>
			</Group>

			{/* Card with blur filter */}
			<Group>
				<RoundedRect
					x={40}
					y={180}
					width={width - 80}
					height={120}
					r={16}
					color="#374151"
				>
					<Blur blur={2} mode="clamp" />
				</RoundedRect>
			</Group>

			{/* Card with backdrop blur (glass effect) */}
			<Group>
				<RoundedRect
					x={40}
					y={320}
					width={width - 80}
					height={120}
					r={16}
					color="rgba(255,255,255,0.1)"
				>
					<BackdropFilter filter={<Blur blur={10} mode="clamp" />} />
				</RoundedRect>
			</Group>
		</Group>
	);
}

// =============================================================================
// STAGE 7: Shadow Only — Isolated drop shadow
// =============================================================================

function StageShadowOnly({ width, height }: { width: number; height: number }) {
	return (
		<Group>
			<Rect x={0} y={0} width={width} height={height} color="#0F172A" />
			<RoundedRect
				x={40}
				y={40}
				width={width - 80}
				height={height - 80}
				r={16}
				color="#1E293B"
			>
				<Shadow dx={0} dy={4} blur={20} color="rgba(0,0,0,0.5)" />
			</RoundedRect>
		</Group>
	);
}

// =============================================================================
// STAGE 8: Blur Only — Isolated blur filter
// =============================================================================

function StageBlurOnly({ width, height }: { width: number; height: number }) {
	return (
		<Group>
			<Rect x={0} y={0} width={width} height={height} color="#0F172A" />
			<RoundedRect
				x={40}
				y={40}
				width={width - 80}
				height={height - 80}
				r={16}
				color="#374151"
			>
				<Blur blur={4} mode="clamp" />
			</RoundedRect>
		</Group>
	);
}

// =============================================================================
// STAGE 9: Backdrop Only — Isolated backdrop blur (glass effect)
// =============================================================================

function StageBackdropOnly({
	width,
	height,
}: {
	width: number;
	height: number;
}) {
	return (
		<Group>
			<Rect x={0} y={0} width={width} height={height} color="#0F172A" />
			<Rect x={60} y={60} width={100} height={100} color="#4F86FF" />
			<Rect x={120} y={100} width={100} height={100} color="#10B981" />
			<RoundedRect
				x={40}
				y={40}
				width={width - 80}
				height={height - 80}
				r={16}
				color="rgba(255,255,255,0.1)"
			>
				<BackdropFilter filter={<Blur blur={10} mode="clamp" />} />
			</RoundedRect>
		</Group>
	);
}

const FRESH_BORDER_COLOR = "#06b6d4";
const FRESH_BORDER_WIDTH = 2;
const FRESH_THRESHOLD_MS = 2000;

function StageFreshNodeChrome({
	width,
	height,
}: {
	width: number;
	height: number;
}) {
	const scale = useSharedValue(0.985);
	const opacity = useSharedValue(1);
	const dashPhase = useSharedValue(0);
	const borderOpacity = useSharedValue(0.85);

	useEffect(() => {
		scale.value = withTiming(1, { duration: 400 });
		opacity.value = withTiming(1, { duration: 300 });
		dashPhase.value = withRepeat(withTiming(20, { duration: 400 }), -1, false);
		const timer = setTimeout(() => {
			borderOpacity.value = withTiming(0, { duration: 200 });
		}, 1800);
		return () => clearTimeout(timer);
	}, [scale, opacity, dashPhase, borderOpacity]);

	const cx = width / 2;
	const cy = height / 2;
	const rectX = (width - 120) / 2;
	const rectY = (height - 80) / 2;
	const rectW = 120;
	const rectH = 80;

	const transform = useDerivedValue(() => [
		{ translateX: cx },
		{ translateY: cy },
		{ scale: scale.value },
		{ translateX: -cx },
		{ translateY: -cy },
	]);

	const ringTransform = useDerivedValue(() => [{ translateY: 0 }]);

	return (
		<Group>
			<Rect x={0} y={0} width={width} height={height} color="#0F172A" />
			<Group transform={transform} opacity={opacity}>
				<RoundedRect
					x={rectX}
					y={rectY}
					width={rectW}
					height={rectH}
					r={12}
					color="#1E293B"
				/>
			</Group>
			<Group opacity={borderOpacity} transform={ringTransform}>
				<Rect
					x={rectX - 1}
					y={rectY - 1}
					width={rectW + 2}
					height={rectH + 2}
					color="transparent"
				>
					<Paint
						style="stroke"
						strokeWidth={FRESH_BORDER_WIDTH}
						color={FRESH_BORDER_COLOR}
					>
						<DashPathEffect intervals={[6, 4]} phase={dashPhase} />
					</Paint>
				</Rect>
			</Group>
		</Group>
	);
}

// =============================================================================
// MAIN FIXTURE
// =============================================================================

export function SkiaWebReproFixture({
	stage = Stage.SOLID_RECT,
	width = 400,
	height = 500,
	testImageUrl,
	testFontUrl,
}: SkiaWebReproFixtureProps) {
	const renderStage = () => {
		switch (stage) {
			case Stage.SOLID_RECT:
				return <StageSolidRect width={width} height={height} />;
			case Stage.ROUNDED_RECT:
				return <StageRoundedRect width={width} height={height} />;
			case Stage.FRAME_CHILDREN:
				return <StageFrameChildren width={width} height={height} />;
			case Stage.TEXT:
				return (
					<StageText width={width} height={height} testFontUrl={testFontUrl} />
				);
			case Stage.IMAGE:
				return (
					<StageImage
						width={width}
						height={height}
						testImageUrl={testImageUrl}
					/>
				);
			case Stage.EFFECTS:
				return <StageEffects width={width} height={height} />;
			case Stage.EFFECT_SHADOW_ONLY:
				return <StageShadowOnly width={width} height={height} />;
			case Stage.EFFECT_BLUR_ONLY:
				return <StageBlurOnly width={width} height={height} />;
			case Stage.EFFECT_BACKDROP_ONLY:
				return <StageBackdropOnly width={width} height={height} />;
			case Stage.FRESH_NODE_CHROME:
				return <StageFreshNodeChrome width={width} height={height} />;
			default:
				return <StageSolidRect width={width} height={height} />;
		}
	};

	return (
		<View style={{ width, height, borderWidth: 1, borderColor: "#334155" }}>
			<Canvas style={{ width, height }}>{renderStage()}</Canvas>
		</View>
	);
}

// =============================================================================
// PROGRESSIVE FIXTURE — Render all stages in sequence
// =============================================================================

export interface SkiaWebProgressiveFixtureProps {
	/** Canvas dimensions */
	width?: number;
	height?: number;
	/** Horizontal spacing between stages */
	gap?: number;
	/** Which stages to include */
	stages?: Stage[];
	/** Optional test data overrides */
	testImageUrl?: string;
	testFontUrl?: string;
}

export function SkiaWebProgressiveFixture({
	width = 200,
	height = 200,
	gap = 16,
	stages = [
		Stage.SOLID_RECT,
		Stage.ROUNDED_RECT,
		Stage.FRAME_CHILDREN,
		Stage.TEXT,
		Stage.IMAGE,
		Stage.EFFECTS,
	],
	testImageUrl,
	testFontUrl,
}: SkiaWebProgressiveFixtureProps) {
	return (
		<View style={{ flexDirection: "row", gap }}>
			{stages.map((s) => (
				<View key={s} style={{ width, height }}>
					<SkiaWebReproFixture
						stage={s}
						width={width}
						height={height}
						testImageUrl={testImageUrl}
						testFontUrl={testFontUrl}
					/>
				</View>
			))}
		</View>
	);
}

// =============================================================================
// STAGE INFO — Metadata for debugging
// =============================================================================

export const STAGE_INFO: Record<Stage, { name: string; description: string }> =
	{
		[Stage.SOLID_RECT]: {
			name: "Solid Rect",
			description:
				"Basic Rect with solid color fill — tests Canvas and primitive rendering",
		},
		[Stage.ROUNDED_RECT]: {
			name: "Rounded Rect",
			description:
				"RoundedRect with corner radius — tests shape path generation",
		},
		[Stage.FRAME_CHILDREN]: {
			name: "Frame Children",
			description:
				"Group with nested children — tests composition and hierarchy",
		},
		[Stage.TEXT]: {
			name: "Text",
			description:
				"Font loading and Text component — tests useFont and typography",
		},
		[Stage.IMAGE]: {
			name: "Image",
			description:
				"useImage and ImageShader — tests image loading and texture mapping",
		},
		[Stage.EFFECTS]: {
			name: "Effects",
			description:
				"Shadow, Blur, BackdropFilter — tests filter effects pipeline",
		},
		[Stage.EFFECT_SHADOW_ONLY]: {
			name: "Shadow Only",
			description: "Isolated Shadow — tests drop shadow without other effects",
		},
		[Stage.EFFECT_BLUR_ONLY]: {
			name: "Blur Only",
			description: "Isolated Blur — tests blur filter without other effects",
		},
		[Stage.EFFECT_BACKDROP_ONLY]: {
			name: "Backdrop Only",
			description:
				"Isolated BackdropFilter — tests backdrop blur without other effects",
		},
		[Stage.FRESH_NODE_CHROME]: {
			name: "Fresh Node Chrome",
			description:
				"Scale + ring animation — tests reanimated shared values with Skia transforms",
		},
	};
