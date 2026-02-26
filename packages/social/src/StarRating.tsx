import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useSocialTRPC } from "./trpc-context";

interface StarRatingProps {
	gameId: string;
	currentUserId: string | null;
}

export function StarRating({ gameId, currentUserId }: StarRatingProps) {
	const [hoverScore, setHoverScore] = useState<number | null>(null);
	const trpc = useSocialTRPC();

	const utils = trpc.useUtils();

	const { data, isLoading } = trpc.social.getRating.useQuery({ gameId });

	const rateMutation = trpc.social.rateGame.useMutation({
		onSuccess: () => {
			utils.social.getRating.invalidate({ gameId });
		},
	});

	const handleRate = (score: number) => {
		if (!currentUserId || rateMutation.isPending) return;
		rateMutation.mutate({ gameId, score });
	};

	if (isLoading) {
		return (
			<View className="flex-row items-center py-2">
				<ActivityIndicator size="small" color="#FBBF24" />
			</View>
		);
	}

	const averageScore = data?.averageScore ?? 0;
	const totalRatings = data?.totalRatings ?? 0;
	const userRating = data?.userRating ?? null;
	const displayScore = hoverScore ?? userRating ?? 0;

	return (
		<View>
			<View className="flex-row items-center gap-3">
				<View className="flex-row">
					{[1, 2, 3, 4, 5].map((star) => (
						<Pressable
							key={star}
							onPress={() => handleRate(star)}
							onPressIn={() => setHoverScore(star)}
							onPressOut={() => setHoverScore(null)}
							disabled={!currentUserId || rateMutation.isPending}
							className="p-0.5"
							accessibilityRole="button"
							accessibilityLabel={`Rate ${star} star${star > 1 ? "s" : ""}`}
						>
							<Ionicons
								name={star <= displayScore ? "star" : "star-outline"}
								size={24}
								color={star <= displayScore ? "#FBBF24" : "#6B7280"}
							/>
						</Pressable>
					))}
				</View>

				{totalRatings > 0 && (
					<View className="flex-row items-center gap-1.5">
						<Text className="text-white font-bold text-base">
							{averageScore.toFixed(1)}
						</Text>
						<Text className="text-gray-500 text-sm">({totalRatings})</Text>
					</View>
				)}
			</View>

			{userRating && (
				<Text className="text-gray-500 text-xs mt-1">
					Your rating: {userRating}/5
				</Text>
			)}

			{!currentUserId && (
				<Text className="text-gray-600 text-xs mt-1">Sign in to rate</Text>
			)}
		</View>
	);
}
