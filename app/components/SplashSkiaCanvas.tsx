import {
	Canvas,
	Group,
	LinearGradient,
	Path,
	RadialGradient,
	Rect,
	Skia,
	Text,
	TwoPointConicalGradient,
	useFont,
	vec,
} from "@shopify/react-native-skia";
import { Dimensions } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface SplashSkiaCanvasProps {
	styleIndex: number;
	time: number;
}

const TEXT = "SLOPCADE";

const FONT_CONFIGS = [
	{
		family: "Bangers",
		size: 80,
		file: require("../assets/fonts/Bangers-Regular.ttf"),
	},
	{
		family: "PressStart2P",
		size: 32,
		file: require("../assets/fonts/PressStart2P-Regular.ttf"),
	},
	{
		family: "Fredoka",
		size: 72,
		file: require("../assets/fonts/Fredoka-Bold.ttf"),
	},
	{ family: "Lora", size: 68, file: require("../assets/fonts/Lora-Bold.ttf") },
	{
		family: "Bangers",
		size: 85,
		file: require("../assets/fonts/Bangers-Regular.ttf"),
	},
	{
		family: "PressStart2P",
		size: 30,
		file: require("../assets/fonts/PressStart2P-Regular.ttf"),
	},
];

const BG_COLORS = [
	["#0a0015", "#150025", "#0a0015"],
	["#000000", "#0a0a0a", "#000000"],
	["#1a1a2e", "#16213e", "#1a1a2e"],
	["#0d0d0d", "#1a0a1a", "#0d0d0d"],
	["#1a0500", "#2d0a00", "#1a0500"],
	["#000a0a", "#001a1a", "#000a0a"],
];

const SCANLINE_COUNT = 40;
const GLITCH_BAR_POSITIONS = [0.3, 0.5, 0.7];
const GLITCH_BAR_COLORS = ["#ff0080", "#00ff80", "#8000ff"];
const NOISE_COUNT = 50;
const GRID_H_COUNT = 20;
const GRID_V_COUNT = 15;
const SPARK_POSITIONS = [0.2, 0.5, 0.8];

function SplashSkiaCanvas({ styleIndex, time }: SplashSkiaCanvasProps) {
	const idx = styleIndex % FONT_CONFIGS.length;
	const fontConfig = FONT_CONFIGS[idx];
	const bgColors = BG_COLORS[idx];

	const font = useFont(fontConfig.file, fontConfig.size);
	if (!font) return null;

	const textWidth = font.getTextWidth(TEXT);
	const centerX = SCREEN_WIDTH / 2;
	const centerY = SCREEN_HEIGHT / 2;
	const textX = centerX - textWidth / 2;
	const textY = centerY;

	const t = time * 0.001;
	const pulse = Math.sin(t * 8) * 0.5 + 0.5;
	const wave = t * 3;

	return (
		<Canvas style={{ flex: 1 }}>
			<Rect x={0} y={0} width={SCREEN_WIDTH} height={SCREEN_HEIGHT}>
				<LinearGradient
					start={vec(0, 0)}
					end={vec(0, SCREEN_HEIGHT)}
					colors={bgColors as string[]}
				/>
			</Rect>

			{idx === 0 && (
				<>
					<Rect x={0} y={0} width={SCREEN_WIDTH} height={SCREEN_HEIGHT}>
						<LinearGradient
							start={vec(-200 + (t % 3) * (SCREEN_WIDTH + 400), 0)}
							end={vec(
								SCREEN_WIDTH + 200 - (t % 3) * (SCREEN_WIDTH + 400),
								SCREEN_HEIGHT,
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
							start={vec(textX + Math.sin(wave) * 50, textY - fontConfig.size)}
							end={vec(
								textX + textWidth + Math.cos(wave) * 50,
								textY + fontConfig.size * 0.3,
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
							start={vec(textX, textY - fontConfig.size)}
							end={vec(textX + textWidth, textY)}
							colors={[
								"#ffffff",
								"#ffffff80",
								"#ffffff",
								"#ffffff80",
								"#ffffff",
							]}
						/>
					</Text>
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
							y={textY - fontConfig.size * 0.5 + pos * fontConfig.size}
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
							start={vec(textX, textY - fontConfig.size + Math.sin(wave) * 20)}
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
							start={vec(textX + textWidth * 0.3, textY - fontConfig.size)}
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
							start={vec(textX, textY - fontConfig.size)}
							end={vec(textX, textY + fontConfig.size * 0.3)}
							colors={["#ff80ff", "#ff60c0", "#ff40a0", "#ff2080", "#ff0060"]}
						/>
					</Text>

					<Rect
						x={0}
						y={((t * 100) % (SCREEN_HEIGHT + 20)) - 10}
						width={SCREEN_WIDTH}
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
			)}

			{idx === 4 && (
				<>
					<Rect x={0} y={0} width={SCREEN_WIDTH} height={SCREEN_HEIGHT}>
						<LinearGradient
							start={vec(0, SCREEN_HEIGHT)}
							end={vec(0, 0)}
							colors={["#ff200080", "#ff400060", "#ff600040", "#ff800020"]}
						/>
					</Rect>

					<Text font={font} text={TEXT} x={textX} y={textY}>
						<RadialGradient
							r={fontConfig.size * 1.5}
							c={vec(centerX, centerY)}
							colors={["#ff800080", "#ff400040", "#ff000020", "#00000000"]}
						/>
					</Text>

					<Text font={font} text={TEXT} x={textX} y={textY}>
						<LinearGradient
							start={vec(textX, textY + Math.sin(wave) * 10)}
							end={vec(
								textX + textWidth,
								textY - fontConfig.size + Math.cos(wave) * 10,
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
							start={vec(textX, textY - fontConfig.size)}
							endR={textWidth}
							end={vec(textX + textWidth, textY + fontConfig.size * 0.3)}
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
							r={fontConfig.size}
							colors={["#ffffff", "#00ffff00"]}
						/>
					</Text>

					{SPARK_POSITIONS.map((pos, i) => (
						<Rect
							key={`spark-pos-${pos}`}
							x={textX + textWidth * pos + Math.sin(t * 50 + i * 3) * 5}
							y={textY - fontConfig.size * 0.3 + Math.cos(t * 40 + i * 2) * 8}
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
