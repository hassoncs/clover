import React from "react";
import { type StyleProp, Text, View, type ViewStyle } from "react-native";
import { AmenIcon } from "../icons";

interface SectionOrnamentProps {
	variant?: "wheat" | "olive" | "dots" | "stars";
	color?: string;
	size?: "sm" | "md" | "lg";
	style?: StyleProp<ViewStyle>;
}

const SIZES = {
	sm: 12,
	md: 16,
	lg: 20,
};

const TEXT_SIZES = {
	sm: 10,
	md: 14,
	lg: 18,
};

export function SectionOrnament({
	variant = "dots",
	color = "#C9A84C",
	size = "md",
	style,
}: SectionOrnamentProps) {
	const iconSize = SIZES[size];
	const textSize = TEXT_SIZES[size];
	const dotSize = size === "sm" ? 3 : size === "md" ? 4 : 5;

	const renderContent = () => {
		switch (variant) {
			case "dots":
				return (
					<Text style={{ color, fontSize: textSize, letterSpacing: 8 }}>
						● ● ●
					</Text>
				);
			case "stars":
				return (
					<Text style={{ color, fontSize: textSize, letterSpacing: 8 }}>
						✦ ✦ ✦
					</Text>
				);
			case "wheat":
				return (
					<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
						<View
							style={{
								width: dotSize,
								height: dotSize,
								borderRadius: dotSize / 2,
								backgroundColor: color,
								opacity: 0.6,
							}}
						/>
						<AmenIcon name="wheat" size={iconSize} color={color} />
						<View
							style={{
								width: dotSize,
								height: dotSize,
								borderRadius: dotSize / 2,
								backgroundColor: color,
								opacity: 0.6,
							}}
						/>
					</View>
				);
			case "olive":
				return (
					<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
						<View
							style={{
								width: dotSize,
								height: dotSize,
								borderRadius: dotSize / 2,
								backgroundColor: color,
								opacity: 0.6,
							}}
						/>
						<AmenIcon name="oliveBranch" size={iconSize} color={color} />
						<View
							style={{
								width: dotSize,
								height: dotSize,
								borderRadius: dotSize / 2,
								backgroundColor: color,
								opacity: 0.6,
							}}
						/>
					</View>
				);
		}
	};

	return (
		<View style={[{ alignItems: "center", justifyContent: "center" }, style]}>
			{renderContent()}
		</View>
	);
}
