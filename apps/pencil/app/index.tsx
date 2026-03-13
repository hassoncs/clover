import { Ionicons } from "@expo/vector-icons";
import type { PenDocument, PenNode } from "@slopcade/protocol/pen";
import { parsePenDocument } from "@slopcade/protocol/pen";
import React, {
	lazy,
	Suspense,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	ActivityIndicator,
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
import samplePen from "../assets/sample.json";
import type { PenCanvasPanelProps } from "../components/PencilCanvasPanel";
import {
	applyDesignChatOpsToDocument,
	validateDesignChatOps,
} from "../lib/designChatOps";
import { buildPencilRuntimeState, LOCAL_DOC_KEY } from "../lib/pencilEmbed";
import { PencilStoreProvider } from "../lib/store-context";
import { trpc } from "../lib/trpc/trpc";
import { usePencilBridge } from "../lib/usePencilBridge";
import { usePencilDocumentSync } from "../lib/usePencilDocumentSync";
import { usePencilServer } from "../lib/usePencilServer";

const PenCanvasPanel = lazy(async () => {
	const module =
		Platform.OS === "web"
			? await import("../components/PencilCanvasPanel.web")
			: await import("../components/PencilCanvasPanel.native");

	return {
		default:
			module.PencilCanvasPanel as React.ComponentType<PenCanvasPanelProps>,
	};
});

const THEMES = {
	dark: {
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
	},
	light: {
		bg: "#ffffff",
		sidebar: "#f5f5f5",
		border: "#e0e0e0",
		text: "#1a1a1a",
		accent: "#6366f1",
		textMuted: "#71717a",
		iconMuted: "#a1a1aa",
		rowHover: "#e4e4e7",
		rowSelected: "#d4d4d8",
		bubbleAi: "#f4f4f5",
		bubbleUser: "#6366f1",
		surface: "#fafafa",
		trafficLightClose: "#ff5f57",
		trafficLightMinimize: "#febc2e",
		trafficLightMaximize: "#28c840",
	},
} as const;

type Theme = "dark" | "light";
type ThemeColors = Record<keyof typeof THEMES.dark, string>;

const ThemeContext = React.createContext<{ theme: Theme; colors: ThemeColors }>(
	{
		theme: "dark",
		colors: THEMES.dark,
	},
);

function useTheme() {
	return React.useContext(ThemeContext);
}

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
	effect: "flash-outline",
	image: "image-outline",
	note: "document-text-outline",
};

const DOC_META_KEY = "pencil:document-meta";

interface DocMeta {
	name: string;
	savedAt: number;
	savedChecksum: string;
}

function simpleHash(str: string): string {
	let h = 5381;
	for (let i = 0; i < str.length; i++) {
		h = ((h << 5) + h) ^ str.charCodeAt(i);
	}
	return (h >>> 0).toString(36);
}

function docChecksum(doc: PenDocument): string {
	return simpleHash(JSON.stringify(doc));
}

function loadDocMeta(): DocMeta | null {
	if (typeof window === "undefined") return null;
	try {
		const raw = window.localStorage.getItem(DOC_META_KEY);
		return raw ? (JSON.parse(raw) as DocMeta) : null;
	} catch {
		return null;
	}
}

function saveDocMeta(meta: DocMeta) {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(DOC_META_KEY, JSON.stringify(meta));
}

function hasUnsavedAutoSave(): boolean {
	if (typeof window === "undefined") return false;
	const persisted = window.localStorage.getItem(LOCAL_DOC_KEY);
	if (!persisted) return false;
	const meta = loadDocMeta();
	if (!meta) return false;
	return simpleHash(persisted) !== meta.savedChecksum;
}

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
		return parsePenDocument(samplePen);
	} catch {
		return createEmptyDocument();
	}
}

function loadLastDocument(): PenDocument {
	if (typeof window === "undefined") return createEmptyDocument();
	try {
		const persisted = window.localStorage.getItem(LOCAL_DOC_KEY);
		if (persisted) return parsePenDocument(JSON.parse(persisted));
	} catch (_) {
		return createEmptyDocument();
	}
	return createEmptyDocument();
}

function getSelectedElementProperties(
	document: PenDocument,
	selectedNodePath: string[] | null,
): string | null {
	if (!selectedNodePath || selectedNodePath.length === 0) return null;
	const findNode = (nodes: PenNode[], path: string[]): PenNode | null => {
		if (path.length === 0) return null;
		const [first, ...rest] = path;
		const node = nodes.find((n) => n.id === first);
		if (!node) return null;
		if (rest.length === 0) return node;
		if (node.type === "ref") {
			const descendants = (node as { descendants?: Record<string, unknown> })
				.descendants;
			const descendantPath = rest.join("/");
			const descendantPatch =
				descendants && typeof descendants[descendantPath] === "object"
					? (descendants[descendantPath] as Record<string, unknown>)
					: null;
			if (descendantPatch) {
				return {
					type: "ref",
					id: path.join("/"),
					...descendantPatch,
				} as PenNode;
			}
		}
		if ("children" in node && Array.isArray(node.children))
			return findNode(node.children as PenNode[], rest);
		return null;
	};
	const node = findNode(document.children, selectedNodePath);
	if (!node) return null;
	const { children, ...properties } = node as Record<string, unknown>;
	return JSON.stringify(properties);
}

