import {
	Canvas,
	Group,
	LinearGradient,
	Path,
	RadialGradient,
	Rect,
	type SkFont,
	Skia,
	Text,
	TwoPointConicalGradient,
	useFont,
	vec,
} from "@shopify/react-native-skia";
import { useEffect, useMemo, useState } from "react";
import { Dimensions, Platform, StyleSheet, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export const TEXT = "SLOPCADE";

export const STYLE_NAMES = [
	"Holographic",
	"Glitch Digital",
	"Liquid Chrome",
	"VHS Retro",
	"Fire Plasma",
	"Electric Neon",
] as const;

export type SplashStyleName = (typeof STYLE_NAMES)[number];

export interface SplashStyleConfig {
	name: SplashStyleName;
	fontUrl: string;
	fontSize: number;
	bgColors: string[];
}

export const SPLASH_STYLE_CONFIGS: Record<SplashStyleName, SplashStyleConfig> =
	{
		Holographic: {
			name: "Holographic",
			fontUrl:
				"https://cdn.jsdelivr.net/gh/googlefonts/Bangers@main/fonts/ttf/Bangers-Regular.ttf",
			fontSize: 80,
			bgColors: ["#0a0015", "#150025", "#0a0015"],
		},
		"Glitch Digital": {
			name: "Glitch Digital",
			fontUrl:
				"https://cdn.jsdelivr.net/gh/googlefonts/PressStart2P@main/fonts/ttf/PressStart2P-Regular.ttf",
			fontSize: 32,
			bgColors: ["#000000", "#0a0a0a", "#000000"],
		},
		"Liquid Chrome": {
			name: "Liquid Chrome",
			fontUrl:
				"https://cdn.jsdelivr.net/gh/googlefonts/Fredoka@main/fonts/ttf/Fredoka-Bold.ttf",
			fontSize: 72,
			bgColors: ["#1a1a2e", "#16213e", "#1a1a2e"],
		},
		"VHS Retro": {
			name: "VHS Retro",
			fontUrl:
				"https://cdn.jsdelivr.net/gh/googlefonts/Lora@main/fonts/ttf/Lora-Bold.ttf",
			fontSize: 68,
			bgColors: ["#0d0d0d", "#1a0a1a", "#0d0d0d"],
		},
		"Fire Plasma": {
			name: "Fire Plasma",
			fontUrl:
				"https://cdn.jsdelivr.net/gh/googlefonts/Bangers@main/fonts/ttf/Bangers-Regular.ttf",
			fontSize: 85,
			bgColors: ["#1a0500", "#2d0a00", "#1a0500"],
		},
		"Electric Neon": {
			name: "Electric Neon",
			fontUrl:
				"https://cdn.jsdelivr.net/gh/googlefonts/PressStart2P@main/fonts/ttf/PressStart2P-Regular.ttf",
			fontSize: 30,
			bgColors: ["#000a0a", "#001a1a", "#000a0a"],
		},
	};

const SCANLINE_COUNT = 40;
const GLITCH_BAR_POSITIONS = [0.3, 0.5, 0.7];
const GLITCH_BAR_COLORS = ["#ff0080", "#00ff80", "#8000ff"];
const NOISE_COUNT = 50;
const GRID_H_COUNT = 20;
const GRID_V_COUNT = 15;
const SPARK_POSITIONS = [0.2, 0.5, 0.8];

interface UseSplashFontResult {
	font: SkFont | null;
	config: SplashStyleConfig;
	textWidth: number;
	centerX: number;
	centerY: number;
	textX: number;
	textY: number;
}

export function useSplashFont(styleName: SplashStyleName): UseSplashFontResult {
	const config = SPLASH_STYLE_CONFIGS[styleName];
	const font = useFont(config.fontUrl, config.fontSize);

	const textWidth = font?.measureText(TEXT)?.width ?? 0;
	const centerX = SCREEN_WIDTH / 2;
	const centerY = SCREEN_HEIGHT / 2;
	const textX = centerX - textWidth / 2;
	const textY = centerY;

	return { font, config, textWidth, centerX, centerY, textX, textY };
}

interface AnimationValues {
	t: number;
	pulse: number;
	wave: number;
}

export function useAnimationValues(time: number): AnimationValues {
	const t = time * 0.001;
	const pulse = Math.sin(t * 8) * 0.5 + 0.5;
	const wave = t * 3;
	return { t, pulse, wave };
}

interface StyleRendererProps {
	font: SkFont;
	config: SplashStyleConfig;
	anim: AnimationValues;
	dimensions: {
		textWidth: number;
		centerX: number;
		centerY: number;
		textX: number;
		textY: number;
		screenWidth: number;
		screenHeight: number;
		fontSize: number;
	};
}

export function renderBackground(
	config: SplashStyleConfig,
	screenWidth: number,
	screenHeight: number,
) {
	return (
		<Rect x={0} y={0} width={screenWidth} height={screenHeight}>
			<LinearGradient
				start={vec(0, 0)}
				end={vec(0, screenHeight)}
				colors={config.bgColors}
			/>
		</Rect>
	);
}

export function renderHolographic(props: StyleRendererProps) {
	const { font, anim, dimensions } = props;
	const { textX, textY, textWidth, screenWidth, screenHeight, fontSize } =
		dimensions;
	const { t, pulse, wave } = anim;

	return (
		<>
			<Rect x={0} y={0} width={screenWidth} height={screenHeight}>
				<LinearGradient
					start={vec(-200 + (t % 3) * (screenWidth + 400), 0)}
					end={vec(
						screenWidth + 200 - (t % 3) * (screenWidth + 400),
						screenHeight,
					)}
					colors={[
						"#ff008020",
						"#ff00ff20",
						"#8000ff20",
						"#0080ff20",
						"#00ffff20",
						"#00ff8020",
						"#80ff0020",
						"#ffff0020",
						"#ff800020",
						"#ff008020",
					]}
				/>
			</Rect>

			<Text
				font={font}
				text={TEXT}
				x={textX + 6}
				y={textY}
				color="#ff0040"
				opacity={0.6}
			/>
			<Text
				font={font}
				text={TEXT}
				x={textX - 6}
				y={textY}
				color="#00ffff"
				opacity={0.6}
			/>

			<Text font={font} text={TEXT} x={textX} y={textY}>
				<LinearGradient
					start={vec(textX + Math.sin(wave) * 50, textY - fontSize)}
					end={vec(
						textX + textWidth + Math.cos(wave) * 50,
						textY + fontSize * 0.3,
					)}
					colors={[
						"#ff00ff",
						"#ff0080",
						"#ff0040",
						"#ff8000",
						"#ffff00",
						"#80ff00",
						"#00ff80",
						"#00ffff",
						"#0080ff",
						"#8000ff",
						"#ff00ff",
					]}
				/>
			</Text>

			<Text
				font={font}
				text={TEXT}
				x={textX}
				y={textY}
				opacity={0.3 + pulse * 0.2}
			>
				<LinearGradient
					start={vec(textX, textY - fontSize)}
					end={vec(textX + textWidth, textY)}
					colors={["#ffffff", "#ffffff80", "#ffffff", "#ffffff80", "#ffffff"]}
				/>
			</Text>
		</>
	);
}

export function renderGlitchDigital(props: StyleRendererProps) {
	const { font, anim, dimensions } = props;
	const { textX, textY, textWidth, screenWidth, screenHeight, fontSize } =
		dimensions;
	const { t } = anim;

	return (
		<>
			<Group opacity={0.1}>
				{Array.from({ length: SCANLINE_COUNT }, (_, i) => {
					const rowY = i * (screenHeight / SCANLINE_COUNT);
					return (
						<Rect
							key={`scanline-at-y-${rowY}`}
							x={0}
							y={rowY}
							width={screenWidth}
							height={2}
							color="#00ff00"
						/>
					);
				})}
			</Group>

			<Text
				font={font}
				text={TEXT}
				x={textX + Math.sin(t * 20) * 8}
				y={textY}
				color="#ff0000"
				opacity={0.7}
			/>
			<Text
				font={font}
				text={TEXT}
				x={textX + Math.cos(t * 15) * 8}
				y={textY}
				color="#00ff00"
				opacity={0.7}
			/>
			<Text
				font={font}
				text={TEXT}
				x={textX}
				y={textY + Math.sin(t * 25) * 3}
				color="#0000ff"
				opacity={0.7}
			/>
			<Text font={font} text={TEXT} x={textX} y={textY} color="#ffffff" />

			{GLITCH_BAR_POSITIONS.map((pos, i) => (
				<Rect
					key={`glitch-bar-${pos}`}
					x={textX + Math.sin(t * 30 + i) * 100}
					y={textY - fontSize * 0.5 + pos * fontSize}
					width={textWidth * (0.3 + Math.abs(Math.sin(t * 50 + i)) * 0.4)}
					height={3 + Math.sin(t * 50) * 2}
					color={GLITCH_BAR_COLORS[i]}
					opacity={0.5 + Math.sin(t * 40 + i * 2) * 0.3}
				/>
			))}
		</>
	);
}

export function renderLiquidChrome(props: StyleRendererProps) {
	const { font, anim, dimensions } = props;
	const { textX, textY, textWidth, fontSize } = dimensions;
	const { pulse, wave } = anim;

	return (
		<>
			<Text
				font={font}
				text={TEXT}
				x={textX + 3}
				y={textY + 3}
				color="#000000"
				opacity={0.4}
			/>

			<Text font={font} text={TEXT} x={textX} y={textY}>
				<LinearGradient
					start={vec(textX, textY - fontSize + Math.sin(wave) * 20)}
					end={vec(textX + textWidth, textY + Math.cos(wave) * 20)}
					colors={[
						"#2a2a3a",
						"#4a4a5a",
						"#8a8a9a",
						"#d0d0e0",
						"#ffffff",
						"#f0f0ff",
						"#c0c0d0",
						"#808090",
						"#505060",
						"#3a3a4a",
						"#606070",
						"#9090a0",
						"#d0d0e0",
						"#ffffff",
						"#a0a0b0",
						"#4a4a5a",
					]}
				/>
			</Text>

			<Text font={font} text={TEXT} x={textX} y={textY}>
				<LinearGradient
					start={vec(textX + textWidth * 0.3, textY - fontSize)}
					end={vec(textX + textWidth * 0.5, textY)}
					colors={[
						"#ffffff00",
						"#ffffff80",
						"#ffffff",
						"#ffffff80",
						"#ffffff00",
					]}
				/>
			</Text>

			<Text
				font={font}
				text={TEXT}
				x={textX - 1}
				y={textY}
				color="#6080ff"
				opacity={0.3 + pulse * 0.2}
			/>
			<Text
				font={font}
				text={TEXT}
				x={textX + 1}
				y={textY}
				color="#ff6080"
				opacity={0.3 + pulse * 0.2}
			/>
		</>
	);
}

export function renderVHSRetro(props: StyleRendererProps) {
	const { font, anim, dimensions } = props;
	const { textX, textY, screenWidth, screenHeight, fontSize } = dimensions;
	const { t } = anim;

	return (
		<>
			<Group opacity={0.15}>
				{Array.from({ length: NOISE_COUNT }, (_, i) => {
					const noiseX = (Math.sin(i * 7.3) * 0.5 + 0.5) * screenWidth;
					const noiseY = (Math.cos(i * 11.7) * 0.5 + 0.5) * screenHeight;
					return (
						<Rect
							key={`noise-${Math.floor(noiseX)}-${Math.floor(noiseY)}`}
							x={noiseX}
							y={noiseY}
							width={2 + Math.abs(Math.sin(i * 3.1)) * 10}
							height={1 + Math.abs(Math.cos(i * 5.9)) * 3}
							color={i % 2 === 0 ? "#ff00ff" : "#00ffff"}
						/>
					);
				})}
			</Group>

			<Text
				font={font}
				text={TEXT}
				x={textX - 4}
				y={textY}
				color="#ff0000"
				opacity={0.5}
			/>
			<Text
				font={font}
				text={TEXT}
				x={textX + 4}
				y={textY}
				color="#0000ff"
				opacity={0.5}
			/>

			<Text font={font} text={TEXT} x={textX} y={textY}>
				<LinearGradient
					start={vec(textX, textY - fontSize)}
					end={vec(textX, textY + fontSize * 0.3)}
					colors={["#ff80ff", "#ff60c0", "#ff40a0", "#ff2080", "#ff0060"]}
				/>
			</Text>

			<Rect
				x={0}
				y={((t * 100) % (screenHeight + 20)) - 10}
				width={screenWidth}
				height={4}
				color="#ffffff"
				opacity={0.3}
			/>

			<Text
				font={font}
				text={TEXT}
				x={textX}
				y={textY}
				color="#ff00ff"
				opacity={0.2}
				blendMode="screen"
			/>
		</>
	);
}

export function renderFirePlasma(props: StyleRendererProps) {
	const { font, anim, dimensions } = props;
	const {
		textX,
		textY,
		textWidth,
		centerX,
		centerY,
		screenWidth,
		screenHeight,
		fontSize,
	} = dimensions;
	const { t, wave } = anim;

	return (
		<>
			<Rect x={0} y={0} width={screenWidth} height={screenHeight}>
				<LinearGradient
					start={vec(0, screenHeight)}
					end={vec(0, 0)}
					colors={["#ff200080", "#ff400060", "#ff600040", "#ff800020"]}
				/>
			</Rect>

			<Text font={font} text={TEXT} x={textX} y={textY}>
				<RadialGradient
					r={fontSize * 1.5}
					c={vec(centerX, centerY)}
					colors={["#ff800080", "#ff400040", "#ff000020", "#00000000"]}
				/>
			</Text>

			<Text font={font} text={TEXT} x={textX} y={textY}>
				<LinearGradient
					start={vec(textX, textY + Math.sin(wave) * 10)}
					end={vec(textX + textWidth, textY - fontSize + Math.cos(wave) * 10)}
					colors={[
						"#ff0000",
						"#ff2000",
						"#ff4000",
						"#ff6000",
						"#ff8000",
						"#ffa000",
						"#ffc000",
						"#ffe000",
						"#ffff80",
						"#ffffff",
						"#ffff80",
						"#ffc000",
						"#ff8000",
						"#ff4000",
						"#ff0000",
					]}
				/>
			</Text>

			<Text
				font={font}
				text={TEXT}
				x={textX + Math.sin(t * 10) * 2}
				y={textY - Math.sin(t * 8) * 2}
				color="#ffff00"
				opacity={0.3}
				blendMode="screen"
			/>
			<Text
				font={font}
				text={TEXT}
				x={textX + Math.cos(t * 12) * 2}
				y={textY - Math.cos(t * 10) * 2}
				color="#ff8000"
				opacity={0.2}
				blendMode="screen"
			/>
		</>
	);
}

export function renderElectricNeon(props: StyleRendererProps) {
	const { font, anim, dimensions } = props;
	const {
		textX,
		textY,
		textWidth,
		centerX,
		centerY,
		screenWidth,
		screenHeight,
		fontSize,
	} = dimensions;
	const { t, pulse } = anim;

	return (
		<>
			<Group opacity={0.05}>
				{Array.from({ length: GRID_H_COUNT }, (_, i) => {
					const gridY = i * (screenHeight / GRID_H_COUNT);
					return (
						<Path
							key={`grid-h-y-${gridY}`}
							path={Skia.Path.Make()
								.moveTo(0, gridY)
								.lineTo(screenWidth, gridY)}
							color="#00ffff"
							style="stroke"
							strokeWidth={1}
						/>
					);
				})}
				{Array.from({ length: GRID_V_COUNT }, (_, i) => {
					const gridX = i * (screenWidth / GRID_V_COUNT);
					return (
						<Path
							key={`grid-v-x-${gridX}`}
							path={Skia.Path.Make()
								.moveTo(gridX, 0)
								.lineTo(gridX, screenHeight)}
							color="#00ffff"
							style="stroke"
							strokeWidth={1}
						/>
					);
				})}
			</Group>

			<Text
				font={font}
				text={TEXT}
				x={textX}
				y={textY}
				color="#00ffff"
				opacity={0.1}
			/>
			<Text
				font={font}
				text={TEXT}
				x={textX}
				y={textY}
				color="#00ffff"
				opacity={0.15}
			/>
			<Text
				font={font}
				text={TEXT}
				x={textX}
				y={textY}
				color="#00ffff"
				opacity={0.2}
			/>

			<Text font={font} text={TEXT} x={textX} y={textY}>
				<TwoPointConicalGradient
					start={vec(textX, textY - fontSize)}
					endR={textWidth}
					end={vec(textX + textWidth, textY + fontSize * 0.3)}
					startR={0}
					colors={[
						"#00ffff",
						"#00ff80",
						"#80ff00",
						"#ffff00",
						"#ff8000",
						"#ff0080",
						"#00ffff",
					]}
				/>
			</Text>

			<Text
				font={font}
				text={TEXT}
				x={textX}
				y={textY}
				opacity={0.4 + pulse * 0.4}
			>
				<RadialGradient
					c={vec(centerX, centerY)}
					r={fontSize}
					colors={["#ffffff", "#00ffff00"]}
				/>
			</Text>

			{SPARK_POSITIONS.map((pos, i) => (
				<Rect
					key={`spark-pos-${pos}`}
					x={textX + textWidth * pos + Math.sin(t * 50 + i * 3) * 5}
					y={textY - fontSize * 0.3 + Math.cos(t * 40 + i * 2) * 8}
					width={2 + Math.sin(t * 60 + i) * 2}
					height={8 + Math.sin(t * 70 + i) * 5}
					color="#ffffff"
					opacity={0.5 + Math.sin(t * 80 + i * 4) * 0.3}
				/>
			))}
		</>
	);
}

export const STYLE_RENDERERS: Record<
	SplashStyleName,
	(props: StyleRendererProps) => JSX.Element
> = {
	Holographic: renderHolographic,
	"Glitch Digital": renderGlitchDigital,
	"Liquid Chrome": renderLiquidChrome,
	"VHS Retro": renderVHSRetro,
	"Fire Plasma": renderFirePlasma,
	"Electric Neon": renderElectricNeon,
};

interface SingleStyleCanvasProps {
	styleName: SplashStyleName;
	time?: number;
	width?: number;
	height?: number;
}

interface SkiaCanvasContentProps {
	styleName: SplashStyleName;
	time: number;
	width: number;
	height: number;
	font: SkFont;
}

function SkiaCanvasContent({
	styleName,
	time,
	width,
	height,
	font,
}: SkiaCanvasContentProps) {
	const config = SPLASH_STYLE_CONFIGS[styleName];
	const anim = useAnimationValues(time);

	const textWidth = font.measureText(TEXT)?.width ?? 0;
	const centerX = width / 2;
	const centerY = height / 2;
	const textX = centerX - textWidth / 2;
	const textY = centerY;

	const dimensions = useMemo(
		() => ({
			textWidth,
			centerX,
			centerY,
			textX,
			textY,
			screenWidth: width,
			screenHeight: height,
			fontSize: config.fontSize,
		}),
		[textWidth, centerX, centerY, textX, textY, width, height, config.fontSize],
	);

	const renderer = STYLE_RENDERERS[styleName];

	return (
		<Canvas style={{ width, height }}>
			{renderBackground(config, width, height)}
			{renderer({ font, config, anim, dimensions })}
		</Canvas>
	);
}

function SplashFallback({ width, height }: { width: number; height: number }) {
	return (
		<View style={[styles.fallback, { width, height }]}>
			<View style={styles.loadingIndicator} />
		</View>
	);
}

export function SingleStyleCanvas({
	styleName,
	time = 0,
	width = SCREEN_WIDTH,
	height = SCREEN_HEIGHT,
}: SingleStyleCanvasProps) {
	const [SkiaWeb, setSkiaWeb] = useState<React.ComponentType<{
		getComponent: () => Promise<{ default: React.ComponentType<any> }>;
		fallback?: React.ReactNode;
		opts?: { locateFile: (file: string) => string };
	}> | null>(null);
	const [isReady, setIsReady] = useState(false);
	const opacity = useSharedValue(0);

	useEffect(() => {
		if (Platform.OS === "web") {
			import("@shopify/react-native-skia/lib/module/web").then((mod) => {
				setSkiaWeb(() => mod.WithSkiaWeb);
			});
		} else {
			setIsReady(true);
		}
	}, []);

	useEffect(() => {
		if (isReady || SkiaWeb) {
			opacity.value = withTiming(1, { duration: 300 });
		}
	}, [isReady, SkiaWeb, opacity]);

	const animatedStyle = useAnimatedStyle(
		() => ({
			opacity: opacity.value,
		}),
		[],
	);

	const config = SPLASH_STYLE_CONFIGS[styleName];
	const font = useFont(config.fontUrl, config.fontSize);

	if (Platform.OS === "web") {
		if (!SkiaWeb) {
			return <SplashFallback width={width} height={height} />;
		}

		const CanvasComponent = () => {
			if (!font) return <SplashFallback width={width} height={height} />;
			return (
				<SkiaCanvasContent
					styleName={styleName}
					time={time}
					width={width}
					height={height}
					font={font}
				/>
			);
		};

		return (
			<Animated.View style={[{ width, height }, animatedStyle]}>
				<SkiaWeb
					getComponent={async () => ({ default: CanvasComponent })}
					fallback={<SplashFallback width={width} height={height} />}
					opts={{ locateFile: (file: string) => `/${file}` }}
				/>
			</Animated.View>
		);
	}

	if (!font) {
		return <SplashFallback width={width} height={height} />;
	}

	return (
		<Animated.View style={animatedStyle}>
			<SkiaCanvasContent
				styleName={styleName}
				time={time}
				width={width}
				height={height}
				font={font}
			/>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	fallback: {
		backgroundColor: "#0a0015",
		justifyContent: "center",
		alignItems: "center",
	},
	loadingIndicator: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: "#333",
	},
});

