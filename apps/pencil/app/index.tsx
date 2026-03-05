import { Ionicons } from "@expo/vector-icons";
import { PenCanvasPanel } from "@slopcade/design-canvas";
import type { PenDocument, PenNode } from "@slopcade/shared/types/pen";
import { parsePenDocument } from "@slopcade/shared/types/pen";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { applyDesignChatOpsToDocument } from "../lib/designChatOps";
import { trpc } from "../lib/trpc/trpc";
import { usePencilBridge } from "../lib/usePencilBridge";
import { usePencilServer } from "../lib/usePencilServer";

const C = {
	bg: "#0d0d0d",
	sidebar: "#111111",
	border: "#242424",
	text: "#e8e8e8",
	accent: "#818cf8",
	textMuted: "#a1a1aa",
	iconMuted: "#555555",
	rowHover: "#2a2a2a",
	rowSelected: "#1e1e2a",
	bubbleAi: "#1a1a1a",
	bubbleUser: "#818cf8",
	surface: "#141414",
	trafficLightClose: "#ff5f57",
	trafficLightMinimize: "#febc2e",
	trafficLightMaximize: "#28c840",
} as const;

type IconName = React.ComponentProps<typeof Ionicons>["name"];
type ToolId = "pointer" | "frame" | "text" | "image" | "hand" | "note" | "pen";

const TOOL_ITEMS: ReadonlyArray<{ id: ToolId; icon: IconName; label: string }> =
	[
		{ id: "pointer", icon: "navigate-outline", label: "Pointer" },
		{ id: "frame", icon: "square-outline", label: "Frame" },
		{ id: "text", icon: "text-outline", label: "Text" },
		{ id: "image", icon: "image-outline", label: "Image" },
		{ id: "hand", icon: "hand-left-outline", label: "Hand" },
		{ id: "note", icon: "document-text-outline", label: "Note" },
		{ id: "pen", icon: "pencil-outline", label: "Pen" },
	];

const TYPE_ICONS: Record<string, IconName> = {
	frame: "albums-outline",
	text: "text-outline",
	ellipse: "ellipse-outline",
	line: "remove-outline",
	polygon: "shapes-outline",
	path: "git-network-outline",
	group: "apps-outline",
	image: "image-outline",
	note: "document-text-outline",
};

// eslint-disable-next-line @typescript-eslint/no-var-requires
const SAMPLE_PEN = require("../assets/sample.json");
const LOCAL_DOC_KEY = "pencil:last-document";

function createEmptyDocument(): PenDocument {
	return { version: 1, children: [] };
}

function persistDocument(doc: PenDocument) {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(LOCAL_DOC_KEY, JSON.stringify(doc));
}

function loadSampleDocument(): PenDocument {
	try {
		if (typeof window !== "undefined") {
			const persisted = window.localStorage.getItem(LOCAL_DOC_KEY);
			if (persisted) return parsePenDocument(JSON.parse(persisted));
		}
		return parsePenDocument(SAMPLE_PEN);
	} catch {
		return createEmptyDocument();
	}
}

function useDocumentHistory(initialDoc: PenDocument) {
	const [state, setState] = useState({ history: [initialDoc], index: 0 });
	const isDebouncingRef = useRef(false);
	const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const document = state.history[state.index];

	const setDocument = useCallback(
		(nextOrUpdater: PenDocument | ((prev: PenDocument) => PenDocument)) => {
			setState((prevState) => {
				const { history, index } = prevState;
				const prevDoc = history[index];
				const nextDoc =
					typeof nextOrUpdater === "function"
						? nextOrUpdater(prevDoc)
						: nextOrUpdater;
				if (prevDoc === nextDoc) return prevState;

				const newHistory = history.slice(0, index + 1);

				if (isDebouncingRef.current) {
					newHistory[newHistory.length - 1] = nextDoc;
				} else {
					newHistory.push(nextDoc);
					if (newHistory.length > 50) newHistory.shift();
					isDebouncingRef.current = true;
				}

				if (debounceTimeoutRef.current)
					clearTimeout(debounceTimeoutRef.current);
				debounceTimeoutRef.current = setTimeout(() => {
					isDebouncingRef.current = false;
				}, 1000);

				return { history: newHistory, index: newHistory.length - 1 };
			});
		},
		[],
	);

	const commitHistory = useCallback(() => {
		isDebouncingRef.current = false;
		if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
	}, []);

	const undo = useCallback(() => {
		commitHistory();
		setState((prev) => ({ ...prev, index: Math.max(0, prev.index - 1) }));
	}, [commitHistory]);

	const redo = useCallback(() => {
		commitHistory();
		setState((prev) => ({
			...prev,
			index: Math.min(prev.history.length - 1, prev.index + 1),
		}));
	}, [commitHistory]);

	return {
		document,
		setDocument,
		commitHistory,
		undo,
		redo,
		canUndo: state.index > 0,
		canRedo: state.index < state.history.length - 1,
	};
}

