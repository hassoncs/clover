import {
	Canvas,
	Group,
	LinearGradient,
	Path,
	RadialGradient,
	Rect,
	Skia,
	TwoPointConicalGradient,
	vec,
} from "@shopify/react-native-skia";
import { useMemo } from "react";
import { Dimensions } from "react-native";
import { SPLASH_PATHS } from "./splashPaths";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface SplashSkiaCanvasProps {
	styleIndex: number;
	time: number;
}

const SCANLINE_COUNT = 40;
const GLITCH_BAR_POSITIONS = [0.3, 0.5, 0.7];
const GLITCH_BAR_COLORS = ["#ff0080", "#00ff80", "#8000ff"];
const NOISE_COUNT = 50;
const GRID_H_COUNT = 20;
const GRID_V_COUNT = 15;
const SPARK_POSITIONS = [0.2, 0.5, 0.8];

function SplashSkiaCanvas({ styleIndex, time }: SplashSkiaCanvasProps) {
	const paths = useMemo(() => {
		return SPLASH_PATHS.map((sp) => {
			const path = Skia.Path.MakeFromSVGString(sp.pathData);
			return {
				path,
				width: sp.width,
				height: sp.height,
				offsetX: sp.offsetX,
				offsetY: sp.offsetY,
				size: sp.size,
			};
		});
	}, []);

	const idx = styleIndex % paths.length;
	const {
		path: textPath,
		width: textWidth,
		height: textHeight,
		offsetX,
		offsetY,
		size: fontSize,
	} = paths[idx];

	if (!textPath) return null;

	const centerX = SCREEN_WIDTH / 2;
	const centerY = SCREEN_HEIGHT / 2;
	const textX = centerX - textWidth / 2 - offsetX;
	const textY = centerY - textHeight / 2 - offsetY;

	const t = time * 0.001;
	const pulse = Math.sin(t * 8) * 0.5 + 0.5;
	const wave = t * 3;

	return (
		<Canvas style={{ flex: 1 }}>
			{idx === 0 && (
				<>
					<Group transform={[{ translateX: textX + 6 }, { translateY: textY }]}>
						<Path path={textPath} color="#ff0040" opacity={0.6} />
					</Group>
					<Group transform={[{ translateX: textX - 6 }, { translateY: textY }]}>
						<Path path={textPath} color="#00ffff" opacity={0.6} />
					</Group>

					<Group transform={[{ translateX: textX }, { translateY: textY }]}>
						<Path path={textPath}>
							<LinearGradient
								start={vec(offsetX + Math.sin(wave) * 50, offsetY - fontSize)}
								end={vec(
									offsetX + textWidth + Math.cos(wave) * 50,
									offsetY + fontSize * 0.3,
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
						</Path>
					</Group>

					<Group transform={[{ translateX: textX }, { translateY: textY }]}>
						<Path path={textPath} opacity={0.3 + pulse * 0.2}>
							<LinearGradient
								start={vec(offsetX, offsetY - fontSize)}
								end={vec(offsetX + textWidth, offsetY)}
								colors={[
									"#ffffff",
									"#ffffff80",
									"#ffffff",
									"#ffffff80",
									"#ffffff",
								]}
							/>
						</Path>
					</Group>
				</>
			)}

			{idx === 1 && (
				<>
					<Group opacity={0.1}>
						{Array.from({ length: SCANLINE_COUNT }, (_, i) => {
							const rowY = i * (SCREEN_HEIGHT / SCANLINE_COUNT);
							return (
								<Rect
									key={`scanline-at-y-${rowY}`}
									x={0}
									y={rowY}
									width={SCREEN_WIDTH}
									height={2}
									color="#00ff00"
								/>
							);
						})}
					</Group>

					<Group
						transform={[
							{ translateX: textX + Math.sin(t * 20) * 8 },
							{ translateY: textY },
						]}
					>
						<Path path={textPath} color="#ff0000" opacity={0.7} />
					</Group>
					<Group
						transform={[
							{ translateX: textX + Math.cos(t * 15) * 8 },
							{ translateY: textY },
						]}
					>
						<Path path={textPath} color="#00ff00" opacity={0.7} />
					</Group>
					<Group
						transform={[
							{ translateX: textX },
							{ translateY: textY + Math.sin(t * 25) * 3 },
						]}
					>
						<Path path={textPath} color="#0000ff" opacity={0.7} />
					</Group>
					<Group transform={[{ translateX: textX }, { translateY: textY }]}>
						<Path path={textPath} color="#ffffff" />
					</Group>

					{GLITCH_BAR_POSITIONS.map((pos, i) => (
						<Rect
							key={`glitch-bar-${pos}`}
							x={textX + offsetX + Math.sin(t * 30 + i) * 100}
							y={textY + offsetY - fontSize * 0.5 + pos * fontSize}
							width={textWidth * (0.3 + Math.abs(Math.sin(t * 50 + i)) * 0.4)}
							height={3 + Math.sin(t * 50) * 2}
							color={GLITCH_BAR_COLORS[i]}
							opacity={0.5 + Math.sin(t * 40 + i * 2) * 0.3}
						/>
					))}
				</>
			)}

			{idx === 2 && (
				<>
					<Group
						transform={[{ translateX: textX + 3 }, { translateY: textY + 3 }]}
					>
						<Path path={textPath} color="#000000" opacity={0.4} />
					</Group>

					<Group transform={[{ translateX: textX }, { translateY: textY }]}>
						<Path path={textPath}>
							<LinearGradient
								start={vec(offsetX, offsetY - fontSize + Math.sin(wave) * 20)}
								end={vec(offsetX + textWidth, offsetY + Math.cos(wave) * 20)}
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
						</Path>
					</Group>

					<Group transform={[{ translateX: textX }, { translateY: textY }]}>
						<Path path={textPath}>
							<LinearGradient
								start={vec(offsetX + textWidth * 0.3, offsetY - fontSize)}
								end={vec(offsetX + textWidth * 0.5, offsetY)}
								colors={[
									"#ffffff00",
									"#ffffff80",
									"#ffffff",
									"#ffffff80",
									"#ffffff00",
								]}
							/>
						</Path>
					</Group>

					<Group transform={[{ translateX: textX - 1 }, { translateY: textY }]}>
						<Path path={textPath} color="#6080ff" opacity={0.3 + pulse * 0.2} />
					</Group>
					<Group transform={[{ translateX: textX + 1 }, { translateY: textY }]}>
						<Path path={textPath} color="#ff6080" opacity={0.3 + pulse * 0.2} />
					</Group>
				</>
			)}

			{idx === 3 && (
				<>
					<Group opacity={0.15}>
						{Array.from({ length: NOISE_COUNT }, (_, i) => {
							const noiseX = (Math.sin(i * 7.3) * 0.5 + 0.5) * SCREEN_WIDTH;
							const noiseY = (Math.cos(i * 11.7) * 0.5 + 0.5) * SCREEN_HEIGHT;
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

					<Group transform={[{ translateX: textX - 4 }, { translateY: textY }]}>
						<Path path={textPath} color="#ff0000" opacity={0.5} />
					</Group>
					<Group transform={[{ translateX: textX + 4 }, { translateY: textY }]}>
						<Path path={textPath} color="#0000ff" opacity={0.5} />
					</Group>

					<Group transform={[{ translateX: textX }, { translateY: textY }]}>
						<Path path={textPath}>
							<LinearGradient
								start={vec(offsetX, offsetY - fontSize)}
								end={vec(offsetX, offsetY + fontSize * 0.3)}
								colors={["#ff80ff", "#ff60c0", "#ff40a0", "#ff2080", "#ff0060"]}
							/>
						</Path>
					</Group>

					<Rect
						x={0}
						y={((t * 100) % (SCREEN_HEIGHT + 20)) - 10}
						width={SCREEN_WIDTH}
						height={4}
						color="#ffffff"
						opacity={0.3}
					/>

					<Group transform={[{ translateX: textX }, { translateY: textY }]}>
						<Path
							path={textPath}
							color="#ff00ff"
							opacity={0.2}
							blendMode="screen"
						/>
					</Group>
				</>
			)}

			{idx === 4 && (
				<>
					<Group transform={[{ translateX: textX }, { translateY: textY }]}>
						<Path path={textPath}>
							<RadialGradient
								r={fontSize * 1.5}
								c={vec(offsetX + textWidth / 2, offsetY + textHeight / 2)}
								colors={["#ff800080", "#ff400040", "#ff000020", "#00000000"]}
							/>
						</Path>
					</Group>

					<Group transform={[{ translateX: textX }, { translateY: textY }]}>
						<Path path={textPath}>
							<LinearGradient
								start={vec(offsetX, offsetY + Math.sin(wave) * 10)}
								end={vec(
									offsetX + textWidth,
									offsetY - fontSize + Math.cos(wave) * 10,
								)}
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
						</Path>
					</Group>

					<Group
						transform={[
							{ translateX: textX + Math.sin(t * 10) * 2 },
							{ translateY: textY - Math.sin(t * 8) * 2 },
						]}
					>
						<Path
							path={textPath}
							color="#ffff00"
							opacity={0.3}
							blendMode="screen"
						/>
					</Group>
					<Group
						transform={[
							{ translateX: textX + Math.cos(t * 12) * 2 },
							{ translateY: textY - Math.cos(t * 10) * 2 },
						]}
					>
						<Path
							path={textPath}
							color="#ff8000"
							opacity={0.2}
							blendMode="screen"
						/>
					</Group>
				</>
			)}

			{idx === 5 && (
				<>
					<Group opacity={0.05}>
						{Array.from({ length: GRID_H_COUNT }, (_, i) => {
							const gridY = i * (SCREEN_HEIGHT / GRID_H_COUNT);
							return (
								<Path
									key={`grid-h-y-${gridY}`}
									path={Skia.Path.Make()
										.moveTo(0, gridY)
										.lineTo(SCREEN_WIDTH, gridY)}
									color="#00ffff"
									style="stroke"
									strokeWidth={1}
								/>
							);
						})}
						{Array.from({ length: GRID_V_COUNT }, (_, i) => {
							const gridX = i * (SCREEN_WIDTH / GRID_V_COUNT);
							return (
								<Path
									key={`grid-v-x-${gridX}`}
									path={Skia.Path.Make()
										.moveTo(gridX, 0)
										.lineTo(gridX, SCREEN_HEIGHT)}
									color="#00ffff"
									style="stroke"
									strokeWidth={1}
								/>
							);
						})}
					</Group>

					<Group transform={[{ translateX: textX }, { translateY: textY }]}>
						<Path path={textPath} color="#00ffff" opacity={0.1} />
					</Group>
					<Group transform={[{ translateX: textX }, { translateY: textY }]}>
						<Path path={textPath} color="#00ffff" opacity={0.15} />
					</Group>
					<Group transform={[{ translateX: textX }, { translateY: textY }]}>
						<Path path={textPath} color="#00ffff" opacity={0.2} />
					</Group>

					<Group transform={[{ translateX: textX }, { translateY: textY }]}>
						<Path path={textPath}>
							<TwoPointConicalGradient
								start={vec(offsetX, offsetY - fontSize)}
								endR={textWidth}
								end={vec(offsetX + textWidth, offsetY + fontSize * 0.3)}
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
						</Path>
					</Group>

					<Group transform={[{ translateX: textX }, { translateY: textY }]}>
						<Path path={textPath} opacity={0.4 + pulse * 0.4}>
							<RadialGradient
								c={vec(offsetX + textWidth / 2, offsetY + textHeight / 2)}
								r={fontSize}
								colors={["#ffffff", "#00ffff00"]}
							/>
						</Path>
					</Group>

					{SPARK_POSITIONS.map((pos, i) => (
						<Rect
							key={`spark-pos-${pos}`}
							x={
								textX + offsetX + textWidth * pos + Math.sin(t * 50 + i * 3) * 5
							}
							y={
								textY + offsetY - fontSize * 0.3 + Math.cos(t * 40 + i * 2) * 8
							}
							width={2 + Math.sin(t * 60 + i) * 2}
							height={8 + Math.sin(t * 70 + i) * 5}
							color="#ffffff"
							opacity={0.5 + Math.sin(t * 80 + i * 4) * 0.3}
						/>
					))}
				</>
			)}
		</Canvas>
	);
}

export default SplashSkiaCanvas;
