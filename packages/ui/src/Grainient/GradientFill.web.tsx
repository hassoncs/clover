import type React from "react";
import { StyleSheet, View } from "react-native";
import type { GradientFillProps } from "./types";

export const GradientFillWeb: React.FC<GradientFillProps> = ({
	colors,
	style,
	...props
}) => {
	const gradient = colors
		.map((color, index) => {
			let position = "50% 50%";
			if (index === 0) position = "0% 0%";
			else if (index === 1) position = "100% 0%";
			else if (index === 2) position = "0% 100%";
			else if (index === 3) position = "100% 100%";

			return `radial-gradient(circle at ${position}, ${color}, transparent 70%)`;
		})
		.join(", ");

	return (
		<View
			style={[
				styles.container,
				{
					// @ts-expect-error: web-only style property
					backgroundImage: gradient,
				},
				style,
			]}
			{...props}
		/>
	);
};

const styles = StyleSheet.create({
	container: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "transparent",
		zIndex: 0,
	},
});