interface TitleBarProps {
	canUndo: boolean;
	canRedo: boolean;
	onUndo: () => void;
	onRedo: () => void;
	onNewDocument: () => void;
	onLoadDocument: () => void;
	onSaveDocument: () => void;
	showLayers: boolean;
	onToggleLayers: () => void;
	isConnected: boolean;
}

function TitleBar({
	canUndo,
	canRedo,
	onUndo,
	onRedo,
	onNewDocument,
	onLoadDocument,
	onSaveDocument,
	showLayers,
	onToggleLayers,
	isConnected,
}: TitleBarProps) {
	return (
		<View style={titleBarStyles.container}>
			<View style={titleBarStyles.leftRail}>
				<View style={titleBarStyles.trafficLights}>
					<View
						style={[
							titleBarStyles.trafficLight,
							{ backgroundColor: C.trafficLightClose },
						]}
					/>
					<View
						style={[
							titleBarStyles.trafficLight,
							{ backgroundColor: C.trafficLightMinimize },
						]}
					/>
					<View
						style={[
							titleBarStyles.trafficLight,
							{ backgroundColor: C.trafficLightMaximize },
						]}
					/>
				</View>
				<View style={titleBarStyles.divider} />
				<IconButton
					icon="grid-outline"
					active={showLayers}
					onPress={onToggleLayers}
					accessibilityLabel="Toggle layers"
				/>
				<IconButton icon="bookmark-outline" accessibilityLabel="Bookmark" />
				<IconButton
					icon="add"
					onPress={onNewDocument}
					accessibilityLabel="New document"
				/>
			</View>

			<View style={titleBarStyles.centerRail}>
				<Ionicons name="document-outline" size={14} color={C.textMuted} />
				<Text style={titleBarStyles.filename}>slopcade.pen</Text>
				<Text style={titleBarStyles.pathDivider}>/</Text>
				<Text style={titleBarStyles.pathText}>workspace</Text>
				<View
					style={[
						titleBarStyles.connectionDot,
						{ opacity: isConnected ? 1 : 0.4 },
					]}
				/>
			</View>

			<View style={titleBarStyles.rightRail}>
				<IconButton
					icon="arrow-undo-outline"
					onPress={onUndo}
					disabled={!canUndo}
					accessibilityLabel="Undo"
				/>
				<IconButton
					icon="arrow-redo-outline"
					onPress={onRedo}
					disabled={!canRedo}
					accessibilityLabel="Redo"
				/>
				<View style={titleBarStyles.divider} />
				<ActionButton icon="add" label="New" onPress={onNewDocument} />
				<ActionButton
					icon="folder-open-outline"
					label="Load"
					onPress={onLoadDocument}
				/>
				<ActionButton
					icon="cloud-upload-outline"
					label="Save"
					onPress={onSaveDocument}
				/>
				<View style={titleBarStyles.divider} />
				<Pressable style={titleBarStyles.agentsButton}>
					<Ionicons name="flash-outline" size={14} color={C.accent} />
					<Text style={titleBarStyles.agentsButtonText}>Agents & MCP</Text>
				</Pressable>
				<View style={titleBarStyles.divider} />
				<IconButton icon="sunny-outline" accessibilityLabel="Theme" />
				<IconButton icon="expand-outline" accessibilityLabel="Expand" />
			</View>
		</View>
	);
}

interface ToolSidebarProps {
	activeTool: ToolId;
	onSelectTool: (tool: ToolId) => void;
	showLayers: boolean;
	onToggleLayers: () => void;
}

