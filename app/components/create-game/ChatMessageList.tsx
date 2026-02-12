import { useCallback, useEffect, useRef } from "react";
import {
	FlatList,
	LayoutAnimation,
	type NativeScrollEvent,
	type NativeSyntheticEvent,
	Platform,
	StyleSheet,
	Text,
	UIManager,
	View,
} from "react-native";

if (
	Platform.OS === "android" &&
	UIManager.setLayoutAnimationEnabledExperimental
) {
	UIManager.setLayoutAnimationEnabledExperimental(true);
}

import type { ChatMessage as ChatMessageModel } from "@slopcade/shared/chat";
import { ShimmerText } from "@/components/ui/ShimmerText";
import { ChatMessage } from "./ChatMessage";

interface Props {
	messages: ChatMessageModel[];
	onSubmitUserAnswer?: (batchId: string, answers: string[][]) => void;
	onSubmitClarification?: (questionId: string, answer: string) => void;
	onRetry?: () => void;
	isRunning?: boolean;
	hasPendingQuestion?: boolean;
	listComponent?: React.ElementType;
}

const SCROLL_THRESHOLD = 100;

function TypingIndicator() {
	return (
		<View style={styles.typingContainer}>
			<ShimmerText text="Thinking..." fontSize={14} />
		</View>
	);
}

const MAINTAIN_POSITION = { minIndexForVisible: 0 };

export function ChatMessageList({
	messages,
	onSubmitUserAnswer,
	onSubmitClarification,
	onRetry,
	isRunning,
	hasPendingQuestion,
	listComponent: ListComponent = FlatList,
}: Props) {
	const listRef = useRef<FlatList>(null);
	const isNearBottom = useRef(true);
	const prevMessageCount = useRef(messages.length);
	const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (messages.length !== prevMessageCount.current) {
			LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
			prevMessageCount.current = messages.length;
		}
	}, [messages.length]);

	const handleScroll = useCallback(
		(e: NativeSyntheticEvent<NativeScrollEvent>) => {
			const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
			isNearBottom.current =
				contentOffset.y + layoutMeasurement.height >=
				contentSize.height - SCROLL_THRESHOLD;
		},
		[],
	);

	const handleContentSizeChange = useCallback(() => {
		if (!isNearBottom.current) return;
		if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
		scrollTimerRef.current = setTimeout(() => {
			listRef.current?.scrollToEnd({ animated: true });
		}, 50);
	}, []);

	return (
		<ListComponent
			ref={listRef}
			style={styles.list}
			data={messages}
			keyExtractor={(item: ChatMessageModel) => item.id}
			renderItem={({ item }: { item: ChatMessageModel }) => (
				<ChatMessage
					message={item}
					onSubmitUserAnswer={onSubmitUserAnswer}
					onSubmitClarification={onSubmitClarification}
					onRetry={onRetry}
				/>
			)}
			contentContainerStyle={styles.content}
			onScroll={handleScroll}
			scrollEventThrottle={16}
			onContentSizeChange={handleContentSizeChange}
			maintainVisibleContentPosition={MAINTAIN_POSITION}
			keyboardShouldPersistTaps="handled"
			ListEmptyComponent={
				<View style={styles.emptyContainer}>
					<Text style={styles.emptyText}>Describe your dream game...</Text>
					<Text style={styles.emptySubtext}>
						&quot;A platformer where you play as a slice of toast&quot;
					</Text>
				</View>
			}
			ListFooterComponent={
				isRunning && !hasPendingQuestion ? <TypingIndicator /> : null
			}
		/>
	);
}

const styles = StyleSheet.create({
	list: {
		flex: 1,
		minHeight: 0,
	},
	content: {
		paddingHorizontal: 20,
		paddingTop: 20,
		paddingBottom: 20,
		flexGrow: 1,
	},
	typingContainer: {
		flexDirection: "row",
		alignItems: "center",
		padding: 16,
		alignSelf: "flex-start",
	},

	emptyContainer: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingTop: 100,
		opacity: 0.5,
	},
	emptyText: {
		fontSize: 18,
		fontWeight: "600",
		color: "#A1A1AA",
		marginBottom: 8,
	},
	emptySubtext: {
		fontSize: 14,
		color: "#71717A",
		fontStyle: "italic",
	},
});
