import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
	FlatList,
	Image,
	Pressable,
	Share,
	Text,
	useWindowDimensions,
	View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
	CommentsBottomSheet,
	type CommentsBottomSheetHandle,
} from "@/components/social/CommentsBottomSheet";
import {
	LikersBottomSheet,
	type LikersBottomSheetHandle,
} from "@/components/social/LikersBottomSheet";
import { ReportModal } from "@/components/social/ReportModal";
import { useAuth } from "@/hooks/useAuth";
import { activeBrand } from "@/lib/brand";
import { trpcReact } from "@/lib/trpc/react";

const PAGE_SIZE = 20;
const TAB_BAR_HEIGHT = 68;
const TAB_BAR_EXTRA_PADDING = 16;
const CARD_MARGIN = 8;
const CARD_RADIUS = 20;

interface FeedGame {
	id: string;
	title: string;
	description: string | null;
	thumbnailUrl: string | null;
	playCount: number;
	likeCount: number;
	commentCount: number;
	createdAt: number;
	userId: string | null;
	source: "database";
}

function formatCount(n: number): string {
	if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
	if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
	return String(n);
}

const AVATAR_COLORS = [
	"#4F46E5",
	"#059669",
	"#D97706",
	"#E11D48",
	"#0891B2",
	"#7C3AED",
];