function ToolSidebar({
	activeTool,
	onSelectTool,
	showLayers,
	onToggleLayers,
}: ToolSidebarProps) {
	return (
		<View style={toolSidebarStyles.container}>
			<IconButton
				icon="layers-outline"
				active={showLayers}
				onPress={onToggleLayers}
				accessibilityLabel="Toggle layers"
			/>
			<View style={toolSidebarStyles.separator} />

			{TOOL_ITEMS.map((item) => {
				const active = item.id === activeTool;
				return (
					<Pressable
						key={item.id}
						onPress={() => onSelectTool(item.id)}
						style={({ pressed }) => [
							toolSidebarStyles.button,
							active && toolSidebarStyles.buttonActive,
							pressed && toolSidebarStyles.buttonPressed,
						]}
						accessibilityLabel={item.label}
					>
						<Ionicons
							name={item.icon}
							size={16}
							color={active ? C.text : C.iconMuted}
						/>
					</Pressable>
				);
			})}

			<View style={toolSidebarStyles.separator} />
			<IconButton icon="diamond-outline" accessibilityLabel="Fill" />
			<IconButton icon="options-outline" accessibilityLabel="Properties" />

			<View style={toolSidebarStyles.flexSpacer} />
			<IconButton icon="search-outline" accessibilityLabel="Zoom" />
		</View>
	);
}

interface LayersPanelProps {
	document: PenDocument;
	selectedNodePaths: string[][];
	onSelectNode: (path: string[]) => void;
}

interface LayerRow {
	node: PenNode;
	path: string[];
	depth: number;
	hasChildren: boolean;
	expanded: boolean;
}

function LayersPanel({
	document,
	selectedNodePaths,
	onSelectNode,
}: LayersPanelProps) {
	const [collapsedIds, setCollapsedIds] = useState<Set<string>>(
		() => new Set(),
	);

	const rows = useMemo<LayerRow[]>(() => {
		const nextRows: LayerRow[] = [];

		const walk = (nodes: PenNode[], depth: number, basePath: string[]) => {
			for (const node of nodes) {
				const path = [...basePath, node.id];
				const children =
					"children" in node && Array.isArray(node.children)
						? node.children
						: [];
				const hasChildren = children.length > 0;
				const expanded = !collapsedIds.has(node.id);
				nextRows.push({ node, path, depth, hasChildren, expanded });
				if (hasChildren && expanded) {
					walk(children as PenNode[], depth + 1, path);
				}
			}
		};

		walk(document.children, 0, []);
		return nextRows;
	}, [collapsedIds, document.children]);

	const selectedPathSet = useMemo(
		() => new Set(selectedNodePaths.map((path) => path.join("/"))),
		[selectedNodePaths],
	);

	const toggleNode = useCallback((id: string) => {
		setCollapsedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}, []);

	return (
		<View style={layersPanelStyles.container}>
			<View style={layersPanelStyles.header}>
				<Text style={layersPanelStyles.headerText}>LAYERS</Text>
			</View>
			<ScrollView style={layersPanelStyles.scrollView}>
				{rows.map((row) => {
					const selected = selectedPathSet.has(row.path.join("/"));
					const icon = TYPE_ICONS[row.node.type] ?? "ellipse-outline";
					return (
						<Pressable
							key={row.path.join("/")}
							style={({ pressed }) => [
								layersPanelStyles.row,
								{ paddingLeft: 8 + row.depth * 14 },
								selected && layersPanelStyles.rowSelected,
								pressed && layersPanelStyles.rowPressed,
							]}
							onPress={() => onSelectNode(row.path)}
						>
							{row.hasChildren ? (
								<Pressable
									onPress={() => toggleNode(row.node.id)}
									style={layersPanelStyles.chevronButton}
								>
									<Ionicons
										name={row.expanded ? "chevron-down" : "chevron-forward"}
										size={12}
										color={C.textMuted}
									/>
								</Pressable>
							) : (
								<View style={layersPanelStyles.chevronSpacer} />
							)}
							<Ionicons
								name={icon}
								size={13}
								color={selected ? C.text : C.textMuted}
							/>
							<Text
								numberOfLines={1}
								style={[
									layersPanelStyles.rowText,
									selected && layersPanelStyles.rowTextSelected,
								]}
							>
								{"name" in row.node &&
								typeof row.node.name === "string" &&
								row.node.name.length > 0
									? row.node.name
									: row.node.id}
							</Text>
						</Pressable>
					);
				})}
			</ScrollView>
		</View>
	);
}

interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	content: string;
	ops?: unknown[];
	appliedOps?: number;
	opErrors?: string[];
}

interface ChatSidebarProps {
	onClose: () => void;
	selectedNodePath: string[] | null;
	document: PenDocument;
	onApplyOps: (ops: unknown[]) => { appliedOps: number; errors: string[] };
}

