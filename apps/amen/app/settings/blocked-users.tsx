import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import {
	ActivityIndicator,
	FlatList,
	Pressable,
	Text,
	View,
} from "react-native";
import { trpcReact } from "@/lib/trpc/react";

const AVATAR_COLORS = [
	"bg-theme-primary",
	"bg-theme-success",
	"bg-theme-warning",
	"bg-theme-error",
	"bg-theme-secondary",
	"bg-theme-text-secondary",
];

function getAvatarColor(userId: string): string {
	let hash = 0;
	for (let i = 0; i < userId.length; i++) {
		hash = (hash << 5) - hash + userId.charCodeAt(i);
	}
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

interface BlockedUser {
	id: string;
	displayName: string | null;
	avatarUrl: string | null;
	blockedAt: number;
}

export default function BlockedUsersScreen() {
	const router = useRouter();
	const utils = trpcReact.useUtils();
	const [unblockingId, setUnblockingId] = useState<string | null>(null);

	const { data, isLoading } = trpcReact.moderation.listBlocked.useQuery({
		limit: 50,
		offset: 0,
	});

	const unblockMutation = trpcReact.moderation.unblock.useMutation({
		onSuccess: () => {
			setUnblockingId(null);
			utils.moderation.listBlocked.invalidate();
		},
		onError: () => {
			setUnblockingId(null);
		},
	});

	const handleUnblock = (userId: string) => {
		setUnblockingId(userId);
		unblockMutation.mutate({ userId });
	};

	const renderItem = ({ item }: { item: BlockedUser }) => (
		<View className="flex-row items-center px-4 py-3 border-b border-theme-border">
			<View
				className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${getAvatarColor(item.id)}`}
			>
				<Text className="text-theme-background font-bold text-sm">
					{getInitials(item.displayName)}
				</Text>
			</View>

			<View className="flex-1">
				<Text className="text-theme-text font-medium text-sm">
					{item.displayName ?? "Anonymous"}
				</Text>
			</View>

			<Pressable
				onPress={() => handleUnblock(item.id)}
				disabled={unblockingId === item.id}
				className="bg-theme-surface px-4 py-2 rounded-lg border border-theme-border"
			>
				{unblockingId === item.id ? (
					<ActivityIndicator size="small" color="#A89B7D" />
				) : (
					<Text className="text-theme-text-secondary text-sm font-medium">
						Unblock
					</Text>
				)}
			</Pressable>
		</View>
	);

	return (
		<View className="flex-1 bg-theme-background">
			<Stack.Screen
				options={{
					title: "Blocked Users",
					headerStyle: { backgroundColor: "#0D1C33" },
					headerTintColor: "#FDF8F0",
					headerLeft: () => (
						<Pressable onPress={() => router.back()} className="mr-4">
							<Ionicons name="arrow-back" size={24} color="#FDF8F0" />
						</Pressable>
					),
				}}
			/>

			{isLoading ? (
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator size="large" color="#C9A84C" />
				</View>
			) : !data?.blocked.length ? (
				<View className="flex-1 items-center justify-center px-8">
					<Ionicons name="people-outline" size={48} color="#6B7280" />
					<Text className="text-theme-text-secondary text-base mt-4 text-center">
						You haven't blocked anyone
					</Text>
					<Text className="text-theme-text-tertiary text-sm mt-2 text-center">
						Blocked users won't be able to interact with you.
					</Text>
				</View>
			) : (
				<FlatList
					data={data.blocked}
					keyExtractor={(item) => item.id}
					renderItem={renderItem}
					contentContainerStyle={{ paddingBottom: 24 }}
				/>
			)}
		</View>
	);
}
