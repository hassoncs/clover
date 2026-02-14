import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { GrainOverlay } from "./index";
import type { GrainOverlayProps } from "./types";

const meta: Meta<typeof GrainOverlay> = {
	title: "Grainient/GrainOverlay",
	component: GrainOverlay,
	decorators: [
		(Story, context) => {
			const bgColor = context.parameters?.backgroundColor || "#7B2FBE";
			return (
				<View
					style={{
						width: 300,
						height: 300,
						backgroundColor: bgColor,
						position: "relative",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<Story />
				</View>
			);
		},
	],
};

export default meta;

type Story = StoryObj<typeof GrainOverlay>;

export const Default: Story = {
	args: {},
};

export const Strong: Story = {
	args: {
		opacity: 0.5,
		blendMode: "multiply",
	},
};

export const GreenSurface: Story = {
	args: {
		opacity: 0.15,
		blendMode: "overlay",
	},
	parameters: {
		backgroundColor: "#22C55E",
	},
};

export const GreenTactical: Story = {
	args: {
		opacity: 0.25,
		blendMode: "multiply",
	},
	parameters: {
		backgroundColor: "#15803D",
	},
	decorators: [
		(Story) => (
			<View
				style={{
					width: 300,
					height: 300,
					backgroundColor: "#15803D",
					position: "relative",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<Story />
				<Text
					style={{
						color: "#4ADE80",
						fontSize: 24,
						fontWeight: "bold",
						letterSpacing: 2,
					}}
				>
					TACTICAL
				</Text>
			</View>
		),
	],
};

const PlaygroundComponent = () => {
	const [opacity, setOpacity] = useState(0.15);
	const [blendMode, setBlendMode] =
		useState<GrainOverlayProps["blendMode"]>("overlay");
	const [bgColor, setBgColor] = useState("#22C55E");

	return (
		<View style={styles.playgroundContainer}>
			<View style={styles.controlsPanel}>
				<Text style={styles.panelTitle}>Grain Controls</Text>

				<View style={styles.controlRow}>
					<Text style={styles.label}>Opacity: {opacity.toFixed(2)}</Text>
					<input
						type="range"
						min="0"
						max="1"
						step="0.01"
						value={opacity}
						onChange={(e) =>
							setOpacity(parseFloat((e.target as HTMLInputElement).value))
						}
					/>
				</View>

				<View style={styles.controlRow}>
					<Text style={styles.label}>Blend Mode</Text>
					<select
						value={blendMode}
						onChange={(e) =>
							setBlendMode(
								(e.target as HTMLSelectElement)
									.value as GrainOverlayProps["blendMode"],
							)
						}
						style={{
							width: "100%",
							padding: 8,
							borderRadius: 6,
							backgroundColor: "#2a2a3a",
							color: "#fff",
						}}
					>
						<option value="overlay">overlay</option>
						<option value="multiply">multiply</option>
						<option value="soft-light">soft-light</option>
						<option value="screen">screen</option>
						<option value="darken">darken</option>
						<option value="lighten">lighten</option>
						<option value="color-dodge">color-dodge</option>
						<option value="color-burn">color-burn</option>
						<option value="hard-light">hard-light</option>
						<option value="difference">difference</option>
					</select>
				</View>

				<View style={styles.controlRow}>
					<Text style={styles.label}>Background</Text>
					<input
						type="color"
						value={bgColor}
						onChange={(e) => setBgColor((e.target as HTMLInputElement).value)}
					/>
				</View>

				<View style={styles.presetsRow}>
					<Text style={styles.label}>Presets:</Text>
					<View style={styles.presetButtons}>
						<button
							type="button"
							onClick={() => {
								setBgColor("#22C55E");
								setOpacity(0.15);
								setBlendMode("overlay");
							}}
						>
							Green
						</button>
						<button
							type="button"
							onClick={() => {
								setBgColor("#7B2FBE");
								setOpacity(0.1);
								setBlendMode("overlay");
							}}
						>
							Purple
						</button>
						<button
							type="button"
							onClick={() => {
								setBgColor("#15803D");
								setOpacity(0.25);
								setBlendMode("multiply");
							}}
						>
							Tactical
						</button>
						<button
							type="button"
							onClick={() => {
								setBgColor("#1a1a2e");
								setOpacity(0.2);
								setBlendMode("overlay");
							}}
						>
							Dark
						</button>
					</View>
				</View>
			</View>

			<View style={[styles.previewContainer, { backgroundColor: bgColor }]}>
				<GrainOverlay opacity={opacity} blendMode={blendMode} />
				<Text style={styles.previewText}>GRAINIENT</Text>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	playgroundContainer: {
		flexDirection: "row",
		gap: 24,
		padding: 16,
		minWidth: 700,
	},
	controlsPanel: {
		width: 280,
		padding: 16,
		backgroundColor: "#1e1e2e",
		borderRadius: 12,
		gap: 12,
	},
	panelTitle: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "bold",
		marginBottom: 8,
	},
	controlRow: {
		gap: 8,
	},
	label: {
		color: "#a0a0b0",
		fontSize: 12,
		fontFamily: "monospace",
	},
	presetsRow: {
		marginTop: 8,
		gap: 8,
	},
	presetButtons: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	previewContainer: {
		width: 400,
		height: 300,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		position: "relative",
		overflow: "hidden",
	},
	previewText: {
		color: "#fff",
		fontSize: 32,
		fontWeight: "bold",
		letterSpacing: 4,
		opacity: 0.9,
	},
});

export const Playground: Story = {
	render: () => <PlaygroundComponent />,
};
