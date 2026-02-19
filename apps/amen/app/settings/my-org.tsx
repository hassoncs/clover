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
		<View className="flex-row items-center justify-between py-3 border-b border-theme-border">
			<View className="flex-1">
				<Text className="text-theme-text font-medium">
					{member.displayName || member.email || "Unknown User"}
				</Text>
				<Text className="text-theme-text-tertiary text-xs">
					{member.role} • Joined{" "}
					{new Date(member.joinedAt).toLocaleDateString()}
				</Text>
			</View>
			{canRemove && member.userId !== currentUserId && (
				<Pressable
					onPress={() => onRemove(member.userId)}
					className="bg-theme-error/10 px-3 py-1 rounded-lg border border-theme-error"
					accessibilityLabel={`Remove ${member.displayName || member.email || "member"}`}
					accessibilityRole="button"
				>
					<Text className="text-theme-error text-xs font-bold">Remove</Text>
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
				message: `Join my organization "${org.name}" on Amen using code: ${org.joinCode}`,
			});
		} catch (error) {}
	};

	const isAdmin = org.memberRole === "admin";
	const isLeader = org.memberRole === "leader";
	const canManageMembers = isAdmin || isLeader;

	return (
		<View className="bg-theme-surface rounded-2xl p-4 mb-6 border border-theme-border">
			<View className="flex-row justify-between items-start mb-4">
				<View className="flex-1">
					<Text className="text-theme-text text-xl font-bold">{org.name}</Text>
					<Text className="text-theme-text-secondary text-sm">
						{org.city && org.state
							? `${org.city}, ${org.state}`
							: org.denomination || "Organization"}
					</Text>
				</View>
				<View className="bg-theme-surface-elevated px-3 py-1 rounded-full">
					<Text className="text-theme-text-secondary text-xs font-bold uppercase">
						{org.memberRole}
					</Text>
				</View>
			</View>

			{isAdmin && org.joinCode && (
				<View className="bg-theme-background/50 p-4 rounded-xl border border-theme-border mb-6">
					<Text className="text-theme-text-tertiary text-xs uppercase font-bold mb-2 text-center">
						Join Code
					</Text>
					<Pressable onPress={handleShareCode}>
						<Text className="text-theme-text text-3xl font-bold text-center tracking-[8px]">
							{org.joinCode}
						</Text>
					</Pressable>
					<View className="flex-row justify-center gap-4 mt-4">
						<Pressable
							onPress={handleShareCode}
							className="flex-row items-center bg-theme-primary/20 px-4 py-2 rounded-lg border border-theme-primary/50"
							accessibilityLabel="Share join code"
							accessibilityRole="button"
						>
							<Ionicons name="share-outline" size={16} color="#C9A84C" />
							<Text className="text-theme-primary font-bold ml-2">Share</Text>
						</Pressable>
						<Pressable
							onPress={handleRegenerateCode}
							disabled={regenerateCodeMutation.isPending}
							className="flex-row items-center bg-theme-surface-elevated px-4 py-2 rounded-lg"
							accessibilityLabel="Regenerate join code"
							accessibilityRole="button"
							accessibilityState={{
								disabled: regenerateCodeMutation.isPending,
								busy: regenerateCodeMutation.isPending,
							}}
						>
							{regenerateCodeMutation.isPending ? (
								<ActivityIndicator size="small" color="#A89B7D" />
							) : (
								<Ionicons name="refresh" size={16} color="#A89B7D" />
							)}
							<Text className="text-theme-text-secondary font-bold ml-2">
								Reset
							</Text>
						</Pressable>
					</View>
				</View>
			)}

			<View className="mb-6">
				<Text className="text-theme-text-tertiary text-sm font-bold mb-3 uppercase">
					Members ({members?.length ?? 0})
				</Text>
				{isLoadingMembers ? (
					<ActivityIndicator color="#A89B7D" />
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
				className="w-full py-3 rounded-xl items-center bg-theme-error/10 border border-theme-error/50 active:bg-theme-error/20"
				accessibilityLabel="Leave Organization"
				accessibilityRole="button"
				accessibilityState={{
					disabled: leaveMutation.isPending,
					busy: leaveMutation.isPending,
				}}
			>
				{leaveMutation.isPending ? (
					<ActivityIndicator color="#EF4444" />
				) : (
					<Text className="text-theme-error font-bold">Leave Organization</Text>
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
		<SafeAreaView className="flex-1 bg-theme-background">
			<View className="flex-row items-center px-4 py-3 border-b border-theme-border">
				<Pressable
					onPress={() => router.back()}
					className="mr-3"
					accessibilityLabel="Go back"
					accessibilityRole="button"
				>
					<Ionicons name="arrow-back" size={24} color="#FDF8F0" />
				</Pressable>
				<Text className="text-theme-text font-semibold text-lg">
					My Organization
				</Text>
				<View className="flex-1" />
				<Pressable
					onPress={() => router.push("/settings/join-org")}
					className="bg-theme-primary px-3 py-1.5 rounded-lg"
					accessibilityLabel="Join another organization"
					accessibilityRole="button"
				>
					<Text className="text-theme-secondary font-bold text-xs">
						Join Another
					</Text>
				</Pressable>
			</View>

			<ScrollView
				className="flex-1 p-4"
				refreshControl={
					<RefreshControl
						refreshing={isRefetching}
						onRefresh={refetch}
						tintColor="#C9A84C"
					/>
				}
			>
				{isLoading ? (
					<ActivityIndicator size="large" color="#C9A84C" className="mt-12" />
				) : orgs && orgs.length > 0 ? (
					orgs.map((org) => <OrgDetail key={org.id} org={org} />)
				) : (
					<View className="items-center justify-center py-12">
						<View className="w-20 h-20 bg-theme-surface rounded-full items-center justify-center mb-6">
							<Ionicons name="people-outline" size={40} color="#A89B7D" />
						</View>
						<Text className="text-theme-text text-xl font-bold text-center mb-2">
							No Organization Found
						</Text>
						<Text className="text-theme-text-secondary text-center mb-8 px-8">
							You haven't joined an organization yet. Join one to connect with
							your community.
						</Text>
						<Pressable
							onPress={() => router.push("/settings/join-org")}
							className="bg-theme-primary px-8 py-4 rounded-xl active:bg-theme-primary/90"
							accessibilityLabel="Join Organization"
							accessibilityRole="button"
						>
							<Text className="text-theme-secondary font-bold text-lg">
								Join Organization
							</Text>
						</Pressable>
					</View>
				)}
			</ScrollView>
		</SafeAreaView>
	);
}
