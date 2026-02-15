import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { KnobControl } from "./KnobControl";

const meta: Meta<typeof KnobControl> = {
	title: "UI/Knobs/Control",
	component: KnobControl,
	decorators: [
		(Story) => (
			<View style={{ padding: 16, backgroundColor: "#111827", flex: 1 }}>
				<Story />
			</View>
		),
	],
};

export default meta;

type Story = StoryObj<typeof KnobControl>;

export const KitchenSink: Story = {
	render: () => <KitchenSinkDemo />,
};

function KitchenSinkDemo() {
	const [sliderValue, setSliderValue] = useState(50);
	const [toggleValue, setToggleValue] = useState(true);
	const [selectValue, setSelectValue] = useState<string | number>("option1");
	const [colorValue, setColorValue] = useState("#EF4444");

	return (
		<ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
			<KnobControl
				label="Slider Control"
				description="Adjust the value between 0 and 100"
				config={{ controlType: "slider", min: 0, max: 100, step: 1 }}
				value={sliderValue}
				onChange={(v) => setSliderValue(v as number)}
			/>

			<KnobControl
				label="Toggle Control"
				description="Turn something on or off"
				config={{ controlType: "toggle" }}
				value={toggleValue}
				onChange={(v) => setToggleValue(v as boolean)}
			/>

			<KnobControl
				label="Select Control"
				description="Choose one option from the list"
				config={{
					controlType: "select",
					options: [
						{ label: "Option 1", value: "option1" },
						{ label: "Option 2", value: "option2" },
						{ label: "Option 3", value: "option3" },
					],
				}}
				value={selectValue}
				onChange={(v) => setSelectValue(v as string)}
			/>

			<KnobControl
				label="Color Control"
				description="Pick a color"
				config={{ controlType: "color" }}
				value={colorValue}
				onChange={(v) => setColorValue(v as string)}
			/>

			<KnobControl
				label="Button Control"
				config={{ controlType: "button", action: "fire" }}
				value={null}
				onChange={(action) => console.log("Button action:", action)}
			/>

			<KnobControl
				label="Destructive Button"
				config={{
					controlType: "button",
					action: "delete",
					variant: "destructive",
				}}
				value={null}
				onChange={(action) => console.log("Button action:", action)}
			/>

			<KnobControl
				label="Vec2 Control (Placeholder)"
				description="Vector 2D input"
				config={{ controlType: "vec2" }}
				value={{ x: 0, y: 0 }}
				onChange={() => {}}
			/>

			<KnobControl
				label="Vec3 Control (Placeholder)"
				description="Vector 3D input"
				config={{ controlType: "vec3" }}
				value={{ x: 0, y: 0, z: 0 }}
				onChange={() => {}}
			/>

			<KnobControl
				label="Gradient Control (Placeholder)"
				description="Gradient editor"
				config={{ controlType: "gradient" }}
				value={[]}
				onChange={() => {}}
			/>
		</ScrollView>
	);
}
