import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import {
	forwardRef,
	useCallback,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { trpcReact } from "@/lib/trpc/react";
import { FollowButton } from "./FollowButton";

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

export interface LikersBottomSheetHandle {
	open: (targetType: "game" | "comment", targetId: string) => void;
	close: () => void;
}

interface LikerUser {
	id: string;
	displayName: string | null;
	avatarUrl: string | null;
}

function LikerRow({
	user,
	currentUserId,
}: {
	user: LikerUser;
	currentUserId: string | null;
}) {
	const router = useRouter();

	return (
		<Pressable
			className="flex-row items-center px-4 py-3 border-b border-secondary-800"
			onPress={() =>
				router.push({ pathname: "/user/[id]", params: { id: user.id } })
			}
		>
			<View
				className={`w-10 h-10 rounded-full items-center justify-center ${getAvatarColor(user.id)}`}
			>
				<Text className="text-white font-bold text-xs">
					{getInitials(user.displayName)}
				</Text>
			</View>

			<Text
				className="text-white font-semibold text-sm flex-1 ml-3"
				numberOfLines={1}
			>
				{user.displayName ?? "Anonymous"}
			</Text>

			<FollowButton
				targetUserId={user.id}
				currentUserId={currentUserId}
				compact
			/>
		</Pressable>
	);
}

export const LikersBottomSheet = forwardRef<LikersBottomSheetHandle>(
	function LikersBottomSheet(_props, ref) {
		const sheetRef = useRef<BottomSheet>(null);
		const [target, setTarget] = useState<{
			targetType: "game" | "comment";
			targetId: string;
		} | null>(null);
		const { user } = useAuth();
		const currentUserId = user?.id ?? null;

		const snapPoints = useMemo(() => ["50%", "80%"], []);

		useImperativeHandle(ref, () => ({
			open: (targetType: "game" | "comment", targetId: string) => {
				setTarget({ targetType, targetId });
				sheetRef.current?.snapToIndex(0);
			},
			close: () => {
				sheetRef.current?.close();
				setTarget(null);
			},
		}));

		const handleClose = useCallback(() => {
			setTarget(null);
		}, []);

		const { data, isLoading } = trpcReact.socialExtra.getLikers.useQuery(
			{
				targetType: target?.targetType ?? "game",
				targetId: target?.targetId ?? "",
				limit: 20,
				offset: 0,
			},
			{ enabled: !!target },
		);

		const users = data?.users ?? [];

		return (
			<BottomSheet
				ref={sheetRef}
				index={-1}
				snapPoints={snapPoints}
				enablePanDownToClose
				onClose={handleClose}
				backgroundStyle={{
					backgroundColor: "#111827",
					borderTopLeftRadius: 20,
					borderTopRightRadius: 20,
				}}
				handleIndicatorStyle={{ backgroundColor: "#6B7280", width: 40 }}
			>
				<View className="flex-row items-center justify-center py-3 border-b border-secondary-800 gap-1.5">
					<Text className="text-white text-base font-bold">Likes</Text>
					{data?.total != null && data.total > 0 && (
						<Text className="text-secondary-400 text-sm font-semibold">
							{data.total}
						</Text>
					)}
				</View>
				<BottomSheetScrollView className="flex-1">
					{isLoading ? (
						<View className="items-center justify-center py-10">
							<Text className="text-secondary-500 text-sm">Loading...</Text>
						</View>
					) : users.length === 0 ? (
						<View className="items-center justify-center py-10">
							<Text className="text-secondary-500 text-sm">No likes yet</Text>
						</View>
					) : (
						users.map((user) => (
							<LikerRow
								key={user.id}
								currentUserId={currentUserId}
								user={user}
							/>
						))
					)}
				</BottomSheetScrollView>
			</BottomSheet>
		);
	},
);
