import type { Decorator } from "@storybook/react";
import { View } from "react-native";

export const AmenLightDecorator: Decorator = (Story) => (
	<View
		style={{
			padding: 32,
			backgroundColor: "#FFFDF7",
			minHeight: 200,
			alignItems: "center",
			justifyContent: "center",
		}}
	>
		<Story />
	</View>
);

export const AmenDarkDecorator: Decorator = (Story) => (
	<View
		style={{
			padding: 32,
			backgroundColor: "#0D1C33",
			minHeight: 200,
			alignItems: "center",
			justifyContent: "center",
		}}
	>
		<Story />
	</View>
);
