import { Ionicons } from "@expo/vector-icons";
import type { AppRouter } from "@slopcade/api/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import { useRouter } from "expo-router";
import {
	ActivityIndicator,
	Alert,
	Pressable,
	RefreshControl,
	ScrollView,
	Share,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import { trpcReact } from "@/lib/trpc/react";

type RouterOutputs = inferRouterOutputs<AppRouter>;

type Org = RouterOutputs["organizations"]["listMyOrgs"][number];

function OrgMemberItem({
	member,
	currentUserId,
	canRemove,
	onRemove,
}: {
	member: RouterOutputs["organizations"]["getMembers"][number];
	currentUserId: string;
	canRemove: boolean;
	onRemove: (userId: string) => void;
}) {
	return (
		<View className="flex-row items-center justify-between py-3 border-b border-gray-800">
			<View className="flex-1">
				<Text className="text-white font-medium">
					{member.displayName || member.email || "Unknown User"}
				</Text>
				<Text className="text-gray-500 text-xs">
					{member.role} • Joined{" "}
					{new Date(member.joinedAt).toLocaleDateString()}
				</Text>
			</View>
			{canRemove && member.userId !== currentUserId && (
				<Pressable
					onPress={() => onRemove(member.userId)}
					className="bg-red-900/30 px-3 py-1 rounded-lg border border-red-900"
					accessibilityLabel={`Remove ${member.displayName || member.email || "member"}`}
					accessibilityRole="button"
				>
					<Text className="text-red-400 text-xs font-bold">Remove</Text>
				</Pressable>
			)}
		</View>
	);
}

function OrgDetail({ org }: { org: Org }) {
	const utils = trpcReact.useUtils();
	const { user } = useAuth();

	const { data: members, isLoading: isLoadingMembers } =
		trpcReact.organizations.getMembers.useQuery(
			{ orgId: org.id },
			{ enabled: !!org.id },
		);

	const leaveMutation = trpcReact.organizations.leave.useMutation({
		onSuccess: () => {
			utils.organizations.listMyOrgs.invalidate();
		},
		onError: (err) => {
			Alert.alert("Error", err.message);
		},
	});

	const removeMemberMutation = trpcReact.organizations.removeMember.useMutation(
		{
			onSuccess: () => {
				utils.organizations.getMembers.invalidate({ orgId: org.id });
			},
			onError: (err) => {
				Alert.alert("Error", err.message);
			},
		},
	);

	const regenerateCodeMutation =
		trpcReact.organizations.regenerateJoinCode.useMutation({
			onSuccess: () => {
				utils.organizations.listMyOrgs.invalidate();
				Alert.alert("Success", "Join code regenerated");
			},
			onError: (err) => {
				Alert.alert("Error", err.message);
			},
		});

	const handleLeave = () => {
		Alert.alert(
			"Leave Organization",
			`Are you sure you want to leave ${org.name}?`,
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Leave",
					style: "destructive",
					onPress: () => leaveMutation.mutate({ orgId: org.id }),
				},
			],
		);
	};

	const handleRemoveMember = (userId: string) => {
		Alert.alert(
			"Remove Member",
			"Are you sure you want to remove this member?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Remove",
					style: "destructive",
					onPress: () => removeMemberMutation.mutate({ orgId: org.id, userId }),
				},
			],
		);
	};

	const handleRegenerateCode = () => {
		Alert.alert(
			"Regenerate Code",
			"This will invalidate the old code. Continue?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Regenerate",
					onPress: () => regenerateCodeMutation.mutate({ orgId: org.id }),
				},
			],
		);
	};

	const handleShareCode = async () => {
		if (!org.joinCode) return;
		try {
			await Share.share({
				message: `Join my organization "${org.name}" on Slopbox using code: ${org.joinCode}`,
			});
		} catch (error) {}
	};

	const isAdmin = org.memberRole === "admin";
	const isLeader = org.memberRole === "leader";
	const canManageMembers = isAdmin || isLeader;

	return (
		<View className="bg-gray-800 rounded-2xl p-4 mb-6 border border-gray-700">
			<View className="flex-row justify-between items-start mb-4">
				<View className="flex-1">
					<Text className="text-white text-xl font-bold">{org.name}</Text>
					<Text className="text-gray-400 text-sm">
						{org.city && org.state
							? `${org.city}, ${org.state}`
							: org.denomination || "Organization"}
					</Text>
				</View>
				<View className="bg-gray-700 px-3 py-1 rounded-full">
					<Text className="text-gray-300 text-xs font-bold uppercase">
						{org.memberRole}
					</Text>
				</View>
			</View>

			{isAdmin && org.joinCode && (
				<View className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 mb-6">
					<Text className="text-gray-400 text-xs uppercase font-bold mb-2 text-center">
						Join Code
					</Text>
					<Pressable onPress={handleShareCode}>
						<Text className="text-white text-3xl font-bold text-center tracking-[8px]">
							{org.joinCode}
						</Text>
					</Pressable>
					<View className="flex-row justify-center gap-4 mt-4">
						<Pressable
							onPress={handleShareCode}
							className="flex-row items-center bg-indigo-600/20 px-4 py-2 rounded-lg border border-indigo-600/50"
							accessibilityLabel="Share join code"
							accessibilityRole="button"
						>
							<Ionicons name="share-outline" size={16} color="#818CF8" />
							<Text className="text-indigo-400 font-bold ml-2">Share</Text>
						</Pressable>
						<Pressable
							onPress={handleRegenerateCode}
							disabled={regenerateCodeMutation.isPending}
							className="flex-row items-center bg-gray-700 px-4 py-2 rounded-lg"
							accessibilityLabel="Regenerate join code"
							accessibilityRole="button"
							accessibilityState={{
								disabled: regenerateCodeMutation.isPending,
								busy: regenerateCodeMutation.isPending,
							}}
						>
							{regenerateCodeMutation.isPending ? (
								<ActivityIndicator size="small" color="#9CA3AF" />
							) : (
								<Ionicons name="refresh" size={16} color="#9CA3AF" />
							)}
							<Text className="text-gray-400 font-bold ml-2">Reset</Text>
						</Pressable>
					</View>
				</View>
			)}

			<View className="mb-6">
				<Text className="text-gray-400 text-sm font-bold mb-3 uppercase">
					Members ({members?.length ?? 0})
				</Text>
				{isLoadingMembers ? (
					<ActivityIndicator color="#9CA3AF" />
				) : (
					<View>
						{members?.map((member) => (
							<OrgMemberItem
								key={member.userId}
								member={member}
								currentUserId={user?.id ?? ""}
								canRemove={canManageMembers}
								onRemove={handleRemoveMember}
							/>
						))}
					</View>
				)}
			</View>

			<Pressable
				onPress={handleLeave}
				disabled={leaveMutation.isPending}
				className="w-full py-3 rounded-xl items-center bg-red-900/20 border border-red-900/50 active:bg-red-900/30"
				accessibilityLabel="Leave Organization"
				accessibilityRole="button"
				accessibilityState={{
					disabled: leaveMutation.isPending,
					busy: leaveMutation.isPending,
				}}
			>
				{leaveMutation.isPending ? (
					<ActivityIndicator color="#F87171" />
				) : (
					<Text className="text-red-400 font-bold">Leave Organization</Text>
				)}
			</Pressable>
		</View>
	);
}