function getAvatarColor(id: string): string {
	let hash = 0;
	for (let i = 0; i < id.length; i++)
		hash = (hash << 5) - hash + id.charCodeAt(i);
	return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

interface FeedItemProps {
	game: FeedGame;
	currentUserId: string | null;
	pageHeight: number;
	bottomPadding: number;
	onCommentPress: (gameId: string) => void;
	onLikersPress: (gameId: string) => void;
	onReportPress: (gameId: string) => void;
}

function FeedItem({
	game,
	currentUserId,
	pageHeight,
	bottomPadding,
	onCommentPress,
	onLikersPress,
	onReportPress,
}: FeedItemProps) {
	const router = useRouter();
	const [isLiked, setIsLiked] = useState(false);
	const [likeCount, setLikeCount] = useState(game.likeCount);
	const [isBookmarked, setIsBookmarked] = useState(false);

	const likeMut = trpcReact.social.addReaction.useMutation({
		onError: () => {
			setIsLiked(false);
			setLikeCount((c) => c - 1);
		},
	});
	const unlikeMut = trpcReact.social.removeReaction.useMutation({
		onError: () => {
			setIsLiked(true);
			setLikeCount((c) => c + 1);
		},
	});
	const bookmarkMut = trpcReact.social.bookmark.useMutation({
		onError: () => setIsBookmarked(false),
	});
	const unbookmarkMut = trpcReact.social.unbookmark.useMutation({
		onError: () => setIsBookmarked(true),
	});

	const handleLike = () => {
		if (!currentUserId) return;
		if (isLiked) {
			setIsLiked(false);
			setLikeCount((c) => Math.max(0, c - 1));
			unlikeMut.mutate({ targetType: "game", targetId: game.id });
		} else {
			setIsLiked(true);
			setLikeCount((c) => c + 1);
			likeMut.mutate({ targetType: "game", targetId: game.id });
		}
	};

	const handleBookmark = () => {
		if (!currentUserId) return;
		if (isBookmarked) {
			setIsBookmarked(false);
			unbookmarkMut.mutate({ gameId: game.id });
		} else {
			setIsBookmarked(true);
			bookmarkMut.mutate({ gameId: game.id });
		}
	};

	const handleShare = async () => {
		try {
			await Share.share({
				message: `Check out "${game.title}" on ${activeBrand.displayName}!`,
			});
		} catch {}
	};

	const handleGamePress = () => {
		router.push({
			pathname: "/game-detail/[id]",
			params: { id: game.id },
		});
	};

	const handleCreatorPress = () => {
		if (game.userId) {
			router.push({ pathname: "/user/[id]", params: { id: game.userId } });
		}
	};

	const creatorName = game.userId
		? `${activeBrand.displayName} Creator`
		: "Anonymous";
	const creatorId = game.userId ?? "anonymous";

	return (
		<View style={{ height: pageHeight }}>
			{/* Game Card */}
			<Pressable
				onPress={handleGamePress}
				style={{
					flex: 1,
					marginHorizontal: CARD_MARGIN,
					borderRadius: CARD_RADIUS,
					overflow: "hidden",
					backgroundColor: "#111827",
				}}
			>
				{game.thumbnailUrl ? (
					<Image
						source={{ uri: game.thumbnailUrl }}
						style={{ width: "100%", height: "100%" }}
						resizeMode="cover"
					/>
				) : (
					<View
						style={{
							flex: 1,
							alignItems: "center",
							justifyContent: "center",
							backgroundColor: "#111827",
						}}
					>
						<Text
							style={{
								color: "#FFFFFF",
								fontSize: 28,
								fontWeight: "800",
								textAlign: "center",
								paddingHorizontal: 32,
							}}
						>
							{game.title}
						</Text>
						{game.description ? (
							<Text
								style={{
									color: "#9CA3AF",
									fontSize: 15,
									textAlign: "center",
									marginTop: 12,
									paddingHorizontal: 40,
								}}
								numberOfLines={3}
							>
								{game.description}
							</Text>
						) : null}
					</View>
				)}
			</Pressable>

			{/* Action Bar */}
			<View
				style={{
					flexDirection: "row",
					alignItems: "center",
					paddingHorizontal: 16,
					paddingTop: 10,
					paddingBottom: 6,
				}}
			>
				<View
					style={{
						flexDirection: "row",
						alignItems: "center",
						flex: 1,
						gap: 20,
					}}
				>
					<View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
						<Pressable onPress={handleLike}>
							<Ionicons
								name={isLiked ? "heart" : "heart-outline"}
								size={26}
								color={isLiked ? "#EF4444" : "#E4E4E7"}
							/>
						</Pressable>
						{likeCount > 0 && (
							<Pressable onPress={() => onLikersPress(game.id)}>
								<Text
									style={{ color: "#D4D4D8", fontSize: 13, fontWeight: "600" }}
								>
									{formatCount(likeCount)}
								</Text>
							</Pressable>
						)}
					</View>

					<Pressable
						onPress={() => onCommentPress(game.id)}
						style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
					>
						<Ionicons name="chatbubble-outline" size={24} color="#E4E4E7" />
						{game.commentCount > 0 && (
							<Text
								style={{ color: "#D4D4D8", fontSize: 13, fontWeight: "600" }}
							>
								{formatCount(game.commentCount)}
							</Text>
						)}
					</Pressable>

					<Pressable onPress={handleShare}>
						<Ionicons name="paper-plane-outline" size={24} color="#E4E4E7" />
					</Pressable>
				</View>

				<View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
					<Pressable onPress={handleBookmark}>
						<Ionicons
							name={isBookmarked ? "bookmark" : "bookmark-outline"}
							size={24}
							color={isBookmarked ? "#FBBF24" : "#E4E4E7"}
						/>
					</Pressable>

					<View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
						<Ionicons name="play" size={16} color="#A1A1AA" />
						<Text style={{ color: "#A1A1AA", fontSize: 13, fontWeight: "600" }}>
							{formatCount(game.playCount)}
						</Text>
					</View>
				</View>
			</View>

			{/* Creator Row */}
			<Pressable
				onPress={handleCreatorPress}
				style={{
					flexDirection: "row",
					alignItems: "center",
					paddingHorizontal: 16,
					paddingBottom: bottomPadding,
				}}
			>
				<View
					style={{
						width: 36,
						height: 36,
						borderRadius: 18,
						backgroundColor: getAvatarColor(creatorId),
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "700" }}>
						{getInitials(creatorName)}
					</Text>
				</View>
				<View style={{ marginLeft: 10, flex: 1 }}>
					<Text
						style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "700" }}
						numberOfLines={1}
					>
						{creatorName}
					</Text>
					<Text
						style={{ color: "#9CA3AF", fontSize: 13, marginTop: 1 }}
						numberOfLines={1}
					>
						{game.title}
					</Text>
				</View>
				<Pressable
					style={{ padding: 4 }}
					onPress={() => onReportPress(game.id)}
				>
					<Ionicons name="ellipsis-horizontal" size={20} color="#71717A" />
				</Pressable>
			</Pressable>
		</View>
	);
}

