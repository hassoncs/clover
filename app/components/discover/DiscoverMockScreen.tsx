import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FOLLOW_SUGGESTIONS, PLAYLIST_MOCKS, type FollowSuggestion, type PlaylistCardMock } from "./mockData";

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
      <Pressable style={styles.followButton}>
        <Text style={styles.followButtonText}>Follow</Text>
      </Pressable>
    </View>
  );
}

function PlaylistMockCard({ card }: { card: PlaylistCardMock }) {
  return (
    <Pressable style={[styles.playlistCard, { backgroundColor: card.accent }]}> 
      <View style={styles.playlistInnerGrid}>
        {card.items.map((item) => (
          <View key={item.id} style={[styles.playlistTile, { backgroundColor: item.color }]}>
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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={30} color="#F5F5F5" />
          </Pressable>
          <Text style={styles.headerTitle}>Discover</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={28} color="#7B7F86" />
          <TextInput
            value=""
            editable={false}
            placeholder="Find friends..."
            placeholderTextColor="#7B7F86"
            style={styles.searchInput}
          />
        </View>

        <View style={styles.findCard}>
          <View style={styles.findIconWrap}>
            <Ionicons name="person-add" size={26} color="#FFFFFF" />
          </View>
          <View style={styles.findMeta}>
            <Text style={styles.findTitle}>Find your friends</Text>
            <Text style={styles.findSubtitle}>So they can see your slops</Text>
          </View>
          <Pressable style={styles.findButton}>
            <Text style={styles.findButtonText}>Find</Text>
          </Pressable>
        </View>

        <View style={styles.followList}>
          {FOLLOW_SUGGESTIONS.map((person) => (
            <FollowRow key={person.id} person={person} />
          ))}
        </View>

        <Pressable style={styles.viewMoreRow}>
          <Text style={styles.viewMoreText}>View more</Text>
          <Ionicons name="chevron-forward" size={18} color="#8B8F97" />
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
    backgroundColor: "#040507",
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
    color: "#F5F5F6",
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
    backgroundColor: "#17191F",
    borderRadius: 31,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.1)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    marginBottom: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    color: "#A5A8AF",
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "500",
  },
  findCard: {
    backgroundColor: "#1A1C22",
    borderRadius: 34,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.1)",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  findIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#0A9BF8",
    alignItems: "center",
    justifyContent: "center",
  },
  findMeta: {
    flex: 1,
    marginLeft: 12,
  },
  findTitle: {
    color: "#FBFBFC",
    fontSize: 19,
    fontWeight: "700",
  },
  findSubtitle: {
    color: "#8C9099",
    fontSize: 17,
    marginTop: 2,
  },
  findButton: {
    height: 48,
    minWidth: 92,
    borderRadius: 24,
    backgroundColor: "#F0F0F2",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  findButtonText: {
    color: "#0E1014",
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
    color: "#E7E9EE",
    fontSize: 23,
    fontWeight: "700",
  },
  followMeta: {
    flex: 1,
    marginLeft: 12,
  },
  followName: {
    color: "#F6F6F7",
    fontSize: 19,
    fontWeight: "600",
  },
  followHandle: {
    color: "#8A8D95",
    fontSize: 17,
    marginTop: 1,
  },
  followButton: {
    height: 46,
    minWidth: 102,
    borderRadius: 23,
    backgroundColor: "#F1F1F2",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  followButtonText: {
    color: "#101216",
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
    color: "#E8E8EA",
    fontSize: 18,
    fontWeight: "600",
  },
  sectionTitle: {
    color: "#8B8E97",
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
    color: "#EBECEE",
    fontSize: 20,
    fontWeight: "600",
    marginTop: 10,
    marginLeft: 4,
    textTransform: "lowercase",
  },
});
