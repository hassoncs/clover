import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
	FOLLOW_SUGGESTIONS,
	type FollowSuggestion,
	PLAYLIST_MOCKS,
	type PlaylistCardMock,
} from "./mockData";

const AMEN = {
	background: "#0D1C33",
	surface: "#152A4D",
	surfaceElevated: "#1E3866",
	border: "#2A4A80",
	text: "#FDF8F0",
	textSecondary: "#A89B7D",
	textTertiary: "#6B7280",
	primary: "#C9A84C",
	secondary: "#1B3A6B",
};

function FollowRow({ person }: { person: FollowSuggestion }) {
	return (
		<View style={styles.followRow}>
			<View style={[styles.avatar, { backgroundColor: person.avatarColor }]}>
				<Text style={styles.avatarText}>{person.avatarText}</Text>
			</View>
			<View style={styles.followMeta}>
				<Text style={styles.followName}>{person.name}</Text>
				<Text style={styles.followHandle}>{person.handle}</Text>
			</View>
			<Pressable
				style={styles.followButton}
				accessibilityRole="button"
				accessibilityLabel={`Follow ${person.name}`}
			>
				<Text style={styles.followButtonText}>Follow</Text>
			</Pressable>
		</View>
	);
}

function PlaylistMockCard({ card }: { card: PlaylistCardMock }) {
	return (
		<Pressable
			style={[styles.playlistCard, { backgroundColor: card.accent }]}
			accessibilityRole="button"
			accessibilityLabel={`${card.title} playlist`}
		>
			<View style={styles.playlistInnerGrid}>
				{card.items.map((item) => (
					<View
						key={item.id}
						style={[styles.playlistTile, { backgroundColor: item.color }]}
					>
						<Text style={styles.playlistTileLabel} numberOfLines={1}>
							{item.label}
						</Text>
					</View>
				))}
			</View>
			<Text style={styles.playlistTitle}>{card.title}</Text>
		</Pressable>
	);
}

