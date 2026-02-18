import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import type { ChatMessage } from "@slopcade/shared/chat";
import { useCallback, useMemo, useRef } from "react";
import { Pressable, Text, View } from "react-native";
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
			<View className="items-center pt-2 pb-1 bg-secondary-800 rounded-t-4">
				<View className="w-10 h-1 rounded bg-secondary-500 mb-2" />
				<View className="flex-row items-center justify-between px-4 pb-2 w-full">
					<Pressable
						onPress={onDismiss}
						className="w-10 h-10 justify-center items-center"
						accessibilityRole="button"
						accessibilityLabel="Close chat"
					>
						<Ionicons name="close" size={24} color="#FFFFFF" />
					</Pressable>
					<Text className="text-white text-base font-semibold">Edit</Text>
					<View className="w-10 h-10 justify-center items-center" />
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
			backgroundStyle={{ backgroundColor: "#1F2937" }}
			handleComponent={renderHandle}
			style={{
				elevation: 10,
				shadowColor: "#000",
				shadowOffset: { width: 0, height: -3 },
				shadowOpacity: 0.125,
				shadowRadius: 12,
			}}
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
