import {
	Canvas,
	Circle,
	Group,
	LinearGradient,
	Path,
	RadialGradient,
	Rect,
	Skia,
	vec,
} from "@shopify/react-native-skia";
import { Dimensions } from "react-native";
import type { SplashPreviewCanvasProps, SplashStyleName } from "./types";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const SCANLINE_COUNT = 40;
const NOISE_COUNT = 50;
const GRID_H_COUNT = 20;
const GRID_V_COUNT = 15;
const MIN_CANVAS_DIMENSION = 100;
const MIN_SHAPE_SIZE = 10;

function useAnimationValues(time: number) {
	const t = time * 0.001;
	const pulse = Math.sin(t * 8) * 0.5 + 0.5;
	const wave = t * 3;
	return { t, pulse, wave };
}

const BG_COLORS: Record<SplashStyleName, string[]> = {
	Holographic: ["#0a0015", "#150025", "#0a0015"],
	"Glitch Digital": ["#000000", "#0a0a0a", "#000000"],
	"Liquid Chrome": ["#1a1a2e", "#16213e", "#1a1a2e"],
	"VHS Retro": ["#0d0d0d", "#1a0a1a", "#0d0d0d"],
	"Fire Plasma": ["#1a0500", "#2d0a00", "#1a0500"],
	"Electric Neon": ["#000a0a", "#001a1a", "#000a0a"],
};

function RenderHolographic({
	width,
	height,
	centerX,
	centerY,
	size,
	t,
}: StyleRenderProps) {
	return (
		<>
			<Rect x={0} y={0} width={width} height={height}>
				<LinearGradient
					start={vec(-200 + (t % 3) * (width + 400), 0)}
					end={vec(width + 200 - (t % 3) * (width + 400), height)}
					colors={[
						"#ff008040",
						"#ff00ff40",
						"#8000ff40",
						"#0080ff40",
						"#00ffff40",
						"#00ff8040",
						"#80ff0040",
						"#ffff0040",
						"#ff800040",
						"#ff008040",
					]}
				/>
			</Rect>
			<Circle cx={centerX + 8} cy={centerY} r={size}>
				<LinearGradient
					start={vec(centerX - size, centerY - size)}
					end={vec(centerX + size, centerY + size)}
					colors={["#ff0080", "#ff00ff", "#8000ff", "#00ffff", "#80ff00"]}
				/>
			</Circle>
			<Circle cx={centerX - 8} cy={centerY} r={size}>
				<LinearGradient
					start={vec(centerX - size, centerY - size)}
					end={vec(centerX + size, centerY + size)}
					colors={["#00ffff80", "#80ff0080", "#ffff0080"]}
				/>
			</Circle>
			<Circle cx={centerX} cy={centerY} r={size}>
				<RadialGradient
					c={vec(centerX, centerY)}
					r={size}
					colors={["#ffffff", "#ff00ff", "#8000ff", "#0080ff"]}
				/>
			</Circle>
		</>
	);
}

function RenderGlitchDigital({
	width,
	height,
	centerX,
	centerY,
	size,
	t,
}: StyleRenderProps) {
	return (
		<>
			<Group opacity={0.1}>
				{Array.from({ length: SCANLINE_COUNT }, (_, i) => {
					const rowY = i * (height / SCANLINE_COUNT);
					return (
						<Rect
							key={`scan-${rowY.toFixed(0)}`}
							x={0}
							y={rowY}
							width={width}
							height={2}
							color="#00ff00"
						/>
					);
				})}
			</Group>
			<Circle
				cx={centerX + Math.sin(t * 20) * 15}
				cy={centerY}
				r={size * 0.9}
				color="#ff000050"
			/>
			<Circle
				cx={centerX + Math.cos(t * 15) * 15}
				cy={centerY}
				r={size * 0.9}
				color="#00ff0050"
			/>
			<Circle
				cx={centerX}
				cy={centerY + Math.sin(t * 25) * 5}
				r={size * 0.9}
				color="#0000ff50"
			/>
			<Circle cx={centerX} cy={centerY} r={size} color="#ffffff" />
			{[0.3, 0.5, 0.7].map((pos) => (
				<Rect
					key={`glitch-${pos}`}
					x={centerX - size + Math.sin(t * 30 + pos * 10) * 50}
					y={centerY - size * 0.5 + pos * size}
					width={size * 2 * (0.3 + Math.abs(Math.sin(t * 50 + pos * 10)) * 0.3)}
					height={5}
					color={pos === 0.3 ? "#ff0080" : pos === 0.5 ? "#00ff80" : "#8000ff"}
					opacity={0.7}
				/>
			))}
		</>
	);
}

