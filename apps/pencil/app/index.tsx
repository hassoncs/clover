import {
	type DesignCanvasHost,
	DesignCanvasPanel,
	type DesignMode,
	type DesignPhase,
	applyCanvasOps,
	type CanvasOp,
} from "@slopcade/design-canvas";
import type { DesignDocument } from "@slopcade/shared";
import { createEmptyDesignDocument } from "@slopcade/shared";
import { useCallback, useMemo, useRef, useState } from "react";
import {
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { trpc } from "../lib/trpc/client";
import { usePencilBridge } from "../lib/usePencilBridge";
const INITIAL_DOC = createEmptyDesignDocument(
	"pencil-default",
	"Untitled Design",
);

export default function PencilScreen() {
	const [document, setDocument] = useState<DesignDocument>(INITIAL_DOC);
	const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
	const [selectedElementId, setSelectedElementId] = useState<string | null>(
		null,
	);
	const [designMode, setDesignMode] = useState<DesignMode>("select");
	const [designPhase, setDesignPhase] = useState<DesignPhase>("idle");
	const [chatOpen, setChatOpen] = useState(true);

	const saveDocument = useCallback((doc: DesignDocument) => {
		setDocument(doc);
	}, []);

	const host: DesignCanvasHost = useMemo(
		() => ({
			document,
			isLoadingDocument: false,
			saveDocument,
			selectedFrameId,
			selectedElementId,
			selectedElementIds: [],
			selectFrame: setSelectedFrameId,
			selectElement: (elementId, frameId) => {
				setSelectedElementId(elementId);
				setSelectedFrameId(frameId);
			},
			clearSelection: () => {
				setSelectedFrameId(null);
				setSelectedElementId(null);
			},
			designMode,
			setDesignMode,
			designPhase,
			setDesignPhase,
		}),
		[
			document,
			saveDocument,
			selectedFrameId,
			selectedElementId,
			designMode,
			designPhase,
		],
	);
	usePencilBridge(host);

	return (
		<SafeAreaView style={styles.root} edges={["top", "bottom"]}>
			<View style={styles.container}>
				{/* Canvas — fills remaining space */}
				<View style={styles.canvas}>
					<DesignCanvasPanel host={host} />
				</View>

				{/* Chat sidebar */}
				{chatOpen && (
					<View style={styles.sidebar}>
					<ChatSidebar
						onClose={() => setChatOpen(false)}
						selectedFrameId={selectedFrameId}
						selectedElementId={selectedElementId}
						document={document}
						onApplyOps={(ops) => {
							const next = applyCanvasOps(document, ops);
							saveDocument(next);
						}}
					/>
					</View>
				)}

				{/* Toggle button when sidebar is closed */}
				{!chatOpen && (
					<Pressable
						style={styles.openChatButton}
						onPress={() => setChatOpen(true)}
					>
						<Text style={styles.openChatButtonText}>✦ Chat</Text>
					</Pressable>
				)}
			</View>
		</SafeAreaView>
	);
}

interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	content: string;
}

interface ChatSidebarProps {
	onClose: () => void;
	selectedFrameId: string | null;
	selectedElementId: string | null;
	document: DesignDocument;
	onApplyOps: (ops: CanvasOp[]) => void;
}