function ChatSidebar({
	onClose,
	selectedNodePath,
	document,
	onApplyOps,
}: ChatSidebarProps) {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [input, setInput] = useState("");
	const sendMessageMutation = trpc.designChat.sendMessage.useMutation();
	const isSending = sendMessageMutation.isPending;
	const scrollRef = useRef<ScrollView>(null);

	const promptPills = [
		"Make this layout cleaner",
		"Create a settings panel",
		"Tighten typography spacing",
		"Add visual hierarchy",
	];

	const contextHint =
		selectedNodePath && selectedNodePath.length > 0
			? `Selected: ${selectedNodePath[selectedNodePath.length - 1].slice(0, 8)}`
			: null;

	const handleSend = useCallback(async () => {
		const text = input.trim();
		if (!text || isSending) return;

		const userMessage: ChatMessage = {
			id: `u-${Date.now()}`,
			role: "user",
			content: text,
		};

		setMessages((prev) => [...prev, userMessage]);
		setInput("");

		try {
			const response = await sendMessageMutation.mutateAsync({
				message: text,
				documentJson: JSON.stringify(document),
				selectedFrameId: selectedNodePath?.[0] ?? undefined,
				selectedElementId: selectedNodePath?.[1] ?? undefined,
			});

			const applyResult = onApplyOps(response.ops);
			const assistantMessage: ChatMessage = {
				id: `a-${Date.now()}`,
				role: "assistant",
				content: response.reply,
				ops: response.ops,
				appliedOps: applyResult.appliedOps,
				opErrors: applyResult.errors,
			};
			setMessages((prev) => [...prev, assistantMessage]);
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "unknown";
			setMessages((prev) => [
				...prev,
				{
					id: `err-${Date.now()}`,
					role: "assistant",
					content: `Something went wrong: ${message}`,
				},
			]);
		} finally {
			scrollRef.current?.scrollToEnd({ animated: true });
		}
	}, [
		document,
		input,
		isSending,
		onApplyOps,
		selectedNodePath,
		sendMessageMutation,
	]);

	const clearChat = useCallback(() => {
		setMessages([]);
		setInput("");
	}, []);

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : undefined}
			style={chatSidebarStyles.container}
		>
			<View style={chatSidebarStyles.header}>
				<View style={chatSidebarStyles.headerTopRow}>
					<Text style={chatSidebarStyles.title}>Chat</Text>
					<View style={chatSidebarStyles.headerActions}>
						<Pressable
							style={chatSidebarStyles.newChatButton}
							onPress={clearChat}
						>
							<Text style={chatSidebarStyles.newChatText}>+ New Chat</Text>
						</Pressable>
						<IconButton
							icon="chevron-forward"
							onPress={onClose}
							accessibilityLabel="Collapse chat"
						/>
					</View>
				</View>
				{contextHint ? (
					<View style={chatSidebarStyles.contextPill}>
						<Text style={chatSidebarStyles.contextPillText}>{contextHint}</Text>
					</View>
				) : null}
			</View>

			<ScrollView
				ref={scrollRef}
				style={chatSidebarStyles.messages}
				contentContainerStyle={chatSidebarStyles.messagesContent}
			>
				{messages.length === 0 ? (
					<View style={chatSidebarStyles.emptyState}>
						<Text style={chatSidebarStyles.emptyTitle}>
							Start with a design prompt
						</Text>
						<Text style={chatSidebarStyles.emptySubtitle}>
							I can create components, adjust spacing, and refine hierarchy.
						</Text>
						<View style={chatSidebarStyles.promptWrap}>
							{promptPills.map((prompt) => (
								<Pressable
									key={prompt}
									style={chatSidebarStyles.promptPill}
									onPress={() => setInput(prompt)}
								>
									<Text style={chatSidebarStyles.promptPillText}>{prompt}</Text>
								</Pressable>
							))}
						</View>
						<Text style={chatSidebarStyles.tipText}>
							Tip: be specific about style and structure.
						</Text>
						<Text style={chatSidebarStyles.tipText}>
							Tip: select a layer first for scoped edits.
						</Text>
					</View>
				) : (
					messages.map((message) => {
						const user = message.role === "user";
						return (
							<View
								key={message.id}
								style={[
									chatSidebarStyles.messageBubble,
									user
										? chatSidebarStyles.messageBubbleUser
										: chatSidebarStyles.messageBubbleAssistant,
								]}
							>
								<Text
									style={[
										chatSidebarStyles.messageText,
										user
											? chatSidebarStyles.messageTextUser
											: chatSidebarStyles.messageTextAssistant,
									]}
								>
									{message.content}
								</Text>
								{!user && Array.isArray(message.ops) ? (
									<Text style={chatSidebarStyles.opsText}>
										Applied {message.appliedOps ?? 0}/{message.ops.length} ops
									</Text>
								) : null}
							</View>
						);
					})
				)}

				{isSending ? (
					<View
						style={[
							chatSidebarStyles.messageBubble,
							chatSidebarStyles.messageBubbleAssistant,
						]}
					>
						<Text style={chatSidebarStyles.messageTextAssistant}>
							Thinking...
						</Text>
					</View>
				) : null}
			</ScrollView>

			<View style={chatSidebarStyles.bottomSection}>
				<Text style={chatSidebarStyles.bottomHint}>
					Design with Claude or Codex
				</Text>

				<View style={chatSidebarStyles.inputRow}>
					<TextInput
						value={input}
						onChangeText={setInput}
						style={chatSidebarStyles.textInput}
						placeholder="Describe what to change"
						placeholderTextColor={C.textMuted}
						multiline
						maxLength={2000}
					/>
					<Pressable
						onPress={handleSend}
						disabled={!input.trim() || isSending}
						style={({ pressed }) => [
							chatSidebarStyles.sendButton,
							(!input.trim() || isSending || pressed) &&
								chatSidebarStyles.sendButtonDisabled,
						]}
					>
						<Ionicons name="arrow-up" size={16} color={C.text} />
					</Pressable>
				</View>

				<View style={chatSidebarStyles.modelRow}>
					<View style={chatSidebarStyles.modelPill}>
						<Ionicons name="flash-outline" size={14} color={C.accent} />
						<Text style={chatSidebarStyles.modelText}>
							Claude Opus 4.6 (Best)
						</Text>
						<Ionicons name="chevron-down" size={14} color={C.textMuted} />
					</View>
					<View style={chatSidebarStyles.modelActions}>
						<IconButton icon="flash-outline" accessibilityLabel="Tools" />
						<IconButton icon="attach-outline" accessibilityLabel="Attach" />
						<IconButton icon="mic-outline" accessibilityLabel="Microphone" />
						<IconButton
							icon="person-circle-outline"
							accessibilityLabel="Account"
						/>
					</View>
				</View>
			</View>
		</KeyboardAvoidingView>
	);
}