function RenderLiquidChrome({
	centerX,
	centerY,
	size,
	wave,
	pulse,
}: StyleRenderProps) {
	return (
		<>
			<Circle cx={centerX + 3} cy={centerY + 3} r={size} color="#00000050" />
			<Circle cx={centerX} cy={centerY} r={size}>
				<LinearGradient
					start={vec(centerX - size + Math.sin(wave) * 20, centerY - size)}
					end={vec(centerX + size + Math.cos(wave) * 20, centerY + size)}
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
						"#ffffff",
						"#a0a0b0",
						"#4a4a5a",
					]}
				/>
			</Circle>
			<Circle
				cx={centerX - 2}
				cy={centerY}
				r={size * 0.95}
				color="#6080ff"
				opacity={0.3 + pulse * 0.2}
			/>
			<Circle
				cx={centerX + 2}
				cy={centerY}
				r={size * 0.95}
				color="#ff6080"
				opacity={0.3 + pulse * 0.2}
			/>
		</>
	);
}

function RenderVHSRetro({
	width,
	height,
	centerX,
	centerY,
	size,
	t,
}: StyleRenderProps) {
	return (
		<>
			<Group opacity={0.15}>
				{Array.from({ length: NOISE_COUNT }, (_, i) => {
					const noiseX = (Math.sin(i * 7.3) * 0.5 + 0.5) * width;
					const noiseY = (Math.cos(i * 11.7) * 0.5 + 0.5) * height;
					const noiseColor = i % 2 === 0 ? "#ff00ff" : "#00ffff";
					return (
						<Rect
							key={`noise-${noiseX.toFixed(0)}-${noiseY.toFixed(0)}`}
							x={noiseX}
							y={noiseY}
							width={2 + Math.abs(Math.sin(i * 3.1)) * 10}
							height={1 + Math.abs(Math.cos(i * 5.9)) * 3}
							color={noiseColor}
						/>
					);
				})}
			</Group>
			<Circle cx={centerX - 8} cy={centerY} r={size} color="#ff000050" />
			<Circle cx={centerX + 8} cy={centerY} r={size} color="#0000ff50" />
			<Circle cx={centerX} cy={centerY} r={size}>
				<LinearGradient
					start={vec(centerX, centerY - size)}
					end={vec(centerX, centerY + size)}
					colors={["#ff80ff", "#ff60c0", "#ff40a0", "#ff2080", "#ff0060"]}
				/>
			</Circle>
			<Rect
				x={0}
				y={((t * 100) % (height + 20)) - 10}
				width={width}
				height={4}
				color="#ffffff"
				opacity={0.5}
			/>
		</>
	);
}

function RenderFirePlasma({
	width,
	height,
	centerX,
	centerY,
	size,
	wave,
	t,
}: StyleRenderProps) {
	return (
		<>
			<Rect x={0} y={0} width={width} height={height}>
				<LinearGradient
					start={vec(0, height)}
					end={vec(0, 0)}
					colors={["#ff200080", "#ff400060", "#ff600040", "#ff800020"]}
				/>
			</Rect>
			<Circle cx={centerX} cy={centerY} r={size * 1.2}>
				<RadialGradient
					r={size * 1.2}
					c={vec(centerX, centerY)}
					colors={["#ff800080", "#ff400040", "#ff000020", "#00000000"]}
				/>
			</Circle>
			<Circle cx={centerX} cy={centerY} r={size}>
				<LinearGradient
					start={vec(centerX - size + Math.sin(wave) * 10, centerY)}
					end={vec(centerX + size + Math.cos(wave) * 10, centerY - size)}
					colors={[
						"#ff0000",
						"#ff4000",
						"#ff8000",
						"#ffc000",
						"#ffff80",
						"#ffffff",
						"#ffff80",
						"#ffc000",
						"#ff8000",
						"#ff0000",
					]}
				/>
			</Circle>
			<Circle
				cx={centerX + Math.sin(t * 10) * 5}
				cy={centerY - Math.sin(t * 8) * 5}
				r={size * 0.9}
				color="#ffff00"
				opacity={0.3}
			/>
		</>
	);
}