interface AnimatedSplashCanvasProps {
	width?: number;
	height?: number;
	styleInterval?: number;
	onStyleChange?: (styleName: SplashStyleName) => void;
}

export function AnimatedSplashCanvas({
	width = SCREEN_WIDTH,
	height = SCREEN_HEIGHT,
	styleInterval = 500,
	onStyleChange,
}: AnimatedSplashCanvasProps) {
	const [styleIndex, setStyleIndex] = useState(0);
	const [time, setTime] = useState(0);

	useEffect(() => {
		const startTime = Date.now();
		let frameId: number;

		const animate = () => {
			const elapsed = Date.now() - startTime;
			setTime(elapsed);

			const newStyleIndex =
				Math.floor(elapsed / styleInterval) % STYLE_NAMES.length;
			setStyleIndex((prev) => {
				if (prev !== newStyleIndex) {
					onStyleChange?.(STYLE_NAMES[newStyleIndex]);
				}
				return newStyleIndex;
			});

			frameId = requestAnimationFrame(animate);
		};

		frameId = requestAnimationFrame(animate);
		return () => cancelAnimationFrame(frameId);
	}, [styleInterval, onStyleChange]);

	const currentStyleName = STYLE_NAMES[styleIndex];

	return (
		<SingleStyleCanvas
			styleName={currentStyleName}
			time={time}
			width={width}
			height={height}
		/>
	);
}
