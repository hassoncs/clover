import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import {
	forwardRef,
	useCallback,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from "react";
import { Text, View } from "react-native";
import { GameComments } from "./GameComments";

export interface CommentsBottomSheetHandle {
	open: (gameId: string) => void;
	close: () => void;
}

interface CommentsBottomSheetProps {
	currentUserId: string | null;
}

export const CommentsBottomSheet = forwardRef<
	CommentsBottomSheetHandle,
	CommentsBottomSheetProps
>(function CommentsBottomSheet({ currentUserId }, ref) {
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
			backgroundStyle={{
				backgroundColor: "#111827",
				borderTopLeftRadius: 20,
				borderTopRightRadius: 20,
			}}
			handleIndicatorStyle={{ backgroundColor: "#6B7280", width: 40 }}
		>
			<View className="items-center py-3 border-b border-secondary-800">
				<Text className="text-white text-base font-bold">Comments</Text>
			</View>
			<BottomSheetScrollView className="flex-1">
				{activeGameId ? (
					<GameComments gameId={activeGameId} currentUserId={currentUserId} />
				) : null}
			</BottomSheetScrollView>
		</BottomSheet>
	);
});
