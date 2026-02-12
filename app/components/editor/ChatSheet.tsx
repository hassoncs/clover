import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import type { ChatMessage } from "@slopcade/shared/chat";
import { useCallback, useMemo, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChatConversation } from "@/components/create-game/ChatConversation";

interface ChatSheetProps {
	visible: boolean;
	onDismiss: () => void;
	messages: ChatMessage[];
	onSendMessage: (text: string) => void;
	isSending: boolean;
	isRunning: boolean;
	submitAnswer: (questionId: string, answer: string) => void;
	submitUserAnswer: (batchId: string, answers: string[][]) => void;
	pendingQuestions: unknown;
}

export function ChatSheet({
	visible,
	onDismiss,
	messages,
	onSendMessage,
	isSending,
	isRunning,
	submitAnswer,
	submitUserAnswer,
	pendingQuestions,
}: ChatSheetProps) {
	const sheetRef = useRef<BottomSheet>(null);
	const snapPoints = useMemo(() => ["50%", "90%"], []);

	const renderHandle = useCallback(
		() => (
			<View style={styles.handleContainer}>
				<View style={styles.handleIndicator} />
				<View style={styles.headerRow}>
					<Pressable
						onPress={onDismiss}
						style={styles.closeButton}
						accessibilityRole="button"
						accessibilityLabel="Close chat"
					>
						<Ionicons name="close" size={24} color="#FFFFFF" />
					</Pressable>
					<Text style={styles.headerTitle}>Edit</Text>
					<View style={styles.closeButton} />
				</View>
			</View>
		),
		[onDismiss],
	);

	if (!visible) return null;

	return (
		<BottomSheet
			ref={sheetRef}
			index={0}
			snapPoints={snapPoints}
			backgroundStyle={styles.sheetBackground}
			handleComponent={renderHandle}
			style={styles.sheetShadow}
			enablePanDownToClose
			onClose={onDismiss}
			enableDynamicSizing={false}
			keyboardBehavior="interactive"
			keyboardBlurBehavior="restore"
		>
			<ChatConversation
				messages={messages}
				onSendMessage={onSendMessage}
				isSending={isSending}
				isRunning={isRunning}
				onSubmitClarification={submitAnswer}
				onSubmitUserAnswer={submitUserAnswer}
				pendingQuestions={pendingQuestions}
				listComponent={BottomSheetFlatList}
				textInputVariant="sheet"
			/>
		</BottomSheet>
	);
}

const styles = StyleSheet.create({
	sheetShadow: {
		shadowColor: "#000",
		shadowOffset: { width: 0, height: -3 },
		shadowOpacity: 0.125,
		shadowRadius: 12,
		elevation: 10,
	},
	sheetBackground: {
		backgroundColor: "#1F2937",
	},
	handleContainer: {
		alignItems: "center",
		paddingTop: 8,
		paddingBottom: 4,
		backgroundColor: "#1F2937",
		borderTopLeftRadius: 16,
		borderTopRightRadius: 16,
	},
	handleIndicator: {
		width: 40,
		height: 4,
		borderRadius: 2,
		backgroundColor: "#6B7280",
		marginBottom: 8,
	},
	headerRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 16,
		paddingBottom: 8,
		width: "100%",
	},
	closeButton: {
		width: 40,
		height: 40,
		justifyContent: "center",
		alignItems: "center",
	},
	headerTitle: {
		color: "#FFFFFF",
		fontSize: 17,
		fontWeight: "600",
	},
});
