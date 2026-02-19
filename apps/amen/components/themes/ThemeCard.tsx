import { Image, Pressable, Text, View } from "react-native";

interface ThemeCardProps {
	id: string;
	name: string;
	promptModifier: string;
	isPublic: boolean;
	isOwned: boolean;
	thumbnailUrl?: string | null;
	onPress: () => void;
	onEdit?: () => void;
	onDelete?: () => void;
}

export function ThemeCard({
	name,
	promptModifier,
	isPublic,
	isOwned,
	thumbnailUrl,
	onPress,
	onEdit,
	onDelete,
}: ThemeCardProps) {
	return (
		<Pressable
			className="bg-theme-surface p-4 rounded-xl border border-theme-border mb-3 active:bg-theme-surface-elevated"
			onPress={onPress}
			accessibilityRole="button"
			accessibilityLabel={`${name} theme${isPublic ? ", public" : ""}`}
		>
			<View className="flex-row items-center">
				<View className="w-16 h-16 bg-theme-secondary/30 rounded-lg items-center justify-center mr-4 overflow-hidden">
					{thumbnailUrl ? (
						<Image
							source={{ uri: thumbnailUrl }}
							className="w-full h-full"
							resizeMode="contain"
						/>
					) : (
						<Text className="text-3xl">🎨</Text>
					)}
				</View>

				<View className="flex-1">
					<View className="flex-row items-center flex-wrap">
						<Text className="text-lg font-semibold text-theme-text mr-2">
							{name}
						</Text>

						{isPublic && (
							<View className="px-2 py-0.5 bg-theme-success/30 rounded mr-2">
								<Text className="text-xs text-theme-success">Public</Text>
							</View>
						)}
					</View>

					<Text
						className="text-theme-text-secondary mt-1 text-sm"
						numberOfLines={2}
					>
						{promptModifier}
					</Text>
				</View>

				<Text className="text-theme-text-tertiary text-xl ml-2">→</Text>
			</View>

			{isOwned && (onEdit || onDelete) && (
				<View className="flex-row justify-end mt-3 pt-3 border-t border-theme-border">
					{onEdit && (
						<Pressable
							onPress={(e) => {
								e.stopPropagation();
								onEdit();
							}}
							className="px-3 py-1.5 bg-theme-surface-elevated rounded mr-2 active:bg-theme-surface"
							accessibilityRole="button"
							accessibilityLabel={`Edit ${name} theme`}
						>
							<Text className="text-xs text-theme-text font-medium">Edit</Text>
						</Pressable>
					)}

					{onDelete && (
						<Pressable
							onPress={(e) => {
								e.stopPropagation();
								onDelete();
							}}
							className="px-3 py-1.5 bg-theme-error/10 rounded active:bg-theme-error/20"
							accessibilityRole="button"
							accessibilityLabel={`Delete ${name} theme`}
						>
							<Text className="text-xs text-theme-error font-medium">
								Delete
							</Text>
						</Pressable>
					)}
				</View>
			)}
		</Pressable>
	);
}
