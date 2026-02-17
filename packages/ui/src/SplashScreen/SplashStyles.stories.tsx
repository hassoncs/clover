import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { View } from "react-native";
import { SplashPreview } from "./SplashPreview";
import type { SplashStyleName } from "./types";
import { STYLE_NAMES } from "./types";

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

export const Holographic: Story = {
	args: { styleName: "Holographic", time: 1000, width: 400, height: 300 },
};

export const GlitchDigital: Story = {
	args: { styleName: "Glitch Digital", time: 1000, width: 400, height: 300 },
};

export const LiquidChrome: Story = {
	args: { styleName: "Liquid Chrome", time: 1000, width: 400, height: 300 },
};

export const VHSRetro: Story = {
	args: { styleName: "VHS Retro", time: 1000, width: 400, height: 300 },
};

export const FirePlasma: Story = {
	args: { styleName: "Fire Plasma", time: 1000, width: 400, height: 300 },
};

export const ElectricNeon: Story = {
	args: { styleName: "Electric Neon", time: 1000, width: 400, height: 300 },
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
					<SplashPreview styleName={styleName} time={2000} width={280} height={180} />
				</View>
			))}
		</View>
	),
};

export const Interactive: Story = {
	args: { styleName: "Holographic", time: 1000 },
	render: (args) => {
		const [styleName, setStyleName] = useState<SplashStyleName>(args.styleName);
		const [time, setTime] = useState(args.time ?? 0);

		return (
			<View style={{ flex: 1, minHeight: 400 }}>
				<View style={{ flexDirection: "row", gap: 8, padding: 12, backgroundColor: "#1a1a1a", flexWrap: "wrap" }}>
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
					<SplashPreview styleName={styleName} time={time} width={400} height={300} />
				</View>
			</View>
		);
	},
};
