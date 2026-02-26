import { Text, View } from "react-native";

interface CostPreviewProps {
	gameId: string;
	data: unknown;
	isLoading: boolean;
	error: Error | null;
}

export function CostPreview({
	gameId,
	data,
	isLoading,
	error,
}: CostPreviewProps) {
	if (error) {
		return (
			<Text className="text-red-400 text-xs">Cost estimate unavailable</Text>
		);
	}
	if (isLoading) {
		return (
			<Text className="text-theme-text-muted text-xs">Loading cost...</Text>
		);
	}
	if (!data || !gameId) {
		return null;
	}
	return <View />;
}
