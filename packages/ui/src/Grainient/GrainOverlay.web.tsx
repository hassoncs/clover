import { grainient } from "@slopcade/theme";
import type React from "react";
import { useId } from "react";
import { StyleSheet, View } from "react-native";
import type { GrainOverlayProps } from "./types";

export const GrainOverlayWeb: React.FC<GrainOverlayProps> = ({
	opacity = grainient.grain.opacity,
	blendMode = grainient.grain.blendMode as any,
	style,
	...props
}) => {
	const id = useId();
	const filterId = `grain-filter-${id}`;

	return (
		<View
			style={[
				styles.container,
				{
					opacity,
					mixBlendMode: blendMode,
				},
				style,
			]}
			pointerEvents="none"
			{...props}
		>
			<svg
				width="100%"
				height="100%"
				xmlns="http://www.w3.org/2000/svg"
				style={styles.svg}
				aria-hidden="true"
			>
				<filter id={filterId}>
					<feTurbulence
						type="fractalNoise"
						baseFrequency={grainient.grain.frequency}
						numOctaves={grainient.grain.octaves}
						stitchTiles="stitch"
					/>
					<feColorMatrix type="saturate" values="0" />
				</filter>
				<rect width="100%" height="100%" filter={`url(#${filterId})`} />
			</svg>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		...StyleSheet.absoluteFillObject,
		zIndex: 0,
	},
	svg: {
		position: "absolute",
		top: 0,
		left: 0,
		width: "100%",
		height: "100%",
	},
});