function RenderElectricNeon({
	width,
	height,
	centerX,
	centerY,
	size,
	t,
	pulse,
}: StyleRenderProps) {
	return (
		<>
			<Group opacity={0.05}>
				{Array.from({ length: GRID_H_COUNT }, (_, i) => {
					const gridY = i * (height / GRID_H_COUNT);
					const path = Skia.Path.Make();
					path.moveTo(0, gridY);
					path.lineTo(width, gridY);
					return (
						<Path
							key={`gh-${gridY.toFixed(0)}`}
							path={path}
							color="#00ffff"
							style="stroke"
							strokeWidth={1}
						/>
					);
				})}
				{Array.from({ length: GRID_V_COUNT }, (_, i) => {
					const gridX = i * (width / GRID_V_COUNT);
					const path = Skia.Path.Make();
					path.moveTo(gridX, 0);
					path.lineTo(gridX, height);
					return (
						<Path
							key={`gv-${gridX.toFixed(0)}`}
							path={path}
							color="#00ffff"
							style="stroke"
							strokeWidth={1}
						/>
					);
				})}
			</Group>
			<Circle
				cx={centerX}
				cy={centerY}
				r={size * 1.1}
				color="#00ffff"
				opacity={0.1}
			/>
			<Circle
				cx={centerX}
				cy={centerY}
				r={size * 1.05}
				color="#00ffff"
				opacity={0.15}
			/>
			<Circle
				cx={centerX}
				cy={centerY}
				r={size}
				color="#00ffff"
				opacity={0.2}
			/>
			<Circle cx={centerX} cy={centerY} r={size}>
				<RadialGradient
					c={vec(centerX, centerY)}
					r={size}
					colors={[
						"#00ffff",
						"#00ff80",
						"#80ff00",
						"#ffff00",
						"#ff8000",
						"#ff0080",
					]}
				/>
			</Circle>
			<Circle
				cx={centerX}
				cy={centerY}
				r={size * 0.8}
				opacity={0.4 + pulse * 0.4}
			>
				<RadialGradient
					c={vec(centerX, centerY)}
					r={size * 0.8}
					colors={["#ffffff", "#00ffff00"]}
				/>
			</Circle>
			{[0.2, 0.5, 0.8].map((pos) => (
				<Rect
					key={`spark-${pos}`}
					x={centerX - size + size * 2 * pos + Math.sin(t * 50 + pos * 30) * 10}
					y={centerY - 10 + Math.cos(t * 40 + pos * 20) * 15}
					width={4 + Math.sin(t * 60 + pos * 10) * 3}
					height={12 + Math.sin(t * 70 + pos * 10) * 8}
					color="#ffffff"
					opacity={0.6}
				/>
			))}
		</>
	);
}

interface StyleRenderProps {
	width: number;
	height: number;
	centerX: number;
	centerY: number;
	size: number;
	t: number;
	pulse: number;
	wave: number;
}

const STYLE_RENDERERS: Record<SplashStyleName, React.FC<StyleRenderProps>> = {
	Holographic: RenderHolographic,
	"Glitch Digital": RenderGlitchDigital,
	"Liquid Chrome": RenderLiquidChrome,
	"VHS Retro": RenderVHSRetro,
	"Fire Plasma": RenderFirePlasma,
	"Electric Neon": RenderElectricNeon,
};

export default function SplashPreviewCanvas({
	styleName,
	time = 0,
	width: inputWidth,
	height: inputHeight,
}: SplashPreviewCanvasProps) {
	const width = Math.max(MIN_CANVAS_DIMENSION, inputWidth ?? SCREEN_WIDTH);
	const height = Math.max(MIN_CANVAS_DIMENSION, inputHeight ?? SCREEN_HEIGHT);

	const { t, pulse, wave } = useAnimationValues(time);
	const centerX = width / 2;
	const centerY = height / 2;
	const size = Math.max(MIN_SHAPE_SIZE, Math.min(width, height) * 0.3);

	const colors = BG_COLORS[styleName];
	const StyleRenderer = STYLE_RENDERERS[styleName];

	return (
		<Canvas style={{ width, height }}>
			<Rect x={0} y={0} width={width} height={height}>
				<LinearGradient
					start={vec(0, 0)}
					end={vec(0, height)}
					colors={colors}
				/>
			</Rect>
			<StyleRenderer
				width={width}
				height={height}
				centerX={centerX}
				centerY={centerY}
				size={size}
				t={t}
				pulse={pulse}
				wave={wave}
			/>
		</Canvas>
	);
}