export function DiscoverMockScreen() {
	const router = useRouter();

	return (
		<SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
			<ScrollView
				contentContainerStyle={styles.content}
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.headerRow}>
					<Pressable
						style={styles.backButton}
						onPress={() => router.back()}
						accessibilityRole="button"
						accessibilityLabel="Go back"
					>
						<Ionicons name="chevron-back" size={30} color={AMEN.text} />
					</Pressable>
					<Text style={styles.headerTitle}>Discover</Text>
					<View style={styles.headerSpacer} />
				</View>

				<View style={styles.searchBar}>
					<Ionicons name="search" size={28} color={AMEN.textTertiary} />
					<TextInput
						value=""
						editable={false}
						placeholder="Find friends..."
						placeholderTextColor={AMEN.textTertiary}
						style={styles.searchInput}
						accessibilityLabel="Search for friends"
					/>
				</View>

				<View style={styles.findCard}>
					<View style={styles.findIconWrap}>
						<Ionicons name="person-add" size={26} color={AMEN.text} />
					</View>
					<View style={styles.findMeta}>
						<Text style={styles.findTitle}>Find your friends</Text>
						<Text style={styles.findSubtitle}>So they can see your slops</Text>
					</View>
					<Pressable
						style={styles.findButton}
						accessibilityRole="button"
						accessibilityLabel="Find friends"
					>
						<Text style={styles.findButtonText}>Find</Text>
					</Pressable>
				</View>

				<View style={styles.followList}>
					{FOLLOW_SUGGESTIONS.map((person) => (
						<FollowRow key={person.id} person={person} />
					))}
				</View>

				<Pressable
					style={styles.viewMoreRow}
					accessibilityRole="button"
					accessibilityLabel="View more suggestions"
				>
					<Text style={styles.viewMoreText}>View more</Text>
					<Ionicons
						name="chevron-forward"
						size={18}
						color={AMEN.textTertiary}
					/>
				</Pressable>

				<Text style={styles.sectionTitle}>Playlists</Text>

				<View style={styles.playlistGrid}>
					{PLAYLIST_MOCKS.map((card) => (
						<PlaylistMockCard key={card.id} card={card} />
					))}
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: AMEN.background,
	},
	content: {
		paddingHorizontal: 18,
		paddingBottom: 140,
	},
	headerRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingTop: 8,
		marginBottom: 20,
	},
	backButton: {
		width: 36,
		height: 36,
		alignItems: "flex-start",
		justifyContent: "center",
	},
	headerTitle: {
		color: AMEN.text,
		fontSize: 46,
		lineHeight: 50,
		fontWeight: "700",
		letterSpacing: 0.2,
	},
	headerSpacer: {
		width: 36,
	},
	searchBar: {
		height: 62,
		backgroundColor: AMEN.surface,
		borderRadius: 31,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: AMEN.border,
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 18,
		marginBottom: 16,
		gap: 12,
	},
	searchInput: {
		flex: 1,
		color: AMEN.textTertiary,
		fontSize: 34,
		lineHeight: 40,
		fontWeight: "500",
	},
	findCard: {
		backgroundColor: AMEN.surface,
		borderRadius: 34,
		padding: 14,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: AMEN.border,
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 10,
	},
	findIconWrap: {
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: AMEN.primary,
		alignItems: "center",
		justifyContent: "center",
	},
	findMeta: {
		flex: 1,
		marginLeft: 12,
	},
	findTitle: {
		color: AMEN.text,
		fontSize: 19,
		fontWeight: "700",
	},
	findSubtitle: {
		color: AMEN.textTertiary,
		fontSize: 17,
		marginTop: 2,
	},
	findButton: {
		height: 48,
		minWidth: 92,
		borderRadius: 24,
		backgroundColor: AMEN.surfaceElevated,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 22,
	},
	findButtonText: {
		color: AMEN.text,
		fontSize: 18,
		fontWeight: "700",
	},
	followList: {
		marginTop: 6,
		gap: 10,
	},
	followRow: {
		flexDirection: "row",
		alignItems: "center",
		minHeight: 76,
	},
	avatar: {
		width: 56,
		height: 56,
		borderRadius: 28,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: "rgba(255,255,255,0.18)",
	},
	avatarText: {
		color: AMEN.text,
		fontSize: 23,
		fontWeight: "700",
	},
	followMeta: {
		flex: 1,
		marginLeft: 12,
	},
	followName: {
		color: AMEN.text,
		fontSize: 19,
		fontWeight: "600",
	},
	followHandle: {
		color: AMEN.textTertiary,
		fontSize: 17,
		marginTop: 1,
	},
	followButton: {
		height: 46,
		minWidth: 102,
		borderRadius: 23,
		backgroundColor: AMEN.surfaceElevated,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 20,
	},
	followButtonText: {
		color: AMEN.text,
		fontSize: 18,
		fontWeight: "700",
	},
	viewMoreRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		marginTop: 8,
		marginBottom: 22,
		gap: 5,
	},
	viewMoreText: {
		color: AMEN.textTertiary,
		fontSize: 18,
		fontWeight: "600",
	},
	sectionTitle: {
		color: AMEN.textTertiary,
		fontSize: 18,
		marginBottom: 10,
	},
	playlistGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "space-between",
		rowGap: 12,
	},
	playlistCard: {
		width: "48.4%",
		borderRadius: 26,
		padding: 10,
		minHeight: 234,
	},
	playlistInnerGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "space-between",
		rowGap: 8,
	},
	playlistTile: {
		width: "48.3%",
		aspectRatio: 0.88,
		borderRadius: 20,
		paddingHorizontal: 8,
		paddingVertical: 10,
		justifyContent: "flex-end",
	},
	playlistTileLabel: {
		color: "rgba(255,255,255,0.86)",
		fontSize: 12,
		fontWeight: "600",
	},
	playlistTitle: {
		color: AMEN.text,
		fontSize: 20,
		fontWeight: "600",
		marginTop: 10,
		marginLeft: 4,
		textTransform: "lowercase",
	},
});
