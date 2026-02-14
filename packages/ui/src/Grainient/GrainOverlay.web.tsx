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
				viewBox="0 0 200 200"
				preserveAspectRatio="none"
				xmlns="http://www.w3.org/2000/svg"
				style={styles.svg}
				aria-hidden="true"
			>
				<filter id={filterId} x="0%" y="0%" width="100%" height="100%">
					<feTurbulence
						type="fractalNoise"
						baseFrequency={grainient.grain.frequency}
						numOctaves={grainient.grain.octaves}
						stitchTiles="stitch"
						result="noise"
					/>
					<feColorMatrix in="noise" type="saturate" values="0" />
				</filter>
				<rect
					width="100%"
					height="100%"
					fill="white"
					filter={`url(#${filterId})`}
				/>
			</svg>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		...StyleSheet.absoluteFillObject,
		zIndex: 1,
	},
	svg: {
		position: "absolute",
		top: 0,
		left: 0,
		width: "100%",
		height: "100%",
	},
});
