import { Text, View } from "react-native";

type HostWaitCardProps = {
	message: string;
	accentColor?: string;
};

export function HostWaitCard({ message, accentColor }: HostWaitCardProps) {
	return (
		<View
			className="mt-8 p-8 bg-theme-surface rounded-2xl border-2 border-theme-border w-full max-w-2xl items-center"
			style={accentColor ? { borderColor: accentColor } : undefined}
		>
			<Text className="text-theme-text text-4xl font-bold text-center">
				{message}
			</Text>
		</View>
	);
}
