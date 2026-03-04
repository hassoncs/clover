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
import { FileIOError, loadPenFile, savePenFile } from "../lib/file-io";

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

// DocumentToolbar provides New/Save/Load lifecycle controls
function DocumentToolbar({
	graph,
	onNew,
	onError,
}: {
	graph: SceneGraph;
	onNew: () => void;
	onError: (msg: string) => void;
}) {
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const handleSave = useCallback(() => {
		try {
			const json = savePenFile(graph);
			const blob = new Blob([json], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "design.pen";
			a.click();
			URL.revokeObjectURL(url);
		} catch (err) {
			onError(err instanceof Error ? err.message : "Save failed");
		}
	}, [graph, onError]);

	const handleLoad = useCallback(() => {
		if (fileInputRef.current) fileInputRef.current.click();
	}, []);

	const handleFileChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (!file) return;
			const reader = new FileReader();
			reader.onload = (ev) => {
				try {
					const json = ev.target?.result as string;
					loadPenFile(json); // Validate — throws FileIOError on bad input
					// TODO: replace graph contents with loaded document
					// For now, show success message
				} catch (err) {
					const msg = err instanceof FileIOError ? err.message : "Failed to load file";
					onError(msg);
				}
			};
			reader.readAsText(file);
			// Reset input so same file can be re-selected
			e.target.value = "";
		},
		[onError],
	);

	return (
		<View style={toolbarStyles.bar}>
			<Pressable style={toolbarStyles.btn} onPress={onNew}>
				<Text style={toolbarStyles.btnText}>New</Text>
			</Pressable>
			<Pressable style={toolbarStyles.btn} onPress={handleSave}>
				<Text style={toolbarStyles.btnText}>Save</Text>
			</Pressable>
			<Pressable style={toolbarStyles.btn} onPress={handleLoad}>
				<Text style={toolbarStyles.btnText}>Load</Text>
			</Pressable>
		{/* Hidden file input for web */}
			<input
				ref={fileInputRef}
				type="file"
				accept=".pen,.json"
				style={{ display: "none" }}
				onChange={handleFileChange}
			/>
		</View>
	);
}

const toolbarStyles = StyleSheet.create({
	bar: {
		flexDirection: "row",
		gap: 8,
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderBottomWidth: 1,
		borderBottomColor: "rgba(0,0,0,0.1)",
		backgroundColor: "#1a1a1a",
	},
	btn: {
		paddingHorizontal: 12,
		paddingVertical: 4,
		borderRadius: 4,
		backgroundColor: "rgba(255,255,255,0.1)",
	},
	btnText: {
		color: "#fff",
		fontSize: 12,
		fontWeight: "500",
	},
});

export default function PencilScreen() {
	// SceneGraph is mutable — initialized once, mutated in-place by PenToolFacade
	const graph = useMemo(loadSampleGraph, []);
	const facade = useMemo(() => new PenToolFacade(graph), [graph]);
	const [chatOpen, setChatOpen] = useState(true);
	const [docError, setDocError] = useState<string | null>(null);

	return (
	<SafeAreaView style={styles.root} edges={["top", "bottom"]}>
		<PenRuntimeProvider graph={graph} facade={facade}>
			<View style={styles.appShell}>
				<DocumentToolbar
					graph={graph}
					onNew={() => {
						const root = graph.getNode("__root__");
						if (root) {
							for (const id of [...root.childIds]) {
								try { facade.deleteNode(id); } catch { /* ignore */ }
							}
						}
						setDocError(null);
					}}
					onError={setDocError}
				/>
				{docError && (
					<Pressable
						style={styles.errorBanner}
						onPress={() => setDocError(null)}
					>
						<Text style={styles.errorText}>⚠️ {docError} (tap to dismiss)</Text>
					</Pressable>
				)}
				<View style={styles.container}>
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
							<Text style={styles.openChatButtonText}>✶ Chat</Text>
						</Pressable>
					)}
				</View>
			</View>
		</PenRuntimeProvider>
	</SafeAreaView>
	);
}

type OpStatus = "queued" | "applied" | "failed";

interface OpEntry {
	id: string;
	description: string;
	status: OpStatus;
	error?: string;
}

interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	content: string;
	ops?: OpEntry[];
}

interface ChatSidebarProps {
	onClose: () => void;
}

