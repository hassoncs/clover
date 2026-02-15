import type { GameVariable } from "@slopcade/shared";
import type { Meta, StoryObj } from "@storybook/react";
import { useRef, useState } from "react";
import { View } from "react-native";
import {
	KnobsFloatingButton,
	KnobsPanel,
	type KnobsPanelHandle,
} from "./KnobsPanel";

const meta: Meta<typeof KnobsPanel> = {
	title: "UI/Knobs/KnobsPanel",
	component: KnobsPanel,
	decorators: [
		(Story) => (
			<View className="flex-1 bg-gray-950 items-center justify-center">
				<Story />
			</View>
		),
	],
};

export default meta;

type Story = StoryObj<typeof KnobsPanel>;

const MOCK_VARIABLES: Record<string, GameVariable> = {
	gravity: {
		value: 9.8,
		tuning: { min: 0, max: 50, step: 0.1 },
		category: "physics",
		label: "Gravity",
		description: "World gravity strength",
	},
	friction: {
		value: 0.3,
		tuning: { min: 0, max: 1, step: 0.01 },
		category: "physics",
		label: "Friction",
	},
	restitution: {
		value: 0.8,
		tuning: { min: 0, max: 1, step: 0.01 },
		category: "physics",
		label: "Bounciness",
	},
	playerSpeed: {
		value: 5,
		tuning: { min: 1, max: 20, step: 0.5 },
		category: "gameplay",
		label: "Player Speed",
	},
	jumpForce: {
		value: 12,
		tuning: { min: 5, max: 30, step: 1 },
		category: "gameplay",
		label: "Jump Force",
	},
	autoSpawn: {
		value: true,
		knob: { controlType: "toggle" },
		category: "gameplay",
		label: "Auto Spawn",
		description: "Automatically spawn new objects",
	},
	ballColor: {
		value: "#EF4444",
		knob: {
			controlType: "color",
			presets: ["#EF4444", "#22C55E", "#3B82F6", "#8B5CF6", "#F59E0B"],
		},
		category: "visuals",
		label: "Ball Color",
	},
	trailEffect: {
		value: true,
		knob: { controlType: "toggle" },
		category: "visuals",
		label: "Trail Effect",
	},
	difficulty: {
		value: "medium",
		knob: {
			controlType: "select",
			options: [
				{ label: "Easy", value: "easy" },
				{ label: "Medium", value: "medium" },
				{ label: "Hard", value: "hard" },
			],
		},
		category: "gameplay",
		label: "Difficulty",
	},
	debugMode: {
		value: false,
		knob: { controlType: "toggle" },
		label: "Debug Mode",
	},
};

export const Default: Story = {
	render: () => {
		const [variables] = useState(MOCK_VARIABLES);
		const [currentValues, setCurrentValues] = useState<Record<string, unknown>>(
			Object.fromEntries(
				Object.entries(MOCK_VARIABLES).map(([k, v]) => [
					k,
					typeof v === "object" && "value" in v ? v.value : v,
				]),
			),
		);
		const panelRef = useRef<KnobsPanelHandle>(null);

		const handleVariableChange = (key: string, value: unknown) => {
			setCurrentValues((prev) => ({ ...prev, [key]: value }));
			console.log(`Changed ${key} to`, value);
		};

		return (
			<View className="flex-1 w-full h-full">
				<KnobsFloatingButton onPress={() => panelRef.current?.open()} />
				<KnobsPanel
					ref={panelRef}
					variables={variables}
					currentValues={currentValues}
					onVariableChange={handleVariableChange}
				/>
			</View>
		);
	},
};
