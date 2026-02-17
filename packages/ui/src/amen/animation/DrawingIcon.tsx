import React from "react";
import { type StyleProp, View, type ViewStyle } from "react-native";

interface DrawingIconProps {
	path: string;
	viewBox?: string;
	size?: number;
	strokeColor?: string;
	strokeWidth?: number;
	duration?: number;
	delay?: number;
	fillColor?: string;
	enabled?: boolean;
	style?: StyleProp<ViewStyle>;
}

export const DrawingIcon: React.FC<DrawingIconProps> = ({
	path,
	viewBox = "0 0 24 24",
	size = 48,
	strokeColor = "#C9A84C",
	strokeWidth = 2,
	duration = 1500,
	delay = 0,
	fillColor = "none",
	enabled = true,
	style,
}) => {
	const id = React.useId().replace(/:/g, "");
	const animName = `draw-${id}`;
	const fillAnimName = `fill-${id}`;

	const styles = `
    @keyframes ${animName} {
      from { stroke-dashoffset: 1000; }
      to { stroke-dashoffset: 0; }
    }
    @keyframes ${fillAnimName} {
      from { fill-opacity: 0; }
      to { fill-opacity: 1; }
    }
  `;

	return (
		<View style={[{ width: size, height: size }, style]}>
			<style>{styles}</style>
			<svg
				width={size}
				height={size}
				viewBox={viewBox}
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				aria-hidden="true"
			>
				<path
					d={path}
					stroke={strokeColor}
					strokeWidth={strokeWidth}
					strokeLinecap="round"
					strokeLinejoin="round"
					fill={fillColor}
					style={{
						strokeDasharray: 1000,
						strokeDashoffset: 1000,
						animation: enabled
							? `${animName} ${duration}ms ease-out ${delay}ms forwards, ${fillAnimName} 500ms ease-out ${duration + delay}ms forwards`
							: "none",
						fillOpacity: enabled ? 0 : 1,
					}}
				/>
			</svg>
		</View>
	);
};