export default function FeedScreen() {
	const { height: windowHeight } = useWindowDimensions();
	const insets = useSafeAreaInsets();
	const { user } = useAuth();
	const currentUserId = user?.id ?? null;
	const commentsRef = useRef<CommentsBottomSheetHandle>(null);
	const likersRef = useRef<LikersBottomSheetHandle>(null);
	const [reportTarget, setReportTarget] = useState<{ id: string } | null>(null);

	const { data: feedData, isLoading: isLoadingFeed } =
		trpcReact.social.feed.useQuery({ limit: PAGE_SIZE, offset: 0 });

	const bottomPadding =
		TAB_BAR_HEIGHT + Math.max(insets.bottom, 10) + TAB_BAR_EXTRA_PADDING;
	const pageHeight = windowHeight - insets.top;

	const feedGames = useMemo<FeedGame[]>(
		() =>
			(feedData?.games ?? []).map((g) => ({
				id: g.id,
				title: g.title,
				description: g.description,
				thumbnailUrl: g.thumbnailUrl,
				playCount: g.playCount,
				likeCount: g.likeCount,
				commentCount: g.commentCount,
				createdAt: g.createdAt,
				userId: g.creator?.id ?? null,
				source: "database" as const,
			})),
		[feedData],
	);

	const handleCommentPress = useCallback((gameId: string) => {
		commentsRef.current?.open(gameId);
	}, []);

	const handleLikersPress = useCallback((gameId: string) => {
		likersRef.current?.open("game", gameId);
	}, []);

	const handleReportPress = useCallback((gameId: string) => {
		setReportTarget({ id: gameId });
	}, []);

	const renderItem = useCallback(
		({ item }: { item: FeedGame }) => (
			<FeedItem
				game={item}
				currentUserId={currentUserId}
				pageHeight={pageHeight}
				bottomPadding={bottomPadding}
				onCommentPress={handleCommentPress}
				onLikersPress={handleLikersPress}
				onReportPress={handleReportPress}
			/>
		),
		[
			currentUserId,
			pageHeight,
			bottomPadding,
			handleCommentPress,
			handleLikersPress,
			handleReportPress,
		],
	);

	if (isLoadingFeed) {
		return (
			<View
				style={{
					flex: 1,
					backgroundColor: "#000000",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<Text style={{ color: "#9CA3AF", fontSize: 15 }}>Loading feed...</Text>
			</View>
		);
	}

	if (feedGames.length === 0) {
		return (
			<GestureHandlerRootView style={{ flex: 1 }}>
				<View
					style={{
						flex: 1,
						backgroundColor: "#000000",
						alignItems: "center",
						justifyContent: "center",
						paddingHorizontal: 32,
					}}
				>
					<Text style={{ fontSize: 48, marginBottom: 16 }}>🎮</Text>
					<Text
						style={{
							color: "#FFFFFF",
							fontSize: 22,
							fontWeight: "700",
						}}
					>
						No games yet
					</Text>
					<Text
						style={{
							color: "#6B7280",
							fontSize: 15,
							marginTop: 8,
							textAlign: "center",
						}}
					>
						Be the first to create a game!
					</Text>
				</View>
				<CommentsBottomSheet ref={commentsRef} currentUserId={currentUserId} />
			</GestureHandlerRootView>
		);
	}

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<View
				style={{ flex: 1, backgroundColor: "#000000", paddingTop: insets.top }}
			>
				{activeBrand.features.partyGamesOnly && (
					<View
						style={{
							paddingVertical: 8,
							alignItems: "center",
							backgroundColor: activeBrand.theme.colors.primary,
						}}
					>
						<Text
							style={{
								color: "#FFFFFF",
								fontWeight: "bold",
								fontSize: 14,
							}}
						>
							Party Games Only
						</Text>
					</View>
				)}
				<FlatList
					data={feedGames}
					renderItem={renderItem}
					keyExtractor={(item) => item.id}
					pagingEnabled
					snapToInterval={pageHeight}
					snapToAlignment="start"
					decelerationRate="fast"
					showsVerticalScrollIndicator={false}
					getItemLayout={(_, index) => ({
						length: pageHeight,
						offset: pageHeight * index,
						index,
					})}
					initialNumToRender={2}
					maxToRenderPerBatch={3}
					windowSize={5}
				/>

				<CommentsBottomSheet ref={commentsRef} currentUserId={currentUserId} />
				<LikersBottomSheet ref={likersRef} />
				<ReportModal
					visible={!!reportTarget}
					targetType="game"
					targetId={reportTarget?.id ?? ""}
					onClose={() => setReportTarget(null)}
				/>
			</View>
		</GestureHandlerRootView>
	);
}
