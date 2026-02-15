import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { View } from "react-native";
import { KnobCategoryGroup } from "./KnobCategoryGroup";
import { KnobSlider } from "./KnobSlider";

const meta: Meta<typeof KnobCategoryGroup> = {
	title: "UI/Knobs/CategoryGroup",
	component: KnobCategoryGroup,
	decorators: [
		(Story) => (
			<View className="flex-1 bg-gray-900 p-4">
				<Story />
			</View>
		),
	],
};

export default meta;

type Story = StoryObj<typeof KnobCategoryGroup>;

export const Expanded: Story = {
	args: {
		category: "physics",
		defaultExpanded: true,
		itemCount: 3,
		children: (
			<>
				<KnobSlider
					label="Gravity"
					value={9.8}
					min={0}
					max={20}
					onChange={() => {}}
				/>
				<KnobSlider
					label="Friction"
					value={0.5}
					min={0}
					max={1}
					onChange={() => {}}
				/>
				<KnobSlider
					label="Restitution"
					value={0.8}
					min={0}
					max={1}
					onChange={() => {}}
				/>
			</>
		),
	},
};

export const Collapsed: Story = {
	args: {
		category: "gameplay",
		defaultExpanded: false,
		itemCount: 5,
		children: (
			<KnobSlider
				label="Speed"
				value={10}
				min={0}
				max={100}
				onChange={() => {}}
			/>
		),
	},
};

export const MultipleGroups: Story = {
	render: () => (
		<View>
			<KnobCategoryGroup category="physics" itemCount={2}>
				<KnobSlider
					label="Gravity"
					value={9.8}
					min={0}
					max={20}
					onChange={() => {}}
				/>
				<KnobSlider
					label="Friction"
					value={0.5}
					min={0}
					max={1}
					onChange={() => {}}
				/>
			</KnobCategoryGroup>

			<KnobCategoryGroup category="gameplay" itemCount={1}>
				<KnobSlider
					label="Player Speed"
					value={5}
					min={1}
					max={10}
					onChange={() => {}}
				/>
			</KnobCategoryGroup>

			<KnobCategoryGroup
				category="visuals"
				defaultExpanded={false}
				itemCount={4}
			>
				<KnobSlider
					label="Bloom"
					value={0.5}
					min={0}
					max={1}
					onChange={() => {}}
				/>
			</KnobCategoryGroup>
		</View>
	),
};
