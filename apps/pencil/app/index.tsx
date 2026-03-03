import {
	PenCanvasPanel,
	PenRuntimeProvider,
	usePenRuntime,
} from "@slopcade/design-canvas";
import {
	PenToolFacade,
	type SceneGraph,
	sceneGraphToPenDocument,
} from "@slopcade/design-canvas/pen/runtime";
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
import { loadPenFile, savePenFile } from "../lib/file-io";
import { trpc } from "../lib/trpc/client";
import { usePencilBridge } from "../lib/usePencilBridge";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const SAMPLE_PEN = require("../assets/sample.json");

function loadSampleGraph(): SceneGraph {
	try {
		return loadPenFile(JSON.stringify(SAMPLE_PEN));
	} catch {
		return loadPenFile(JSON.stringify({ version: 1, children: [] }));
	}
}

/**
 * Inner canvas component — must live inside PenRuntimeProvider so it can
 * subscribe to revision bumps and re-derive the PenDocument from the SceneGraph.
 */
function PenCanvasPanelConnector() {
	const { graph, revision } = usePenRuntime();
	const document = useMemo(
		() => sceneGraphToPenDocument(graph),
		// revision is the signal that the graph was mutated
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[graph, revision],
	);
	return <PenCanvasPanel document={document} />;
}

export default function PencilScreen() {
	// SceneGraph is mutable — initialized once, mutated in-place by PenToolFacade
	const graph = useMemo(loadSampleGraph, []);
	const facade = useMemo(() => new PenToolFacade(graph), [graph]);
	const [chatOpen, setChatOpen] = useState(true);

	// Bridge exposes the live graph state to MCP tools via window.__PENCIL_BRIDGE__
	usePencilBridge(graph);

	return (
		<SafeAreaView style={styles.root} edges={["top", "bottom"]}>
			<View style={styles.container}>
				<PenRuntimeProvider graph={graph} facade={facade}>
					<View style={styles.canvas}>
						<PenCanvasPanelConnector />
					</View>

					{chatOpen && (
						<View style={styles.sidebar}>
							<ChatSidebar onClose={() => setChatOpen(false)} />
						</View>
					)}

					{!chatOpen && (
						<Pressable
							style={styles.openChatButton}
							onPress={() => setChatOpen(true)}
						>
							<Text style={styles.openChatButtonText}>✦ Chat</Text>
						</Pressable>
					)}
				</PenRuntimeProvider>
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
}

function ChatSidebar({ onClose }: ChatSidebarProps) {
	const { graph, selectedId } = usePenRuntime();
	const [messages, setMessages] = useState<ChatMessage[]>([
		{
			id: "welcome",
			role: "assistant",
			content:
				"Hi! I'm your AI design assistant. Describe what you'd like to create or explore.",
		},
	]);
	const [input, setInput] = useState("");
	const sendMessageMutation = trpc.designChat.sendMessage.useMutation();
	const isSending = sendMessageMutation.isPending;
	const scrollRef = useRef<ScrollView>(null);

	const contextHint = selectedId
		? `Node ${selectedId.slice(0, 8)} selected`
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
				documentJson: savePenFile(graph),
				selectedFrameId: selectedId ?? undefined,
				selectedElementId: undefined,
			});

			const reply: ChatMessage = {
				id: `a-${Date.now()}`,
				role: "assistant",
				content: result.reply,
			};
			setMessages((prev) => [...prev, reply]);
		} catch {
			setMessages((prev) => [
				...prev,
				{
					id: `err-${Date.now()}`,
					role: "assistant",
					content: "Something went wrong. Please try again.",
				},
			]);
		} finally {
			scrollRef.current?.scrollToEnd({ animated: true });
		}
	}, [graph, input, isSending, sendMessageMutation, selectedId]);

	return (
		<KeyboardAvoidingView
			style={styles.chatContainer}
			behavior={Platform.OS === "ios" ? "padding" : undefined}
			keyboardVerticalOffset={0}
		>
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
