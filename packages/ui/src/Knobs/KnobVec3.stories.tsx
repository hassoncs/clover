import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { View } from "react-native";
import { KnobVec3 } from "./KnobVec3";

const meta: Meta<typeof KnobVec3> = {
	title: "UI/Knobs/Vec3",
	component: KnobVec3,
	tags: ["autodocs"],
	decorators: [
		(Story) => (
			<View style={{ padding: 20, backgroundColor: "#111827", flex: 1 }}>
				<Story />
			</View>
		),
	],
	argTypes: {
		onChange: { action: "changed" },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

const InteractiveVec3 = (args: any) => {
	const [value, setValue] = useState(args.value);
	return (
		<KnobVec3
			{...args}
			value={value}
			onChange={(v) => {
				setValue(v);
				args.onChange?.(v);
			}}
		/>
	);
};

export const Default: Story = {
	render: InteractiveVec3,
	args: {
		label: "Direction",
		value: { x: 0, y: 0, z: 0 },
		min: { x: -1, y: -1, z: -1 },
		max: { x: 1, y: 1, z: 1 },
		step: 0.1,
	},
};

export const Position: Story = {
	render: InteractiveVec3,
	args: {
		label: "Position",
		value: { x: 50, y: 50, z: 50 },
		min: { x: 0, y: 0, z: 0 },
		max: { x: 100, y: 100, z: 100 },
		step: 1,
	},
};

export const WithDescription: Story = {
	render: InteractiveVec3,
	args: {
		label: "Scale",
		description: "Scale factor for the object in 3D space",
		value: { x: 1, y: 1, z: 1 },
		min: { x: 0.1, y: 0.1, z: 0.1 },
		max: { x: 5, y: 5, z: 5 },
		step: 0.1,
	},
};
