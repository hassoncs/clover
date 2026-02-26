import { Ionicons } from "@expo/vector-icons";
import { FollowButton } from "@slopcade/social";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
	ActivityIndicator,
	FlatList,
	Pressable,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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

type Tab = "followers" | "following";

const PAGE_SIZE = 30;

interface UserRow {
	id: string;
	displayName: string | null;
	avatarUrl: string | null;
}

export default function FollowersScreen() {
	const { userId, tab: initialTab } = useLocalSearchParams<{
		userId: string;
		tab: string;
	}>();
	const router = useRouter();
	const { user } = useAuth();
	const currentUserId = user?.id ?? null;

	const [activeTab, setActiveTab] = useState<Tab>(
		initialTab === "following" ? "following" : "followers",
	);

	const followersQuery = trpcReact.social.getFollowers.useQuery(
		{ userId: userId!, limit: PAGE_SIZE, offset: 0 },
		{ enabled: !!userId && activeTab === "followers" },
	);

	const followingQuery = trpcReact.social.getFollowing.useQuery(
		{ userId: userId!, limit: PAGE_SIZE, offset: 0 },
		{ enabled: !!userId && activeTab === "following" },
	);

	const data: UserRow[] =
		activeTab === "followers"
			? (followersQuery.data ?? [])
			: (followingQuery.data ?? []);

	const isLoading =
		activeTab === "followers"
			? followersQuery.isLoading
			: followingQuery.isLoading;

	const renderItem = useCallback(
		({ item }: { item: UserRow }) => (
			<Pressable
				className="flex-row items-center px-4 py-3 border-b border-gray-800 active:bg-gray-800/50"
				onPress={() =>
					router.push({ pathname: "/user/[id]", params: { id: item.id } })
				}
			>
				<View
					className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${getAvatarColor(item.id)}`}
				>
					<Text className="text-white font-bold text-sm">
						{getInitials(item.displayName)}
					</Text>
				</View>
				<Text
					className="text-white font-medium text-base flex-1"
					numberOfLines={1}
				>
					{item.displayName ?? "Anonymous"}
				</Text>
				<FollowButton
					targetUserId={item.id}
					currentUserId={currentUserId}
					compact
				/>
			</Pressable>
		),
		[currentUserId, router],
	);

	const renderEmpty = useCallback(() => {
		if (isLoading) return null;
		return (
			<View className="items-center py-16">
				<Ionicons
					name={
						activeTab === "followers" ? "people-outline" : "person-add-outline"
					}
					size={48}
					color="#52525B"
				/>
				<Text className="text-gray-500 mt-4 text-base">
					{activeTab === "followers"
						? "No followers yet"
						: "Not following anyone yet"}
				</Text>
			</View>
		);
	}, [isLoading, activeTab]);

	return (
		<SafeAreaView className="flex-1 bg-gray-900">
			<View className="flex-row items-center px-4 py-3 border-b border-gray-800">
				<Pressable onPress={() => router.back()} className="mr-3">
					<Ionicons name="arrow-back" size={24} color="#E4E4E7" />
				</Pressable>
				<Text className="text-white font-semibold text-lg flex-1">
					{activeTab === "followers" ? "Followers" : "Following"}
				</Text>
				{data.length > 0 && (
					<Text className="text-gray-500 text-sm">{data.length}</Text>
				)}
			</View>

			<View className="flex-row border-b border-gray-800">
				<Pressable
					className={`flex-1 py-3 items-center border-b-2 ${
						activeTab === "followers"
							? "border-indigo-500"
							: "border-transparent"
					}`}
					onPress={() => setActiveTab("followers")}
				>
					<Text
						className={`font-semibold ${
							activeTab === "followers" ? "text-white" : "text-gray-500"
						}`}
					>
						Followers
					</Text>
				</Pressable>
				<Pressable
					className={`flex-1 py-3 items-center border-b-2 ${
						activeTab === "following"
							? "border-indigo-500"
							: "border-transparent"
					}`}
					onPress={() => setActiveTab("following")}
				>
					<Text
						className={`font-semibold ${
							activeTab === "following" ? "text-white" : "text-gray-500"
						}`}
					>
						Following
					</Text>
				</Pressable>
			</View>

			{isLoading ? (
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator size="large" color="#818CF8" />
				</View>
			) : (
				<FlatList
					data={data}
					keyExtractor={(item) => item.id}
					renderItem={renderItem}
					ListEmptyComponent={renderEmpty}
					contentContainerStyle={{ flexGrow: 1 }}
				/>
			)}
		</SafeAreaView>
	);
}