interface ChatCollapsedStripProps {
	onOpen: () => void;
}

function ChatCollapsedStrip({ onOpen }: ChatCollapsedStripProps) {
	return (
		<Pressable style={chatCollapsedStripStyles.container} onPress={onOpen}>
			<View style={chatCollapsedStripStyles.contentWrap}>
				<Ionicons name="chatbubble-outline" size={14} color={C.textMuted} />
				<Text style={chatCollapsedStripStyles.label}>Chat</Text>
			</View>
		</Pressable>
	);
}

interface IconButtonProps {
	icon: IconName;
	onPress?: () => void;
	active?: boolean;
	disabled?: boolean;
	accessibilityLabel?: string;
}

function IconButton({
	icon,
	onPress,
	active = false,
	disabled = false,
	accessibilityLabel,
}: IconButtonProps) {
	return (
		<Pressable
			onPress={onPress}
			disabled={disabled}
			style={({ pressed }) => [
				sharedStyles.iconButton,
				active && sharedStyles.iconButtonActive,
				disabled && sharedStyles.iconButtonDisabled,
				pressed && sharedStyles.iconButtonPressed,
			]}
			accessibilityLabel={accessibilityLabel}
		>
			<Ionicons name={icon} size={16} color={active ? C.text : C.iconMuted} />
		</Pressable>
	);
}

interface ActionButtonProps {
	icon: IconName;
	label: string;
	onPress: () => void;
}

function ActionButton({ icon, label, onPress }: ActionButtonProps) {
	return (
		<Pressable style={sharedStyles.actionButton} onPress={onPress}>
			<Ionicons name={icon} size={13} color={C.textMuted} />
			<Text style={sharedStyles.actionButtonText}>{label}</Text>
		</Pressable>
	);
}

