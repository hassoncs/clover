import { Canvas, Circle, Rect, vec } from "@shopify/react-native-skia";
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { View } from "react-native";
import {
	SplashPreview,
	type SplashStyleName,
	STYLE_NAMES,
} from "./SplashPreview";

const meta: Meta<typeof SplashPreview> = {
	title: "SplashScreen/Styles",
	component: SplashPreview,
	argTypes: {
		styleName: {
			control: "select",
			options: [...STYLE_NAMES],
		},
		time: {
			control: { type: "range", min: 0, max: 5000, step: 100 },
		},
	},
	decorators: [
		(Story) => (
			<View style={{ flex: 1, minHeight: 400, backgroundColor: "#000" }}>
				<Story />
			</View>
		),
	],
};

export default meta;

type Story = StoryObj<typeof SplashPreview>;

export const MinimalTest: Story = {
	render: () => (
		<Canvas style={{ width: 400, height: 300 }}>
			<Rect x={0} y={0} width={400} height={300} color="#1a1a2e" />
			<Circle cx={200} cy={150} r={80} color="#ff0080" />
		</Canvas>
	),
};

export const Holographic: Story = {
	args: {
		styleName: "Holographic",
		time: 1000,
	},
};

export const GlitchDigital: Story = {
	args: {
		styleName: "Glitch Digital",
		time: 1000,
	},
};

export const LiquidChrome: Story = {
	args: {
		styleName: "Liquid Chrome",
		time: 1000,
	},
};

export const VHSRetro: Story = {
	args: {
		styleName: "VHS Retro",
		time: 1000,
	},
};

export const FirePlasma: Story = {
	args: {
		styleName: "Fire Plasma",
		time: 1000,
	},
};

export const ElectricNeon: Story = {
	args: {
		styleName: "Electric Neon",
		time: 1000,
	},
};

export const AllStyles: Story = {
	render: () => (
		<View
			style={{
				flexDirection: "row",
				flexWrap: "wrap",
				gap: 16,
				padding: 16,
				backgroundColor: "#111",
			}}
		>
			{STYLE_NAMES.map((styleName) => (
				<View key={styleName} style={{ width: 280, height: 180 }}>
					<SplashPreview
						styleName={styleName}
						time={2000}
						width={280}
						height={180}
					/>
				</View>
			))}
		</View>
	),
};

export const Animated: Story = {
	render: () => {
		const [currentIndex, setCurrentIndex] = useState(0);
		const currentStyle = STYLE_NAMES[currentIndex];

		return (
			<View style={{ flex: 1, minHeight: 500 }}>
				<View
					style={{
						position: "absolute",
						top: 16,
						left: 16,
						backgroundColor: "rgba(0,0,0,0.7)",
						paddingHorizontal: 12,
						paddingVertical: 6,
						borderRadius: 6,
						zIndex: 10,
					}}
				>
					<span style={{ color: "#fff", fontWeight: "bold" }}>
						{currentStyle}
					</span>
				</View>
				<SplashPreview styleName={currentStyle} />
				<button
					type="button"
					onClick={() => setCurrentIndex((i) => (i + 1) % STYLE_NAMES.length)}
					style={{
						position: "absolute",
						bottom: 16,
						right: 16,
						padding: "8px 16px",
						backgroundColor: "#60a5fa",
						color: "#fff",
						border: "none",
						borderRadius: 6,
						cursor: "pointer",
						zIndex: 10,
					}}
				>
					Next Style
				</button>
			</View>
		);
	},
};

export const Interactive: Story = {
	args: {
		styleName: "Holographic",
		time: 1000,
	},
	render: (args) => {
		const [styleName, setStyleName] = useState<SplashStyleName>(args.styleName);
		const [time, setTime] = useState(args.time ?? 0);

		return (
			<View style={{ flex: 1, minHeight: 400 }}>
				<View
					style={{
						flexDirection: "row",
						gap: 8,
						padding: 12,
						backgroundColor: "#1a1a1a",
						flexWrap: "wrap",
					}}
				>
					{STYLE_NAMES.map((name) => (
						<button
							key={name}
							type="button"
							onClick={() => setStyleName(name)}
							style={{
								padding: "8px 16px",
								backgroundColor: styleName === name ? "#60a5fa" : "#333",
								color: "#fff",
								border: "none",
								borderRadius: 6,
								cursor: "pointer",
							}}
						>
							{name}
						</button>
					))}
				</View>
				<View style={{ padding: 12, backgroundColor: "#1a1a1a" }}>
					<input
						type="range"
						min={0}
						max={5000}
						step={100}
						value={time}
						onChange={(e) => setTime(Number(e.target.value))}
						style={{ width: "100%" }}
					/>
					<span style={{ color: "#888", marginLeft: 8 }}>Time: {time}ms</span>
				</View>
				<View style={{ flex: 1 }}>
					<SplashPreview styleName={styleName} time={time} />
				</View>
			</View>
		);
	},
};