function ChatSidebar({
	onClose,
	selectedFrameId,
	selectedElementId,
	document,
	onApplyOps,
}: ChatSidebarProps) {
	const [messages, setMessages] = useState<ChatMessage[]>([
		{
			id: "welcome",
			role: "assistant",
			content:
				"Hi! I'm your AI design assistant. Describe what you'd like to create, or select an element and ask me to modify it.",
		},
	]);
	const [input, setInput] = useState("");
	const sendMessageMutation = trpc.designChat.sendMessage.useMutation();
	const isSending = sendMessageMutation.isPending;
	const scrollRef = useRef<ScrollView>(null);

	const contextHint = selectedElementId
		? `Element ${selectedElementId.slice(0, 6)} selected`
		: selectedFrameId
			? `Frame ${selectedFrameId.slice(0, 6)} selected`
			: null;

	const send = useCallback(async () => {
		const text = input.trim();
		if (!text || isSending) return;

		const userMsg: ChatMessage = {
			id: `u-${Date.now()}`,
			role: "user",
			content: text,
		};
		setMessages((prev) => [...prev, userMsg]);
		setInput("");

		try {
			const result = await sendMessageMutation.mutateAsync({
				message: text,
				documentJson: JSON.stringify(document),
				selectedFrameId: selectedFrameId ?? undefined,
				selectedElementId: selectedElementId ?? undefined,
			});

			// Apply canvas ops if the AI returned any
			if (result.ops && result.ops.length > 0) {
				onApplyOps(result.ops as CanvasOp[]);
			}

			const opsHint = result.ops?.length > 0 ? ` (drew ${result.ops.length} op${result.ops.length > 1 ? "s" : ""})` : "";
			const reply: ChatMessage = {
				id: `a-${Date.now()}`,
				role: "assistant",
				content: result.reply + opsHint,
			};
			setMessages((prev) => [...prev, reply]);
		} catch (err) {
			const errMsg: ChatMessage = {
				id: `err-${Date.now()}`,
				role: "assistant",
				content: "Something went wrong. Please try again.",
			};
			setMessages((prev) => [...prev, errMsg]);
		} finally {
			scrollRef.current?.scrollToEnd({ animated: true });
		}
	}, [document, input, isSending, onApplyOps, sendMessageMutation, selectedFrameId, selectedElementId]);

	return (
		<KeyboardAvoidingView
			style={styles.chatContainer}
			behavior={Platform.OS === "ios" ? "padding" : undefined}
			keyboardVerticalOffset={0}
		>
			{/* Header */}
			<View style={styles.chatHeader}>
				<Text style={styles.chatTitle}>✦ AI Chat</Text>
				{contextHint && (
					<View style={styles.contextPill}>
						<Text style={styles.contextText}>{contextHint}</Text>
					</View>
				)}
				<Pressable onPress={onClose} style={styles.closeButton}>
					<Text style={styles.closeButtonText}>✕</Text>
				</Pressable>
			</View>

			{/* Messages */}
			<ScrollView
				ref={scrollRef}
				style={styles.messageList}
				contentContainerStyle={styles.messageListContent}
				onContentSizeChange={() =>
					scrollRef.current?.scrollToEnd({ animated: false })
				}
			>
				{messages.map((msg) => (
					<View
						key={msg.id}
						style={[
							styles.messageBubble,
							msg.role === "user" ? styles.userBubble : styles.aiBubble,
						]}
					>
						<Text
							style={[
								styles.messageText,
								msg.role === "user" ? styles.userText : styles.aiText,
							]}
						>
							{msg.content}
						</Text>
					</View>
				))}
				{isSending && (
					<View style={styles.aiBubble}>
						<Text style={styles.aiText}>…</Text>
					</View>
				)}
			</ScrollView>

			{/* Input */}
			<View style={styles.inputRow}>
				<TextInput
					style={styles.textInput}
					value={input}
					onChangeText={setInput}
					placeholder="Describe what to design…"
					placeholderTextColor="#6460a0"
					multiline
					maxLength={2000}
					onSubmitEditing={send}
					blurOnSubmit={false}
				/>
				<Pressable
					onPress={send}
					disabled={!input.trim() || isSending}
					style={({ pressed }) => [
						styles.sendButton,
						(!input.trim() || isSending || pressed) &&
							styles.sendButtonDisabled,
					]}
				>
					<Text style={styles.sendButtonText}>↑</Text>
				</Pressable>
			</View>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: "#050310",
	},
	container: {
		flex: 1,
		flexDirection: "row",
	},
	canvas: {
		flex: 1,
	},
	sidebar: {
		width: 320,
		borderLeftWidth: 1,
		borderLeftColor: "#2d2650",
	},
	openChatButton: {
		position: "absolute",
		bottom: 24,
		right: 24,
		backgroundColor: "#818cf8",
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 24,
		shadowColor: "#818cf8",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.4,
		shadowRadius: 12,
		elevation: 8,
	},
	openChatButtonText: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "600",
	},
	chatContainer: {
		flex: 1,
		backgroundColor: "#0d0a1e",
		flexDirection: "column",
	},
	chatHeader: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: "#2d2650",
		gap: 8,
	},
	chatTitle: {
		color: "#f0ebff",
		fontSize: 13,
		fontWeight: "600",
		letterSpacing: 0.5,
		flex: 1,
	},
	contextPill: {
		backgroundColor: "#16122d",
		borderWidth: 1,
		borderColor: "#2d2650",
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 12,
	},
	contextText: {
		color: "#a096c8",
		fontSize: 10,
		fontWeight: "500",
	},
	closeButton: {
		padding: 4,
	},
	closeButtonText: {
		color: "#6460a0",
		fontSize: 14,
	},
	messageList: {
		flex: 1,
	},
	messageListContent: {
		padding: 16,
		gap: 12,
	},
	messageBubble: {
		maxWidth: "85%",
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 12,
	},
	userBubble: {
		alignSelf: "flex-end",
		backgroundColor: "#818cf8",
		borderBottomRightRadius: 4,
	},
	aiBubble: {
		alignSelf: "flex-start",
		backgroundColor: "#16122d",
		borderWidth: 1,
		borderColor: "#2d2650",
		borderBottomLeftRadius: 4,
	},
	messageText: {
		fontSize: 13,
		lineHeight: 19,
	},
	userText: {
		color: "#fff",
	},
	aiText: {
		color: "#e8e3ff",
	},
	inputRow: {
		flexDirection: "row",
		alignItems: "flex-end",
		padding: 12,
		gap: 8,
		borderTopWidth: 1,
		borderTopColor: "#2d2650",
	},
	textInput: {
		flex: 1,
		backgroundColor: "#050310",
		borderWidth: 1,
		borderColor: "#2d2650",
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 8,
		color: "#f0ebff",
		fontSize: 13,
		maxHeight: 120,
	},
	sendButton: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: "#818cf8",
		justifyContent: "center",
		alignItems: "center",
	},
	sendButtonDisabled: {
		opacity: 0.4,
	},
	sendButtonText: {
		color: "#fff",
		fontSize: 18,
		fontWeight: "600",
	},
});
