import { Image, Pressable, Text, View } from "react-native";

type GameStatus = "active" | "archived" | "beta";
type GameCategory = "arcade" | "puzzle" | "physics-demo" | "action" | "casual";
type PlayerCount = 1 | 2 | "1-2" | "1-4";

interface GameGridCardProps {
	title: string;
	status?: GameStatus;
	category?: GameCategory;
	players?: PlayerCount;
	thumbnailUrl?: string | null;
	thumbnailEmoji?: string;
	thumbnailBgClass?: string;
	onPress: () => void;
}

export function GameGridCard({
	title,
	status,
	category,
	players,
	thumbnailUrl,
	thumbnailEmoji = "🎮",
	thumbnailBgClass = "bg-theme-secondary/30",
	onPress,
}: GameGridCardProps) {
	return (
		<Pressable
			className="w-[48%] bg-theme-surface rounded-xl border border-theme-border overflow-hidden active:bg-theme-surface-elevated mb-3"
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

				{status === "archived" && (
					<View className="absolute top-2 right-2 px-2 py-0.5 bg-theme-background/80 rounded">
						<Text className="text-[10px] text-theme-text-secondary font-medium">
							Archived
						</Text>
					</View>
				)}
				{status === "beta" && (
					<View className="absolute top-2 right-2 px-2 py-0.5 bg-theme-warning/90 rounded">
						<Text className="text-[10px] text-theme-text-inverse font-medium">
							Beta
						</Text>
					</View>
				)}
				{players && (
					<View className="absolute top-2 right-2 px-2 py-0.5 bg-theme-background/80 rounded">
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
				{category && (
					<Text
						className="text-[10px] text-theme-primary text-center mt-0.5"
						numberOfLines={1}
					>
						{category}
					</Text>
				)}
			</View>
		</Pressable>
	);
}

interface GameCardProps {
	title: string;
	description?: string | null;
	status?: GameStatus;
	category?: GameCategory;
	players?: PlayerCount;
	thumbnailUrl?: string | null;
	thumbnailEmoji?: string;
	thumbnailBgClass?: string;
	meta?: string;
	onPress: () => void;
}

export function GameCard({
	title,
	description,
	status,
	category,
	players,
	thumbnailUrl,
	thumbnailEmoji = "🎮",
	thumbnailBgClass = "bg-theme-secondary/30",
	meta,
	onPress,
}: GameCardProps) {
	return (
		<Pressable
			className="bg-theme-surface p-4 rounded-xl border border-theme-border mb-3 active:bg-theme-surface-elevated"
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
						{status === "archived" && (
							<View className="ml-2 px-2 py-0.5 bg-theme-surface-elevated rounded">
								<Text className="text-xs text-theme-text-secondary">
									Archived
								</Text>
							</View>
						)}
						{status === "beta" && (
							<View className="ml-2 px-2 py-0.5 bg-theme-warning rounded">
								<Text className="text-xs text-theme-text-inverse">Beta</Text>
							</View>
						)}
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
					<View className="flex-row items-center mt-1">
						{category && (
							<Text className="text-xs text-theme-primary">{category}</Text>
						)}
						{meta && (
							<Text className="text-xs text-theme-text-tertiary ml-2">
								{meta}
							</Text>
						)}
					</View>
				</View>
				<Text className="text-theme-text-tertiary text-xl ml-2">→</Text>
			</View>
		</Pressable>
	);
}

interface PaginationProps {
	currentPage: number;
	totalPages?: number;
	hasMore: boolean;
	isLoading: boolean;
	onPrevious: () => void;
	onNext: () => void;
}

export function Pagination({
	currentPage,
	totalPages,
	hasMore,
	isLoading,
	onPrevious,
	onNext,
}: PaginationProps) {
	if (totalPages !== undefined && totalPages <= 1) return null;
	if (!hasMore && currentPage === 1) return null;

	return (
		<View className="flex-row items-center justify-center mt-4 mb-2">
			<Pressable
				onPress={onPrevious}
				disabled={currentPage === 1 || isLoading}
				className={`px-4 py-2 rounded-lg mr-2 ${
					currentPage === 1 || isLoading
						? "bg-theme-surface-elevated opacity-50"
						: "bg-theme-surface-elevated active:bg-theme-surface"
				}`}
				accessibilityRole="button"
				accessibilityLabel="Previous page"
				accessibilityState={{ disabled: currentPage === 1 || isLoading }}
			>
				<Text className="text-theme-text font-medium">← Previous</Text>
			</Pressable>

			<View className="px-4 py-2">
				<Text className="text-theme-text-secondary">
					Page {currentPage}
					{totalPages ? ` of ${totalPages}` : ""}
				</Text>
			</View>

			<Pressable
				onPress={onNext}
				disabled={!hasMore || isLoading}
				className={`px-4 py-2 rounded-lg ml-2 ${
					!hasMore || isLoading
						? "bg-theme-surface-elevated opacity-50"
						: "bg-theme-primary active:opacity-90"
				}`}
				accessibilityRole="button"
				accessibilityLabel="Next page"
				accessibilityState={{ disabled: !hasMore || isLoading }}
			>
				<Text className="text-theme-text-inverse font-medium">
					{isLoading ? "Loading..." : "Next →"}
				</Text>
			</Pressable>
		</View>
	);
}
