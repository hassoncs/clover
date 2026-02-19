import { AmenIcon, type AmenIconName } from "@slopcade/ui/amen";
import React from "react";
import { Text, View } from "react-native";

interface GameMetaBadgeProps {
	icon?: AmenIconName;
	label: string;
	value: string;
}

export function GameMetaBadge({ icon, label, value }: GameMetaBadgeProps) {
	return (
		<View className="flex-row items-center rounded-full border border-[#C9A84C] bg-[#1B3A6B] px-3 py-1.5">
			{icon && (
				<View className="mr-2">
					<AmenIcon name={icon} size={14} color="#C9A84C" />
				</View>
			)}
			<Text className="font-lora text-xs text-[#FFFDF7]">
				<Text className="opacity-70">{label}: </Text>
				<Text className="font-bold">{value}</Text>
			</Text>
		</View>
	);
}