export default function MyOrgScreen() {
	const router = useRouter();
	const {
		data: orgs,
		isLoading,
		refetch,
		isRefetching,
	} = trpcReact.organizations.listMyOrgs.useQuery();

	return (
		<SafeAreaView className="flex-1 bg-gray-900">
			<View className="flex-row items-center px-4 py-3 border-b border-gray-800">
				<Pressable
					onPress={() => router.back()}
					className="mr-3"
					accessibilityLabel="Go back"
					accessibilityRole="button"
				>
					<Ionicons name="arrow-back" size={24} color="#E4E4E7" />
				</Pressable>
				<Text className="text-white font-semibold text-lg">
					My Organization
				</Text>
				<View className="flex-1" />
				<Pressable
					onPress={() => router.push("/settings/join-org")}
					className="bg-indigo-600 px-3 py-1.5 rounded-lg"
					accessibilityLabel="Join another organization"
					accessibilityRole="button"
				>
					<Text className="text-white font-bold text-xs">Join Another</Text>
				</Pressable>
			</View>

			<ScrollView
				className="flex-1 p-4"
				refreshControl={
					<RefreshControl
						refreshing={isRefetching}
						onRefresh={refetch}
						tintColor="#818CF8"
					/>
				}
			>
				{isLoading ? (
					<ActivityIndicator size="large" color="#818CF8" className="mt-12" />
				) : orgs && orgs.length > 0 ? (
					orgs.map((org) => <OrgDetail key={org.id} org={org} />)
				) : (
					<View className="items-center justify-center py-12">
						<View className="w-20 h-20 bg-gray-800 rounded-full items-center justify-center mb-6">
							<Ionicons name="people-outline" size={40} color="#6B7280" />
						</View>
						<Text className="text-white text-xl font-bold text-center mb-2">
							No Organization Found
						</Text>
						<Text className="text-gray-400 text-center mb-8 px-8">
							You haven't joined an organization yet. Join one to connect with
							your community.
						</Text>
						<Pressable
							onPress={() => router.push("/settings/join-org")}
							className="bg-indigo-600 px-8 py-4 rounded-xl active:bg-indigo-700"
							accessibilityLabel="Join Organization"
							accessibilityRole="button"
						>
							<Text className="text-white font-bold text-lg">
								Join Organization
							</Text>
						</Pressable>
					</View>
				)}
			</ScrollView>
		</SafeAreaView>
	);
}