export default function PencilScreen() {
	const { document, setDocument, commitHistory, undo, redo, canUndo, canRedo } =
		useDocumentHistory(loadSampleDocument());
	const [selectedNodePaths, setSelectedNodePaths] = useState<string[][]>([]);
	const [chatOpen, setChatOpen] = useState(true);
	const [chatCollapsed, setChatCollapsed] = useState(false);
	const [showLayers, setShowLayers] = useState(true);
	const [activeTool, setActiveTool] = useState<ToolId>("pointer");
	const selectedNodePath = selectedNodePaths[0] ?? null;

	const bridgeOptions = useMemo(
		() => ({
			onNewDocument: () => {
				setDocument(createEmptyDocument());
				setSelectedNodePaths([]);
			},
			onSaveDocument: () => persistDocument(document),
		}),
		[document, setDocument],
	);

	usePencilBridge(document, setDocument, selectedNodePaths, bridgeOptions);

	const { isConnected, agentCursors, sendDelta } = usePencilServer({
		document,
		setDocument,
		onDocumentChange: (nextDocument) => {
			persistDocument(nextDocument);
		},
	});

	useEffect(() => {
		if (typeof window === "undefined") return;
		const onKeyDown = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
				const target = window.document.activeElement?.tagName;
				if (target === "INPUT" || target === "TEXTAREA") return;
				event.preventDefault();
				if (event.shiftKey) {
					redo();
				} else {
					undo();
				}
			}
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [redo, undo]);

	useEffect(() => {
		persistDocument(document);
	}, [document]);

	const handleAddNode = useCallback(
		(node: PenNode) => {
			setDocument((prev) => ({ ...prev, children: [...prev.children, node] }));
		},
		[setDocument],
	);

	const handleNewDocument = useCallback(() => {
		setDocument(createEmptyDocument());
		setSelectedNodePaths([]);
	}, [setDocument]);

	const handleSaveDocument = useCallback(() => {
		if (typeof window === "undefined") return;
		const json = JSON.stringify(document, null, 2);
		persistDocument(document);

		const blob = new Blob([json], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const anchor = window.document.createElement("a");
		anchor.href = url;
		anchor.download = `pencil-${Date.now()}.pen.json`;
		anchor.click();
		URL.revokeObjectURL(url);
	}, [document]);

	const handleLoadDocument = useCallback(() => {
		if (typeof window === "undefined") return;
		const input = window.document.createElement("input");
		input.type = "file";
		input.accept = "application/json,.json,.pen";
		input.onchange = async () => {
			const file = input.files?.[0];
			if (!file) return;
			const text = await file.text();
			const parsed = parsePenDocument(JSON.parse(text));
			setDocument(parsed);
			setSelectedNodePaths([]);
			persistDocument(parsed);
		};
		input.click();
	}, [setDocument]);

	const handleCloseChat = useCallback(() => {
		setChatOpen(false);
		setChatCollapsed(true);
	}, []);

	const handleOpenChat = useCallback(() => {
		setChatOpen(true);
		setChatCollapsed(false);
	}, []);

	const handleApplyChatOps = useCallback(
		(ops: unknown[]) => {
			const result = applyDesignChatOpsToDocument(document, ops);
			setDocument(result.nextDocument);
			if (isConnected) {
				sendDelta(ops);
			}
			return { appliedOps: result.appliedOps, errors: result.errors };
		},
		[document, isConnected, sendDelta, setDocument],
	);

	const penCanvasTool = (activeTool === "pen" ? "pen" : "pointer") as "pointer" | "pen";
	const penCanvasUiProps = useMemo(
		() => ({
			hidePalette: true,
			externalActiveTool: penCanvasTool,
			hideHeader: true,
			hideLayers: true,
		}),
		[penCanvasTool],
	);

	const showChatSidebar = chatOpen && !chatCollapsed;

	return (
		<SafeAreaView style={styles.root}>
			<TitleBar
				canUndo={canUndo}
				canRedo={canRedo}
				onUndo={undo}
				onRedo={redo}
				onNewDocument={handleNewDocument}
				onLoadDocument={handleLoadDocument}
				onSaveDocument={handleSaveDocument}
				showLayers={showLayers}
				onToggleLayers={() => setShowLayers((prev) => !prev)}
				isConnected={isConnected}
			/>

			<View style={styles.mainRow}>
				<ToolSidebar
					activeTool={activeTool}
					onSelectTool={setActiveTool}
					showLayers={showLayers}
					onToggleLayers={() => setShowLayers((prev) => !prev)}
				/>

				{showLayers ? (
					<LayersPanel
						document={document}
						selectedNodePaths={selectedNodePaths}
						onSelectNode={(path) => setSelectedNodePaths([path])}
					/>
				) : null}

				<View style={styles.canvasArea}>
					<PenCanvasPanel
						{...penCanvasUiProps}
						document={document}
						onAddNode={handleAddNode}
						onDocumentChange={setDocument}
						selectedNodePaths={selectedNodePaths}
						onSelectionChange={setSelectedNodePaths}
						agentCursors={agentCursors}
						onInteractionEnd={commitHistory}
					/>
				</View>

				{showChatSidebar ? (
					<ChatSidebar
						onClose={handleCloseChat}
						selectedNodePath={selectedNodePath}
						document={document}
						onApplyOps={handleApplyChatOps}
					/>
				) : (
					<ChatCollapsedStrip onOpen={handleOpenChat} />
				)}
			</View>
		</SafeAreaView>
	);
}

const sharedStyles = StyleSheet.create({
	iconButton: {
		width: 28,
		height: 28,
		borderRadius: 7,
		alignItems: "center",
		justifyContent: "center",
	},
	iconButtonActive: {
		backgroundColor: C.rowHover,
	},
	iconButtonDisabled: {
		opacity: 0.35,
	},
	iconButtonPressed: {
		opacity: 0.85,
	},
	actionButton: {
		height: 26,
		borderRadius: 7,
		borderWidth: 1,
		borderColor: C.border,
		backgroundColor: C.surface,
		paddingHorizontal: 9,
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
	},
	actionButtonText: {
		color: C.text,
		fontSize: 11,
		fontWeight: "500",
	},
});

const titleBarStyles = StyleSheet.create({
	container: {
		height: 44,
		borderBottomWidth: 1,
		borderBottomColor: C.border,
		backgroundColor: C.sidebar,
		paddingHorizontal: 10,
		flexDirection: "row",
		alignItems: "center",
	},
	leftRail: {
		width: 240,
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},
	centerRail: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 6,
	},
	rightRail: {
		width: 470,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "flex-end",
		gap: 6,
	},
	trafficLights: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		marginRight: 2,
	},
	trafficLight: {
		width: 12,
		height: 12,
		borderRadius: 999,
	},
	divider: {
		width: 1,
		height: 18,
		backgroundColor: C.border,
		marginHorizontal: 2,
	},
	filename: {
		color: C.text,
		fontSize: 13,
		fontWeight: "500",
	},
	pathDivider: {
		color: C.textMuted,
		fontSize: 12,
	},
	pathText: {
		color: C.textMuted,
		fontSize: 12,
	},
	connectionDot: {
		width: 8,
		height: 8,
		borderRadius: 999,
		backgroundColor: "#22c55e",
		marginLeft: 4,
	},
	agentsButton: {
		height: 28,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: C.border,
		backgroundColor: C.surface,
		paddingHorizontal: 10,
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},
	agentsButtonText: {
		color: C.text,
		fontSize: 11,
		fontWeight: "600",
	},
});

