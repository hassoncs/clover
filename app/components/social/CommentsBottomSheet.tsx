import { useRef, useMemo, useCallback, useState, forwardRef, useImperativeHandle } from "react";
import { View, Text, StyleSheet } from "react-native";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { GameComments } from "./GameComments";

export interface CommentsBottomSheetHandle {
  open: (gameId: string) => void;
  close: () => void;
}

interface CommentsBottomSheetProps {
  currentUserId: string | null;
}

export const CommentsBottomSheet = forwardRef<CommentsBottomSheetHandle, CommentsBottomSheetProps>(
  function CommentsBottomSheet({ currentUserId }, ref) {
    const sheetRef = useRef<BottomSheet>(null);
    const [activeGameId, setActiveGameId] = useState<string | null>(null);

    const snapPoints = useMemo(() => ["60%", "90%"], []);

    useImperativeHandle(ref, () => ({
      open: (gameId: string) => {
        setActiveGameId(gameId);
        sheetRef.current?.snapToIndex(0);
      },
      close: () => {
        sheetRef.current?.close();
        setActiveGameId(null);
      },
    }));

    const handleClose = useCallback(() => {
      setActiveGameId(null);
    }, []);

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
          <Text style={styles.headerText}>Comments</Text>
        </View>
        <BottomSheetScrollView style={styles.content}>
          {activeGameId ? (
            <GameComments
              gameId={activeGameId}
              currentUserId={currentUserId}
            />
          ) : null}
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
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
  },
  headerText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  content: {
    flex: 1,
  },
});
