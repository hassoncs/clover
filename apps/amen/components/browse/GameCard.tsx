import { Image, Pressable, Text, View } from "react-native";

interface GameGridCardProps {
	title: string;
	thumbnailUrl?: string | null;
	thumbnailEmoji?: string;
	thumbnailBgClass?: string;
	players?: string;
	onPress: () => void;
}

export function GameGridCard({
	title,
	thumbnailUrl,
	thumbnailEmoji = "🎮",
	thumbnailBgClass = "bg-theme-primary/10",
	players,
	onPress,
}: GameGridCardProps) {
	return (
		<Pressable
			className="w-[48%] bg-theme-surface rounded-xl border border-theme-border overflow-hidden active:opacity-80 mb-3"
			onPress={onPress}
			accessibilityRole="button"
			accessibilityLabel={`Play ${title}`}
		>
			<View
				className={`w-full aspect-square ${thumbnailBgClass} items-center justify-center overflow-hidden`}
			>
				{thumbnailUrl ? (
					<Image
						source={{ uri: thumbnailUrl }}
						className="w-full h-full"
						resizeMode="contain"
					/>
				) : (
					<Text className="text-5xl">{thumbnailEmoji}</Text>
				)}

				{players && (
					<View className="absolute top-2 right-2 px-2 py-0.5 bg-theme-surface/80 rounded border border-theme-border">
						<Text className="text-[10px] text-theme-text-secondary font-medium">
							{players}P
						</Text>
					</View>
				)}
			</View>

			<View className="p-2">
				<Text
					className="text-sm font-semibold text-theme-text text-center"
					numberOfLines={1}
				>
					{title}
				</Text>
			</View>
		</Pressable>
	);
}

interface GameCardProps {
	title: string;
	description?: string | null;
	players?: string;
	thumbnailUrl?: string | null;
	thumbnailEmoji?: string;
	thumbnailBgClass?: string;
	meta?: string;
	onPress: () => void;
}

export function GameCard({
	title,
	description,
	players,
	thumbnailUrl,
	thumbnailEmoji = "🎮",
	thumbnailBgClass = "bg-theme-primary/10",
	meta,
	onPress,
}: GameCardProps) {
	return (
		<Pressable
			className="bg-theme-surface p-4 rounded-xl border border-theme-border mb-3 active:opacity-80"
			onPress={onPress}
			accessibilityRole="button"
			accessibilityLabel={`Play ${title}`}
		>
			<View className="flex-row items-center">
				<View
					className={`w-16 h-16 ${thumbnailBgClass} rounded-lg items-center justify-center mr-4 overflow-hidden`}
				>
					{thumbnailUrl ? (
						<Image
							source={{ uri: thumbnailUrl }}
							className="w-full h-full"
							resizeMode="contain"
						/>
					) : (
						<Text className="text-3xl">{thumbnailEmoji}</Text>
					)}
				</View>
				<View className="flex-1">
					<View className="flex-row items-center flex-wrap">
						<Text className="text-lg font-semibold text-theme-text">
							{title}
						</Text>
						{players && (
							<View className="ml-2 px-2 py-0.5 bg-theme-surface-elevated rounded">
								<Text className="text-xs text-theme-text-secondary">
									{players}P
								</Text>
							</View>
						)}
					</View>
					{description && (
						<Text className="text-theme-text-secondary mt-1" numberOfLines={2}>
							{description}
						</Text>
					)}
					{meta && (
						<Text className="text-xs text-theme-text-tertiary mt-1">
							{meta}
						</Text>
					)}
				</View>
				<Text className="text-theme-text-secondary text-xl ml-2">→</Text>
			</View>
		</Pressable>
	);
}