function ChatSidebar({ onClose }: ChatSidebarProps) {
	const { graph, facade, selectedId, commitMutation } = usePenRuntime();
	const [messages, setMessages] = useState<ChatMessage[]>([
		{
			id: "welcome",
			role: "assistant",
			content:
				"Hi! I'm your AI design assistant. Describe what you'd like to create or explore.",
		},
	]);
	const [input, setInput] = useState("");
	const [isSending, setIsSending] = useState(false);
	const scrollRef = useRef<ScrollView>(null);

	const contextHint = selectedId
		? `Node ${selectedId.slice(0, 8)} selected`
		: null;

	// Simulate applying ops from an AI response with timeline tracking
	const applyOpsWithTimeline = useCallback(
		(ops: Array<{ description: string; apply: () => void }>): OpEntry[] => {
			return ops.map((op) => {
				try {
					op.apply();
					return { id: `op-${Date.now()}-${Math.random()}`, description: op.description, status: "applied" as const };
				} catch (err) {
					return {
						id: `op-${Date.now()}-${Math.random()}`,
						description: op.description,
						status: "failed" as const,
						error: err instanceof Error ? err.message : "Unknown error",
					};
				}
			});
		},
		[],
	);

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
			setIsSending(true);
			savePenFile(graph);

			// Simulate a demo op batch for local preview mode
			const demoOps = text.toLowerCase().includes("add")
				? [
						{
							description: "Create frame node",
							apply: () => facade.createNode("frame", "__root__", { x: 100, y: 100, width: 200, height: 100 }),
						},
					]
				: [];

			const appliedOps = demoOps.length > 0
				? applyOpsWithTimeline(demoOps)
				: [];

			if (appliedOps.some((op) => op.status === "applied")) {
				commitMutation();
			}

			const reply: ChatMessage = {
				id: `a-${Date.now()}`,
				role: "assistant",
				content: appliedOps.length > 0
					? `Applied ${appliedOps.filter((o) => o.status === "applied").length} operation(s).`
					: selectedId
						? `Captured your request. Selected node: ${selectedId.slice(0, 8)}.`
						: "Captured your request in local preview mode.",
				ops: appliedOps.length > 0 ? appliedOps : undefined,
			};
			setMessages((prev) => [...prev, reply]);
		} finally {
			setIsSending(false);
			scrollRef.current?.scrollToEnd({ animated: true });
		}
	}, [graph, facade, input, isSending, selectedId, applyOpsWithTimeline, commitMutation]);

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
					<View key={msg.id}>
						<View
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
						{/* Op timeline */}
						{msg.ops && msg.ops.length > 0 && (
							<View style={styles.opsTimeline}>
								{msg.ops.map((op) => (
									<View key={op.id} style={styles.opEntry}>
										<Text style={[
											styles.opStatus,
											op.status === "applied" ? styles.opApplied
												: op.status === "failed" ? styles.opFailed
												: styles.opQueued,
										]}>
											{op.status === "applied" ? "✓" : op.status === "failed" ? "✗" : "○"}
										</Text>
										<View style={{ flex: 1 }}>
											<Text style={styles.opDescription}>{op.description}</Text>
											{op.error && <Text style={styles.opError}>{op.error}</Text>}
										</View>
									</View>
								))}
							</View>
						)}
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
	appShell: {
		flex: 1,
		flexDirection: "column",
	},
	container: {
		flex: 1,
		flexDirection: "row",
	},
	canvas: {
		flex: 1,
		flexDirection: "column",
	},
	errorBanner: {
		backgroundColor: "#7f1d1d",
		paddingHorizontal: 16,
		paddingVertical: 8,
	},
	errorText: {
		color: "#fca5a5",
		fontSize: 12,
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
	opsTimeline: {
		marginTop: 4,
		marginLeft: 8,
		paddingLeft: 8,
		borderLeftWidth: 2,
		borderLeftColor: "#2d2650",
	},
	opEntry: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 6,
		paddingVertical: 2,
	},
	opStatus: {
		fontSize: 12,
		fontWeight: "600",
		width: 14,
	},
	opApplied: {
		color: "#34d399",
	},
	opFailed: {
		color: "#f87171",
	},
	opQueued: {
		color: "#94a3b8",
	},
	opDescription: {
		color: "#c4b5fd",
		fontSize: 11,
	},
	opError: {
		color: "#f87171",
		fontSize: 11,
		fontStyle: "italic",
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
