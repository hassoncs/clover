import { Ionicons } from "@expo/vector-icons";
import { FollowButton } from "@slopcade/social";
import { tokens } from "@slopcade/theme";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
	ActivityIndicator,
	FlatList,
	Pressable,
	Text,
	TextInput,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import { trpcReact } from "@/lib/trpc/react";

const AVATAR_COLORS = [
	"bg-indigo-600",
	"bg-emerald-600",
	"bg-amber-600",
	"bg-rose-600",
	"bg-cyan-600",
	"bg-violet-600",
];

function getAvatarColor(id: string): string {
	let hash = 0;
	for (let i = 0; i < id.length; i++)
		hash = (hash << 5) - hash + id.charCodeAt(i);
	return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string | null): string {
	if (!name) return "?";
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

function formatCount(n: number): string {
	if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
	if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
	return String(n);
}

interface UserRowData {
	id: string;
	displayName: string | null;
	avatarUrl: string | null;
	gameCount: number;
	followerCount: number;
}

function UserRow({
	user,
	currentUserId,
}: {
	user: UserRowData;
	currentUserId: string | null;
}) {
	const router = useRouter();

	return (
		<Pressable
			className="flex-row items-center px-4 py-3 border-b border-theme-border"
			onPress={() =>
				router.push({ pathname: "/user/[id]", params: { id: user.id } })
			}
		>
			<View
				className={`w-12 h-12 rounded-full items-center justify-center ${getAvatarColor(user.id)}`}
			>
				<Text className="text-theme-text font-bold text-sm">
					{getInitials(user.displayName)}
				</Text>
			</View>

			<View className="flex-1 ml-3">
				<Text
					className="text-theme-text font-semibold text-base"
					numberOfLines={1}
				>
					{user.displayName ?? "Anonymous"}
				</Text>
				<View className="flex-row items-center gap-3 mt-0.5">
					<Text className="text-theme-text-secondary text-xs">
						{formatCount(user.gameCount)}{" "}
						{user.gameCount === 1 ? "game" : "games"}
					</Text>
					<Text className="text-theme-text-secondary text-xs">
						{formatCount(user.followerCount)}{" "}
						{user.followerCount === 1 ? "follower" : "followers"}
					</Text>
				</View>
			</View>

			<FollowButton
				targetUserId={user.id}
				currentUserId={currentUserId}
				compact
			/>
		</Pressable>
	);
}

export default function DiscoverScreen() {
	const insets = useSafeAreaInsets();
	const { user } = useAuth();
	const currentUserId = user?.id ?? null;
	const [query, setQuery] = useState("");

	const hasQuery = query.trim().length > 0;

	const suggestedQuery = trpcReact.socialExtra.suggestedUsers.useQuery(
		{ limit: 10 },
		{ enabled: !hasQuery },
	);

	const searchQuery = trpcReact.socialExtra.searchUsers.useQuery(
		{ query: query.trim(), limit: 20, offset: 0 },
		{ enabled: hasQuery },
	);

	const users = hasQuery
		? (searchQuery.data?.users ?? [])
		: (suggestedQuery.data?.users ?? []);

	const isLoading = hasQuery ? searchQuery.isLoading : suggestedQuery.isLoading;

	const renderItem = useCallback(
		({ item }: { item: UserRowData }) => (
			<UserRow user={item} currentUserId={currentUserId} />
		),
		[currentUserId],
	);

	return (
		<View
			className="flex-1 bg-theme-background"
			style={{ paddingTop: insets.top }}
		>
			<View className="px-4 pt-2 pb-3">
				<Text className="text-theme-text text-2xl font-bold mb-3">
					Discover
				</Text>
				<View className="flex-row items-center bg-theme-surface-elevated rounded-xl px-3 py-2.5">
					<Ionicons
						name="search"
						size={20}
						color={tokens.semantic.colors.text.tertiary}
					/>
					<TextInput
						className="flex-1 text-theme-text text-base ml-2"
						placeholder="Search users..."
						placeholderTextColor={tokens.semantic.colors.text.secondary}
						value={query}
						onChangeText={setQuery}
						autoCapitalize="none"
						autoCorrect={false}
						returnKeyType="search"
					/>
					{hasQuery && (
						<Pressable onPress={() => setQuery("")}>
							<Ionicons
								name="close-circle"
								size={20}
								color={tokens.semantic.colors.text.secondary}
							/>
						</Pressable>
					)}
				</View>
			</View>

			{!hasQuery && (
				<View className="px-4 py-2">
					<Text className="text-theme-text-secondary text-sm font-semibold uppercase tracking-wide">
						Suggested Creators
					</Text>
				</View>
			)}

			{hasQuery && (
				<View className="px-4 py-2">
					<Text className="text-theme-text-secondary text-sm font-semibold uppercase tracking-wide">
						Search Results
					</Text>
				</View>
			)}

			{isLoading ? (
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator
						size="large"
						color={tokens.semantic.colors.primary}
					/>
				</View>
			) : users.length === 0 ? (
				<View className="flex-1 items-center justify-center px-8">
					{hasQuery ? (
						<>
							<Ionicons
								name="search-outline"
								size={48}
								color={tokens.semantic.colors.text.tertiary}
							/>
							<Text className="text-theme-text-secondary text-base mt-3 text-center">
								No users found for "{query}"
							</Text>
						</>
					) : (
						<>
							<Ionicons
								name="people-outline"
								size={48}
								color={tokens.semantic.colors.text.tertiary}
							/>
							<Text className="text-theme-text-secondary text-base mt-3 text-center">
								No creators to suggest yet
							</Text>
						</>
					)}
				</View>
			) : (
				<FlatList
					data={users}
					renderItem={renderItem}
					keyExtractor={(item) => item.id}
					showsVerticalScrollIndicator={false}
				/>
			)}
		</View>
	);
}