const toolSidebarStyles = StyleSheet.create({
	container: {
		width: 48,
		borderRightWidth: 1,
		borderRightColor: C.border,
		backgroundColor: C.sidebar,
		alignItems: "center",
		paddingTop: 10,
		paddingBottom: 8,
		gap: 2,
	},
	separator: {
		width: 24,
		height: 1,
		backgroundColor: C.border,
		marginVertical: 8,
	},
	button: {
		width: 36,
		height: 36,
		borderRadius: 7,
		alignItems: "center",
		justifyContent: "center",
	},
	buttonActive: {
		backgroundColor: C.rowHover,
	},
	buttonPressed: {
		opacity: 0.85,
	},
	flexSpacer: {
		flex: 1,
	},
});

const layersPanelStyles = StyleSheet.create({
	container: {
		width: 200,
		borderRightWidth: 1,
		borderRightColor: C.border,
		backgroundColor: C.sidebar,
	},
	header: {
		height: 36,
		borderBottomWidth: 1,
		borderBottomColor: C.border,
		justifyContent: "center",
		paddingHorizontal: 12,
	},
	headerText: {
		color: C.textMuted,
		fontSize: 11,
		fontWeight: "700",
		letterSpacing: 0.6,
	},
	scrollView: {
		flex: 1,
	},
	row: {
		height: 26,
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		paddingRight: 8,
	},
	rowSelected: {
		backgroundColor: C.rowSelected,
	},
	rowPressed: {
		opacity: 0.85,
	},
	chevronButton: {
		width: 14,
		height: 14,
		alignItems: "center",
		justifyContent: "center",
	},
	chevronSpacer: {
		width: 14,
	},
	rowText: {
		flex: 1,
		color: C.textMuted,
		fontSize: 11,
	},
	rowTextSelected: {
		color: C.text,
	},
});

