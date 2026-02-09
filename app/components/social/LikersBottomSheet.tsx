import { useRef, useMemo, useCallback, useState, forwardRef, useImperativeHandle } from "react";
import { View, Text, Pressable, FlatList, StyleSheet } from "react-native";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import { trpcReact } from "@/lib/trpc/react";
import { useAuth } from "@/hooks/useAuth";
import { FollowButton } from "./FollowButton";

const AVATAR_COLORS = ["bg-indigo-600", "bg-emerald-600", "bg-amber-600", "bg-rose-600", "bg-cyan-600", "bg-violet-600"];

function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash << 5) - hash + id.charCodeAt(i);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
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

function LikerRow({ user, currentUserId }: { user: LikerUser; currentUserId: string | null }) {
  const router = useRouter();

  return (
    <Pressable
      style={styles.row}
      onPress={() => router.push({ pathname: "/user/[id]", params: { id: user.id } })}
    >
      <View className={`w-10 h-10 rounded-full items-center justify-center ${getAvatarColor(user.id)}`}>
        <Text className="text-white font-bold text-xs">
          {getInitials(user.displayName)}
        </Text>
      </View>

      <Text className="text-white font-semibold text-sm flex-1 ml-3" numberOfLines={1}>
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
    const [target, setTarget] = useState<{ targetType: "game" | "comment"; targetId: string } | null>(null);
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
        backgroundStyle={styles.background}
        handleIndicatorStyle={styles.indicator}
      >
        <View style={styles.header}>
          <Text style={styles.headerText}>Likes</Text>
          {data?.total != null && data.total > 0 && (
            <Text style={styles.countText}>{data.total}</Text>
          )}
        </View>
        <BottomSheetScrollView style={styles.content}>
          {isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Loading...</Text>
            </View>
          ) : users.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No likes yet</Text>
            </View>
          ) : (
            users.map((user) => (
              <LikerRow key={user.id} user={user} currentUserId={currentUserId} />
            ))
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  background: {
    backgroundColor: "#111827",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  indicator: {
    backgroundColor: "#6B7280",
    width: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
    gap: 6,
  },
  headerText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  countText: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 14,
  },
});