function useDocumentHistory(initialDoc: PenDocument, onDirty?: () => void) {
	const [state, setState] = useState({ history: [initialDoc], index: 0 });
	const isDebouncingRef = useRef(false);
	const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const onDirtyRef = useRef(onDirty);
	onDirtyRef.current = onDirty;

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
				onDirtyRef.current?.();

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
	onLoadLastDocument: () => void;
	onSaveDocument: () => void;
	onSaveAs: () => void;
	showLayers: boolean;
	onToggleLayers: () => void;
	isConnected: boolean;
	theme: Theme;
	onToggleTheme: () => void;
	docName: string;
	isDirty: boolean;
	syncStatus?: "idle" | "syncing" | "stale" | "error";
	hasWorkspace?: boolean;
}

function TitleBar({
	canUndo,
	canRedo,
	onUndo,
	onRedo,
	onNewDocument,
	onLoadDocument,
	onLoadLastDocument,
	onSaveDocument,
	onSaveAs,
	showLayers,
	onToggleLayers,
	isConnected,
	theme,
	onToggleTheme,
	docName,
	isDirty,
	syncStatus = "idle",
	hasWorkspace = false,
}: TitleBarProps) {
	const { colors: C } = useTheme();
	const titleBarStyles = STYLES[theme].titleBarStyles;
	const [showLoadMenu, setShowLoadMenu] = useState(false);
	const [showSaveMenu, setShowSaveMenu] = useState(false);

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
				{isDirty ? (
					<View
						style={{
							width: 6,
							height: 6,
							borderRadius: 999,
							backgroundColor: C.accent,
							marginRight: -2,
						}}
					/>
				) : null}
				<Text style={titleBarStyles.filename}>{docName}.pen</Text>
				<Text style={titleBarStyles.pathDivider}>/</Text>
				<Text style={titleBarStyles.pathText}>
					{hasWorkspace
						? syncStatus === "syncing"
							? "workspace ↑"
							: syncStatus === "stale"
								? "workspace ⚠"
								: syncStatus === "error"
									? "workspace ✕"
									: "workspace"
						: "local"}
				</Text>
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

				<View style={{ position: "relative" as any }}>
					<ActionButton
						icon="folder-open-outline"
						label="Load ▾"
						onPress={() => {
							setShowLoadMenu((v) => !v);
							setShowSaveMenu(false);
						}}
					/>
					{showLoadMenu ? (
						<View
							style={titleBarStyles.dropdown}
							// @ts-expect-error - web only
							onMouseLeave={() => setShowLoadMenu(false)}
						>
							<Pressable
								style={titleBarStyles.dropdownItem}
								onPress={() => {
									setShowLoadMenu(false);
									onLoadLastDocument();
								}}
							>
								<Ionicons name="time-outline" size={12} color={C.textMuted} />
								<Text style={titleBarStyles.dropdownItemText}>
									Load Last Auto-Save
								</Text>
							</Pressable>
							<Pressable
								style={titleBarStyles.dropdownItem}
								onPress={() => {
									setShowLoadMenu(false);
									onLoadDocument();
								}}
							>
								<Ionicons
									name="folder-open-outline"
									size={12}
									color={C.textMuted}
								/>
								<Text style={titleBarStyles.dropdownItemText}>
									Import JSON File…
								</Text>
							</Pressable>
						</View>
					) : null}
				</View>

				<View style={{ position: "relative" as any }}>
					<ActionButton
						icon="cloud-upload-outline"
						label={`${isDirty ? "● " : ""}Save ▾`}
						onPress={() => {
							setShowSaveMenu((v) => !v);
							setShowLoadMenu(false);
						}}
					/>
					{showSaveMenu ? (
						<View
							style={[titleBarStyles.dropdown, { right: 0 }]}
							// @ts-expect-error - web only
							onMouseLeave={() => setShowSaveMenu(false)}
						>
							<Pressable
								style={titleBarStyles.dropdownItem}
								onPress={() => {
									setShowSaveMenu(false);
									onSaveDocument();
								}}
							>
								<Ionicons name="save-outline" size={12} color={C.textMuted} />
								<Text style={titleBarStyles.dropdownItemText}>
									Save ({docName}.pen.json)
								</Text>
							</Pressable>
							<Pressable
								style={titleBarStyles.dropdownItem}
								onPress={() => {
									setShowSaveMenu(false);
									onSaveAs();
								}}
							>
								<Ionicons name="pencil-outline" size={12} color={C.textMuted} />
								<Text style={titleBarStyles.dropdownItemText}>Save As…</Text>
							</Pressable>
						</View>
					) : null}
				</View>

				<View style={titleBarStyles.divider} />
				<Pressable style={titleBarStyles.agentsButton}>
					<Ionicons name="flash-outline" size={14} color={C.accent} />
					<Text style={titleBarStyles.agentsButtonText}>Agents & MCP</Text>
				</Pressable>
				<View style={titleBarStyles.divider} />
				<IconButton
					icon={theme === "dark" ? "sunny-outline" : "moon-outline"}
					onPress={onToggleTheme}
					accessibilityLabel="Toggle Theme"
				/>
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
	const { theme, colors: C } = useTheme();
	const toolSidebarStyles = STYLES[theme].toolSidebarStyles;
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
	onReorder?: (
		draggedId: string,
		targetId: string,
		insertAboveInPanel: boolean,
	) => void;
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
	onReorder,
}: LayersPanelProps) {
	const { theme, colors: C } = useTheme();
	const layersPanelStyles = STYLES[theme].layersPanelStyles;
	const [collapsedIds, setCollapsedIds] = useState<Set<string>>(
		() => new Set(),
	);
	const [dragId, setDragId] = useState<string | null>(null);
	const [dropTargetId, setDropTargetId] = useState<string | null>(null);
	const [dropAbove, setDropAbove] = useState(true);

	const rows = useMemo<LayerRow[]>(() => {
		const nextRows: LayerRow[] = [];

		const walk = (nodes: PenNode[], depth: number, basePath: string[]) => {
			for (const node of [...nodes].reverse()) {
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

	const handleDragStart = useCallback((e: any, nodeId: string) => {
		setDragId(nodeId);
		e.dataTransfer?.setData("text/plain", nodeId);
	}, []);

	const handleDragOver = useCallback((e: any, nodeId: string) => {
		e.preventDefault();
		const rect = e.currentTarget?.getBoundingClientRect?.();
		if (rect) {
			setDropAbove(e.clientY < rect.top + rect.height / 2);
		}
		setDropTargetId(nodeId);
	}, []);

	const handleDragLeave = useCallback((e: any) => {
		if (!e.currentTarget.contains?.(e.relatedTarget)) {
			setDropTargetId(null);
		}
	}, []);

	const handleDrop = useCallback(
		(e: any, targetNodeId: string) => {
			e.preventDefault();
			if (dragId && dragId !== targetNodeId) {
				onReorder?.(dragId, targetNodeId, dropAbove);
			}
			setDragId(null);
			setDropTargetId(null);
		},
		[dragId, dropAbove, onReorder],
	);

	const handleDragEnd = useCallback(() => {
		setDragId(null);
		setDropTargetId(null);
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
							// @ts-expect-error - HTML5 drag props on web
							draggable
							onDragStart={(e: any) => handleDragStart(e, row.node.id)}
							onDragOver={(e: any) => handleDragOver(e, row.node.id)}
							onDragLeave={handleDragLeave}
							onDrop={(e: any) => handleDrop(e, row.node.id)}
							onDragEnd={handleDragEnd}
							style={({ pressed }) => [
								layersPanelStyles.row,
								{ paddingLeft: 8 + row.depth * 14 },
								selected && layersPanelStyles.rowSelected,
								pressed && layersPanelStyles.rowPressed,
								dragId === row.node.id && { opacity: 0.4 },
								dropTargetId === row.node.id &&
									dropAbove &&
									layersPanelStyles.rowDropAbove,
								dropTargetId === row.node.id &&
									!dropAbove &&
									layersPanelStyles.rowDropBelow,
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
	docBeforeBatch?: PenDocument;
	rolledBack?: boolean;
}

interface ChatSidebarProps {
	onClose: () => void;
	selectedNodePath: string[] | null;
	document: PenDocument;
	onApplyOps: (
		ops: unknown[],
		onProgress: (step: number, total: number) => void,
	) => Promise<{ appliedOps: number; errors: string[] }>;
	onRollback: (snapshot: PenDocument) => void;
}

function ChatSidebar({
	onClose,
	selectedNodePath,
	document,
	onApplyOps,
	onRollback,
}: ChatSidebarProps) {
	const { theme, colors: C } = useTheme();
	const chatSidebarStyles = STYLES[theme].chatSidebarStyles;
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [input, setInput] = useState("");
	const [applyProgress, setApplyProgress] = useState<{
		step: number;
		total: number;
	} | null>(null);
	const sendMessageMutation = trpc.designChat.sendMessage.useMutation();
	const isSending = sendMessageMutation.isPending;
	const isApplying = applyProgress !== null;
	const scrollRef = useRef<ScrollView>(null);

	const promptPills = [
		"Make this layout cleaner",
		"Create a settings panel",
		"Tighten typography spacing",
		"Add visual hierarchy",
	];

	const selectedNodeInfo = useMemo(() => {
		if (!selectedNodePath || selectedNodePath.length === 0) return null;
		const props = getSelectedElementProperties(document, selectedNodePath);
		if (!props) return null;
		const parsed = JSON.parse(props);
		const type = parsed.type ?? "node";
		const name = parsed.name ?? parsed.content ?? parsed.id?.slice(0, 8);
		return { type, name: String(name), full: props };
	}, [document, selectedNodePath]);

	const contextHint = selectedNodeInfo
		? `Selected: ${selectedNodeInfo.type} "${selectedNodeInfo.name}"`
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

		const selectedElementJson =
			getSelectedElementProperties(document, selectedNodePath) ?? undefined;

		try {
			const response = await sendMessageMutation.mutateAsync({
				message: text,
				documentJson: JSON.stringify(document),
				selectedFrameId: selectedNodePath?.[0] ?? undefined,
				selectedElementId:
					selectedNodePath && selectedNodePath.length > 0
						? selectedNodePath.join("/")
						: undefined,
				selectedElementJson: selectedElementJson ?? undefined,
			});

			const totalOps = Array.isArray(response.ops) ? response.ops.length : 0;
			if (totalOps > 0) {
				setApplyProgress({ step: 0, total: totalOps });
			}
			const docBeforeBatch = document;
			const applyResult = await onApplyOps(response.ops, (step, total) => {
				setApplyProgress({ step, total });
			});
			const assistantMessage: ChatMessage = {
				id: `a-${Date.now()}`,
				role: "assistant",
				content: response.reply,
				ops: response.ops,
				appliedOps: applyResult.appliedOps,
				opErrors: applyResult.errors,
				docBeforeBatch,
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
			setApplyProgress(null);
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

	const handleRetry = useCallback(
		async (message: ChatMessage) => {
			if (!message.ops?.length || isApplying || isSending) return;
			const total = message.ops.length;
			setApplyProgress({ step: 0, total });
			const result = await onApplyOps(message.ops, (step, tot) => {
				setApplyProgress({ step, total: tot });
			});
			setMessages((prev) =>
				prev.map((m) =>
					m.id === message.id
						? {
								...m,
								appliedOps: result.appliedOps,
								opErrors: result.errors,
								rolledBack: false,
							}
						: m,
				),
			);
			setApplyProgress(null);
		},
		[isApplying, isSending, onApplyOps],
	);

	const handleRollback = useCallback(
		(message: ChatMessage) => {
			if (!message.docBeforeBatch) return;
			onRollback(message.docBeforeBatch);
			setMessages((prev) =>
				prev.map((m) => (m.id === message.id ? { ...m, rolledBack: true } : m)),
			);
		},
		[onRollback],
	);

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
								{!user &&
								Array.isArray(message.ops) &&
								message.ops.length > 0 ? (
									<View style={chatSidebarStyles.recoveryRow}>
										<Text style={chatSidebarStyles.opsText}>
											{message.rolledBack
												? "↩ Rolled back"
												: `Applied ${message.appliedOps ?? 0}/${message.ops.length} ops`}
										</Text>
										{!message.rolledBack ? (
											<>
												<Pressable
													onPress={() => void handleRetry(message)}
													disabled={isApplying || isSending}
													style={({ pressed }) => [
														chatSidebarStyles.recoveryButton,
														(isApplying || isSending || pressed) &&
															chatSidebarStyles.recoveryButtonDisabled,
													]}
												>
													<Ionicons
														name="refresh-outline"
														size={11}
														color={C.textMuted}
													/>
													<Text style={chatSidebarStyles.recoveryButtonText}>
														Retry
													</Text>
												</Pressable>
												{message.docBeforeBatch ? (
													<Pressable
														onPress={() => handleRollback(message)}
														disabled={isApplying || isSending}
														style={({ pressed }) => [
															chatSidebarStyles.recoveryButton,
															(isApplying || isSending || pressed) &&
																chatSidebarStyles.recoveryButtonDisabled,
														]}
													>
														<Ionicons
															name="arrow-undo-outline"
															size={11}
															color={C.textMuted}
														/>
														<Text style={chatSidebarStyles.recoveryButtonText}>
															Rollback
														</Text>
													</Pressable>
												) : null}
											</>
										) : null}
									</View>
								) : null}
							</View>
						);
					})
				)}

				{isSending || isApplying ? (
					<View
						style={[
							chatSidebarStyles.messageBubble,
							chatSidebarStyles.messageBubbleAssistant,
						]}
					>
						<View style={chatSidebarStyles.loadingRow}>
							<ActivityIndicator size="small" color={C.accent} />
							<Text style={chatSidebarStyles.messageTextAssistant}>
								{isApplying && applyProgress
									? `Applying ${applyProgress.step}/${applyProgress.total} changes...`
									: "Thinking..."}
							</Text>
						</View>
						{isApplying && applyProgress ? (
							<View style={chatSidebarStyles.progressTrack}>
								<View
									style={[
										chatSidebarStyles.progressFill,
										{
											width: `${Math.max(
												8,
												Math.round(
													(applyProgress.step /
														Math.max(1, applyProgress.total)) *
														100,
												),
											)}%`,
										},
									]}
								/>
							</View>
						) : null}
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
						onKeyPress={(event) => {
							if (event.nativeEvent.key === "Enter") {
								event.preventDefault();
								void handleSend();
							}
						}}
						style={chatSidebarStyles.textInput}
						placeholder="Describe what to change"
						placeholderTextColor={C.textMuted}
						multiline
						maxLength={2000}
					/>
					<Pressable
						onPress={handleSend}
						disabled={!input.trim() || isSending || isApplying}
						style={({ pressed }) => [
							chatSidebarStyles.sendButton,
							(!input.trim() || isSending || isApplying || pressed) &&
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

interface RecoveryBannerProps {
	savedAt: number;
	onContinue: () => void;
	onDiscard: () => void;
}

function RecoveryBanner({
	savedAt,
	onContinue,
	onDiscard,
}: RecoveryBannerProps) {
	const elapsed = Date.now() - savedAt;
	const minutes = Math.round(elapsed / 60000);
	const label =
		minutes < 1
			? "moments ago"
			: minutes === 1
				? "1 minute ago"
				: minutes < 60
					? `${minutes} minutes ago`
					: `${Math.round(minutes / 60)} hours ago`;

	return (
		<View
			style={{
				backgroundColor: "#1c1a12",
				borderBottomWidth: 1,
				borderBottomColor: "#3d3720",
				paddingHorizontal: 16,
				paddingVertical: 8,
				flexDirection: "row",
				alignItems: "center",
				gap: 10,
			}}
		>
			<Ionicons name="warning-outline" size={14} color="#facc15" />
			<Text style={{ color: "#fde68a", fontSize: 12, flex: 1 }}>
				Unsaved work from {label}. Continue or discard?
			</Text>
			<Pressable
				onPress={onContinue}
				style={{
					height: 24,
					paddingHorizontal: 10,
					borderRadius: 6,
					backgroundColor: "#854d0e",
					justifyContent: "center",
				}}
			>
				<Text style={{ color: "#fef3c7", fontSize: 11, fontWeight: "600" }}>
					Continue
				</Text>
			</Pressable>
			<Pressable
				onPress={onDiscard}
				style={{
					height: 24,
					paddingHorizontal: 10,
					borderRadius: 6,
					borderWidth: 1,
					borderColor: "#3d3720",
					justifyContent: "center",
				}}
			>
				<Text style={{ color: "#a1a1aa", fontSize: 11 }}>Discard</Text>
			</Pressable>
		</View>
	);
}

interface ChatCollapsedStripProps {
	onOpen: () => void;
}

function ChatCollapsedStrip({ onOpen }: ChatCollapsedStripProps) {
	const { theme, colors: C } = useTheme();
	const chatCollapsedStripStyles = STYLES[theme].chatCollapsedStripStyles;
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
	const { theme, colors: C } = useTheme();
	const sharedStyles = STYLES[theme].sharedStyles;
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
	const { theme, colors: C } = useTheme();
	const sharedStyles = STYLES[theme].sharedStyles;
	return (
		<Pressable style={sharedStyles.actionButton} onPress={onPress}>
			<Ionicons name={icon} size={13} color={C.textMuted} />
			<Text style={sharedStyles.actionButtonText}>{label}</Text>
		</Pressable>
	);
}

type AgentCursorState = {
	agentId: string;
	x: number;
	y: number;
	action: string;
	timestamp: number;
};

function wait(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function getOpType(op: unknown): string {
	if (!op || typeof op !== "object") return "op";
	const candidate = (op as { type?: unknown }).type;
	return typeof candidate === "string" ? candidate : "op";
}

function getCursorPointFromOp(
	op: unknown,
	fallback: { x: number; y: number },
): { x: number; y: number } {
	if (!op || typeof op !== "object") return fallback;
	const typedOp = op as {
		x?: unknown;
		y?: unknown;
		patch?: { x?: unknown; y?: unknown };
		element?: { x?: unknown; y?: unknown };
	};

	const directX = typeof typedOp.x === "number" ? typedOp.x : null;
	const directY = typeof typedOp.y === "number" ? typedOp.y : null;
	if (directX !== null && directY !== null) {
		return { x: directX, y: directY };
	}

	const patchX =
		typedOp.patch && typeof typedOp.patch.x === "number"
			? typedOp.patch.x
			: null;
	const patchY =
		typedOp.patch && typeof typedOp.patch.y === "number"
			? typedOp.patch.y
			: null;
	if (patchX !== null && patchY !== null) {
		return { x: patchX, y: patchY };
	}

	const elementX =
		typedOp.element && typeof typedOp.element.x === "number"
			? typedOp.element.x
			: null;
	const elementY =
		typedOp.element && typeof typedOp.element.y === "number"
			? typedOp.element.y
			: null;
	if (elementX !== null && elementY !== null) {
		return { x: elementX, y: elementY };
	}

	return fallback;
}

function PencilScreenContent() {
	const [theme, setTheme] = useState<Theme>("dark");
	const colors = THEMES[theme];
	const styles = STYLES[theme].main;

	const [docName, setDocName] = useState<string>(
		() => loadDocMeta()?.name ?? "Untitled",
	);
	const [isDirty, setIsDirty] = useState(false);
	const [showRecovery, setShowRecovery] = useState(() => hasUnsavedAutoSave());
	const recoveryMeta = showRecovery ? loadDocMeta() : null;

	const { document, setDocument, commitHistory, undo, redo, canUndo, canRedo } =
		useDocumentHistory(loadSampleDocument(), () => setIsDirty(true));
	const [selectedNodePaths, setSelectedNodePaths] = useState<string[][]>([]);
	const [chatOpen, setChatOpen] = useState(true);
	const [chatCollapsed, setChatCollapsed] = useState(false);
	const [showLayers, setShowLayers] = useState(true);
	const [activeTool, setActiveTool] = useState<ToolId>("pointer");
	const [localAgentCursor, setLocalAgentCursor] =
		useState<AgentCursorState | null>(null);
	const selectedNodePath = selectedNodePaths[0] ?? null;
	const documentRef = useRef(document);

	const {
		sessionId: runtimeSessionId,
		projectRoot: runtimeProjectRoot,
		filePath: runtimeFilePath,
		fileRef,
		syncStatus,
	} = usePencilDocumentSync({
		document,
		onRemoteDocument: (remoteDoc) => {
			setDocument(remoteDoc);
			setIsDirty(false);
		},
	});
	const runtimeState = useMemo(
		() =>
			buildPencilRuntimeState({
				document,
				sessionId: runtimeSessionId,
				projectRoot: runtimeProjectRoot,
				filePath: runtimeFilePath,
				targetId: selectedNodePath?.[selectedNodePath.length - 1] ?? null,
				targetPath: selectedNodePath,
				mode: "editor",
			}),
		[document, runtimeFilePath, runtimeProjectRoot, runtimeSessionId, selectedNodePath],
	);

	usePencilBridge(document, setDocument, {
		selectedNodePath,
		runtimeState,
	});

	const isInteractingRef = useRef(false);
	const { isConnected, agentCursors, sendDelta, flushPendingServerUpdate } =
		usePencilServer({
			document,
			setDocument,
			onDocumentChange: (nextDocument) => {
				persistDocument(nextDocument);
			},
			isInteractingRef,
		});

	useEffect(() => {
		documentRef.current = document;
	}, [document]);

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
		setDocName("Untitled");
		setIsDirty(false);
		setShowRecovery(false);
	}, [setDocument]);

	const exportDocumentToFile = useCallback((doc: PenDocument, name: string) => {
		if (typeof window === "undefined") return;
		const safe = name.replace(/[^a-zA-Z0-9-_ ]/g, "_").trim() || "Untitled";
		const json = JSON.stringify(doc, null, 2);
		const blob = new Blob([json], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const anchor = window.document.createElement("a");
		anchor.href = url;
		anchor.download = `${safe}.pen.json`;
		anchor.click();
		URL.revokeObjectURL(url);
		persistDocument(doc);
		saveDocMeta({
			name: safe,
			savedAt: Date.now(),
			savedChecksum: docChecksum(doc),
		});
		setDocName(safe);
		setIsDirty(false);
		setShowRecovery(false);
	}, []);

	const handleSaveDocument = useCallback(() => {
		exportDocumentToFile(document, docName);
	}, [document, docName, exportDocumentToFile]);

	const handleSaveAs = useCallback(() => {
		if (typeof window === "undefined") return;
		const name = window.prompt("Document name:", docName);
		if (!name?.trim()) return;
		exportDocumentToFile(document, name.trim());
	}, [document, docName, exportDocumentToFile]);

	const handleLoadLastDocument = useCallback(() => {
		const doc = loadLastDocument();
		setDocument(doc);
		setSelectedNodePaths([]);
		setShowRecovery(false);
		setIsDirty(false);
	}, [setDocument]);

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
			const importedName =
				file.name
					.replace(/\.(pen\.json|json|pen)$/, "")
					.replace(/[^a-zA-Z0-9-_ ]/g, "_")
					.trim() || "Imported";
			setDocument(parsed);
			setSelectedNodePaths([]);
			setDocName(importedName);
			setIsDirty(true);
			setShowRecovery(false);
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
		async (
			ops: unknown[],
			onProgress: (step: number, total: number) => void,
		) => {
			const opsArray = Array.isArray(ops) ? ops : [];
			const total = opsArray.length;
			if (total === 0) {
				return { appliedOps: 0, errors: [] };
			}

			let currentDoc = documentRef.current;
			let appliedOps = 0;
			const errors: string[] = [];

			const validationIssues = validateDesignChatOps(currentDoc, opsArray);
			const schemaErrorIndices = new Set(
				validationIssues
					.filter((v) => v.severity === "error")
					.map((v) => v.opIndex),
			);
			for (const issue of validationIssues) {
				errors.push(
					`[${issue.severity}] op[${issue.opIndex}]: ${issue.message}`,
				);
			}

			let lastPoint = { x: 520, y: 380 };

			for (let i = 0; i < opsArray.length; i += 1) {
				const op = opsArray[i];
				const step = i + 1;

				if (schemaErrorIndices.has(i)) {
					onProgress(step, total);
					await wait(60);
					continue;
				}

				const point = getCursorPointFromOp(op, lastPoint);
				lastPoint = point;

				setLocalAgentCursor({
					agentId: "radbot",
					x: point.x,
					y: point.y,
					action: `${getOpType(op)} ${step}/${total}`,
					timestamp: Date.now(),
				});

				const result = applyDesignChatOpsToDocument(currentDoc, [op]);
				currentDoc = result.nextDocument;
				setDocument(currentDoc);
				appliedOps += result.appliedOps;
				errors.push(...result.errors);

				if (isConnected) {
					sendDelta([op]);
				}

				onProgress(step, total);
				await wait(120);
			}

			setTimeout(() => {
				setLocalAgentCursor(null);
			}, 900);

			return { appliedOps, errors };
		},
		[isConnected, sendDelta, setDocument],
	);

	const mergedAgentCursors = useMemo(
		() =>
			localAgentCursor ? [...agentCursors, localAgentCursor] : agentCursors,
		[agentCursors, localAgentCursor],
	);

	const handleLayerReorder = useCallback(
		(draggedId: string, targetId: string, insertAboveInPanel: boolean) => {
			setDocument((prev) => {
				const next = JSON.parse(JSON.stringify(prev)) as typeof prev;

				function findSiblings(nodes: PenNode[]): PenNode[] | null {
					const hasDragged = nodes.some((n) => n.id === draggedId);
					const hasTarget = nodes.some((n) => n.id === targetId);
					if (hasDragged && hasTarget) return nodes;
					for (const node of nodes) {
						if ("children" in node && Array.isArray(node.children)) {
							const found = findSiblings(node.children as PenNode[]);
							if (found) return found;
						}
					}
					return null;
				}

				const siblings = findSiblings(next.children);
				if (!siblings) return prev;

				const fromIdx = siblings.findIndex((n) => n.id === draggedId);
				const toIdx = siblings.findIndex((n) => n.id === targetId);
				if (fromIdx === -1 || toIdx === -1) return prev;

				const [dragged] = siblings.splice(fromIdx, 1);
				const newToIdx = siblings.findIndex((n) => n.id === targetId);

				// Panel is reversed vs array:
				// "above in panel" = higher index in array (rendered on top)
				const insertAt = insertAboveInPanel ? newToIdx + 1 : newToIdx;
				siblings.splice(Math.max(0, insertAt), 0, dragged);

				return next;
			});
			commitHistory();
		},
		[setDocument, commitHistory],
	);

	const penCanvasTool = (activeTool === "pen" ? "pen" : "pointer") as
		| "pointer"
		| "pen";
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
		<ThemeContext.Provider value={{ theme, colors }}>
			<SafeAreaView style={styles.root}>
				<TitleBar
					canUndo={canUndo}
					canRedo={canRedo}
					onUndo={undo}
					onRedo={redo}
					onNewDocument={handleNewDocument}
					onLoadDocument={handleLoadDocument}
					onLoadLastDocument={handleLoadLastDocument}
					onSaveDocument={handleSaveDocument}
					onSaveAs={handleSaveAs}
					showLayers={showLayers}
					onToggleLayers={() => setShowLayers((prev) => !prev)}
					isConnected={isConnected}
					theme={theme}
					onToggleTheme={() =>
						setTheme((t) => (t === "dark" ? "light" : "dark"))
					}
					docName={docName}
					isDirty={isDirty}
					syncStatus={syncStatus}
					hasWorkspace={!!fileRef}
				/>

				{showRecovery && recoveryMeta ? (
					<RecoveryBanner
						savedAt={recoveryMeta.savedAt}
						onContinue={() => setShowRecovery(false)}
						onDiscard={() => {
							handleNewDocument();
						}}
					/>
				) : null}

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
							onReorder={handleLayerReorder}
						/>
					) : null}

					<View style={styles.canvasArea}>
						<Suspense fallback={<View style={styles.canvasFallback} />}>
							<PenCanvasPanel
								{...penCanvasUiProps}
								document={document}
								onAddNode={handleAddNode}
								onDocumentChange={setDocument}
								selectedNodePaths={selectedNodePaths}
								onSelectionChange={setSelectedNodePaths}
								agentCursors={mergedAgentCursors}
								isInteractingRef={isInteractingRef}
								onInteractionEnd={() => {
									isInteractingRef.current = false;
									flushPendingServerUpdate();
									commitHistory();
								}}
							/>
						</Suspense>
					</View>

					{showChatSidebar ? (
						<ChatSidebar
							onClose={handleCloseChat}
							selectedNodePath={selectedNodePath}
							document={document}
							onApplyOps={handleApplyChatOps}
							onRollback={(snapshot) => {
								setDocument(snapshot);
								commitHistory();
							}}
						/>
					) : (
						<ChatCollapsedStrip onOpen={handleOpenChat} />
					)}
				</View>
			</SafeAreaView>
		</ThemeContext.Provider>
	);
}

export default function PencilScreen() {
	return (
		<PencilStoreProvider>
			<PencilScreenContent />
		</PencilStoreProvider>
	);
}

const getSharedStyles = (C: ThemeColors) =>
	StyleSheet.create({
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

const getTitleBarStyles = (C: ThemeColors) =>
	StyleSheet.create({
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
		dropdown: {
			position: "absolute",
			top: 30,
			left: 0,
			minWidth: 200,
			backgroundColor: C.sidebar,
			borderWidth: 1,
			borderColor: C.border,
			borderRadius: 8,
			paddingVertical: 4,
			zIndex: 1000,
			shadowColor: "#000",
			shadowOpacity: 0.3,
			shadowRadius: 8,
			shadowOffset: { width: 0, height: 4 },
		},
		dropdownItem: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
			paddingHorizontal: 12,
			paddingVertical: 7,
		},
		dropdownItemText: {
			color: C.text,
			fontSize: 12,
		},
	});

const getToolSidebarStyles = (C: ThemeColors) =>
	StyleSheet.create({
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

const getLayersPanelStyles = (C: ThemeColors) =>
	StyleSheet.create({
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
		rowDropAbove: {
			borderTopWidth: 2,
			borderTopColor: "#818cf8",
		},
		rowDropBelow: {
			borderBottomWidth: 2,
			borderBottomColor: "#818cf8",
		},
	});

const getChatSidebarStyles = (C: ThemeColors) =>
	StyleSheet.create({
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
		loadingRow: {
			flexDirection: "row",
			alignItems: "center",
			gap: 8,
		},
		progressTrack: {
			height: 4,
			borderRadius: 999,
			backgroundColor: C.border,
			overflow: "hidden",
		},
		progressFill: {
			height: "100%",
			backgroundColor: C.accent,
			borderRadius: 999,
		},
		opsText: {
			color: C.textMuted,
			fontSize: 10,
		},
		recoveryRow: {
			flexDirection: "row" as const,
			alignItems: "center" as const,
			flexWrap: "wrap" as const,
			gap: 6,
		},
		recoveryButton: {
			flexDirection: "row" as const,
			alignItems: "center" as const,
			gap: 3,
			paddingHorizontal: 7,
			paddingVertical: 3,
			borderRadius: 6,
			borderWidth: 1,
			borderColor: C.border,
			backgroundColor: C.surface,
		},
		recoveryButtonDisabled: {
			opacity: 0.4,
		},
		recoveryButtonText: {
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

const getChatCollapsedStripStyles = (C: ThemeColors) =>
	StyleSheet.create({
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

const getStyles = (C: ThemeColors) =>
	StyleSheet.create({
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
		canvasFallback: {
			flex: 1,
			backgroundColor: C.bg,
		},
	});

const STYLES = {
	dark: {
		sharedStyles: getSharedStyles(THEMES.dark),
		titleBarStyles: getTitleBarStyles(THEMES.dark),
		toolSidebarStyles: getToolSidebarStyles(THEMES.dark),
		layersPanelStyles: getLayersPanelStyles(THEMES.dark),
		chatSidebarStyles: getChatSidebarStyles(THEMES.dark),
		chatCollapsedStripStyles: getChatCollapsedStripStyles(THEMES.dark),
		main: getStyles(THEMES.dark),
	},
	light: {
		sharedStyles: getSharedStyles(THEMES.light),
		titleBarStyles: getTitleBarStyles(THEMES.light),
		toolSidebarStyles: getToolSidebarStyles(THEMES.light),
		layersPanelStyles: getLayersPanelStyles(THEMES.light),
		chatSidebarStyles: getChatSidebarStyles(THEMES.light),
		chatCollapsedStripStyles: getChatCollapsedStripStyles(THEMES.light),
		main: getStyles(THEMES.light),
	},
};