const chatSidebarStyles = StyleSheet.create({
	container: {
		width: 340,
		borderLeftWidth: 1,
		borderLeftColor: C.border,
		backgroundColor: C.sidebar,
	},
	header: {
		paddingHorizontal: 12,
		paddingTop: 12,
		paddingBottom: 10,
		borderBottomWidth: 1,
		borderBottomColor: C.border,
		gap: 8,
	},
	headerTopRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	headerActions: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},
	title: {
		color: C.text,
		fontSize: 13,
		fontWeight: "600",
	},
	newChatButton: {
		height: 26,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: C.border,
		paddingHorizontal: 10,
		justifyContent: "center",
		backgroundColor: C.surface,
	},
	newChatText: {
		color: C.text,
		fontSize: 11,
		fontWeight: "500",
	},
	contextPill: {
		alignSelf: "flex-start",
		borderWidth: 1,
		borderColor: C.border,
		borderRadius: 999,
		backgroundColor: C.surface,
		paddingHorizontal: 10,
		paddingVertical: 4,
	},
	contextPillText: {
		color: C.textMuted,
		fontSize: 10,
	},
	messages: {
		flex: 1,
	},
	messagesContent: {
		padding: 12,
		gap: 8,
	},
	emptyState: {
		alignItems: "center",
		paddingVertical: 28,
		gap: 10,
	},
	emptyTitle: {
		color: C.text,
		fontSize: 13,
		fontWeight: "600",
	},
	emptySubtitle: {
		color: C.textMuted,
		fontSize: 11,
		textAlign: "center",
		maxWidth: 240,
		lineHeight: 16,
	},
	promptWrap: {
		width: "100%",
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "center",
		gap: 8,
		marginTop: 2,
	},
	promptPill: {
		borderRadius: 999,
		borderWidth: 1,
		borderColor: C.border,
		backgroundColor: C.surface,
		paddingHorizontal: 10,
		paddingVertical: 6,
	},
	promptPillText: {
		color: C.text,
		fontSize: 11,
	},
	tipText: {
		color: C.textMuted,
		fontSize: 10,
	},
	messageBubble: {
		maxWidth: "86%",
		borderRadius: 12,
		paddingHorizontal: 10,
		paddingVertical: 8,
		gap: 6,
	},
	messageBubbleUser: {
		alignSelf: "flex-end",
		backgroundColor: C.bubbleUser,
		borderBottomRightRadius: 4,
	},
	messageBubbleAssistant: {
		alignSelf: "flex-start",
		backgroundColor: C.bubbleAi,
		borderWidth: 1,
		borderColor: C.border,
		borderBottomLeftRadius: 4,
	},
	messageText: {
		fontSize: 12,
		lineHeight: 18,
	},
	messageTextUser: {
		color: C.text,
	},
	messageTextAssistant: {
		color: C.text,
	},
	opsText: {
		color: C.textMuted,
		fontSize: 10,
	},
	bottomSection: {
		borderTopWidth: 1,
		borderTopColor: C.border,
		paddingHorizontal: 12,
		paddingTop: 8,
		paddingBottom: 10,
		gap: 8,
	},
	bottomHint: {
		textAlign: "center",
		color: C.textMuted,
		fontSize: 10,
	},
	inputRow: {
		flexDirection: "row",
		alignItems: "flex-end",
		gap: 8,
	},
	textInput: {
		flex: 1,
		minHeight: 42,
		maxHeight: 120,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: C.border,
		backgroundColor: C.surface,
		paddingHorizontal: 12,
		paddingVertical: 9,
		color: C.text,
		fontSize: 12,
	},
	sendButton: {
		width: 34,
		height: 34,
		borderRadius: 999,
		backgroundColor: C.accent,
		alignItems: "center",
		justifyContent: "center",
	},
	sendButtonDisabled: {
		opacity: 0.4,
	},
	modelRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 6,
	},
	modelPill: {
		flex: 1,
		height: 30,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: C.border,
		backgroundColor: C.surface,
		paddingHorizontal: 10,
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},
	modelText: {
		flex: 1,
		color: C.text,
		fontSize: 11,
	},
	modelActions: {
		flexDirection: "row",
		alignItems: "center",
		gap: 2,
	},
});

const chatCollapsedStripStyles = StyleSheet.create({
	container: {
		width: 40,
		borderLeftWidth: 1,
		borderLeftColor: C.border,
		backgroundColor: C.sidebar,
		alignItems: "center",
		justifyContent: "center",
	},
	contentWrap: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		transform: [{ rotate: "-90deg" }],
	},
	label: {
		color: C.text,
		fontSize: 11,
		fontWeight: "600",
	},
});

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: C.bg,
	},
	mainRow: {
		flex: 1,
		flexDirection: "row",
		backgroundColor: C.bg,
	},
	canvasArea: {
		flex: 1,
		backgroundColor: C.bg,
	},
});
