import { Ionicons } from "@expo/vector-icons";
import type { PenDocument, PenNode } from "@slopcade/shared/types/pen";
import { useTheme } from "@slopcade/theme";
import {
	lazy,
	Suspense,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	useWindowDimensions,
	View,
} from "react-native";
import { useDesignCamera } from "../camera/useDesignCamera";
import type { DesignCamera } from "../camera/useDesignCamera.shared";
import { buildComponentRegistry, resolveAllRefs } from "../pen/components";
import { layoutTree } from "../pen/layout";

const PenRenderer = lazy(() => import("../pen/render/PenRenderer"));

import { estimateTextSize } from "../pen/text-measure";
import { resolveTreeVariables } from "../pen/variables";
import type { PenDrawingState } from "../tools/penToolState";
import {
	buildPathNode,
	EMPTY_PEN_STATE,
	screenToDoc,
} from "../tools/penToolState";
import { MultiplayerOverlay } from "./MultiplayerOverlay";

export interface PenCanvasPanelProps {
	document: PenDocument;
	isLoading?: boolean;
	onAddNode?: (node: PenNode) => void;
	onDocumentChange?: (next: PenDocument) => void;
	selectedNodePaths?: string[][];
	onSelectionChange?: (paths: string[][]) => void;
	agentCursors?: import("./MultiplayerOverlay").AgentCursor[];
	onInteractionEnd?: () => void;
	isInteractingRef?: React.MutableRefObject<boolean>;
	hidePalette?: boolean;
	externalActiveTool?: "pointer" | "pen";
	hideHeader?: boolean;
	hideLayers?: boolean;
	hideInspector?: boolean;
	autoFit?: boolean;
}

const MIN_SCALE = 0.05;
const MAX_SCALE = 10;

function computeZoomToFit(
	penDocument: PenDocument,
	viewportWidth: number,
	viewportHeight: number,
): DesignCamera {
	const children = penDocument.children;
	if (children.length === 0) return { translateX: 0, translateY: 0, scale: 1 };

	const registry = buildComponentRegistry(children);
	const resolved = resolveAllRefs(children, registry);
	const withVars = resolveTreeVariables(
		resolved,
		penDocument.variables,
		penDocument.themes,
	);
	const nodes = layoutTree(withVars, estimateTextSize);

	let minX = Infinity,
		minY = Infinity,
		maxX = -Infinity,
		maxY = -Infinity;
	for (const ln of nodes) {
		// Skip reusable component definitions and hidden nodes from fit calculation
		if ((ln.node as { reusable?: boolean }).reusable) continue;
		if (ln.node.enabled === false || ln.node.visible === false) continue;
		minX = Math.min(minX, ln.rect.x);
		minY = Math.min(minY, ln.rect.y);
		maxX = Math.max(maxX, ln.rect.x + ln.rect.width);
		maxY = Math.max(maxY, ln.rect.y + ln.rect.height);
	}

	const contentWidth = maxX - minX;
	const contentHeight = maxY - minY;
	if (contentWidth === 0 || contentHeight === 0)
		return { translateX: 0, translateY: 0, scale: 1 };

	const scaleX = (viewportWidth * 0.9) / contentWidth;
	const scaleY = (viewportHeight * 0.9) / contentHeight;
	const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scaleX, scaleY, 2));
	const centerX = (minX + maxX) / 2;
	const centerY = (minY + maxY) / 2;

	return {
		translateX: viewportWidth / 2 - centerX * newScale,
		translateY: viewportHeight / 2 - centerY * newScale,
		scale: newScale,
	};
}

function getNodeName(node: PenNode): string {
	if ("name" in node && typeof node.name === "string") return node.name;
	return node.id;
}

function findNodeById(nodes: PenNode[], id: string): PenNode | null {
	for (const node of nodes) {
		if (node.id === id) return node;
		if ("children" in node && Array.isArray(node.children)) {
			const found = findNodeById(node.children as PenNode[], id);
			if (found) return found;
		}
	}
	return null;
}

function updateNodesById(
	nodes: PenNode[],
	ids: Set<string>,
	update: (node: PenNode) => PenNode,
): PenNode[] {
	return nodes.map((node) => {
		const nextNode = ids.has(node.id) ? update(node) : node;
		if ("children" in nextNode && Array.isArray(nextNode.children)) {
			return {
				...nextNode,
				children: updateNodesById(nextNode.children as PenNode[], ids, update),
			} as PenNode;
		}
		return nextNode;
	});
}

function removeNodesById(nodes: PenNode[], ids: Set<string>): PenNode[] {
	return nodes
		.filter((node) => !ids.has(node.id))
		.map((node) => {
			if ("children" in node && Array.isArray(node.children)) {
				return {
					...node,
					children: removeNodesById(node.children as PenNode[], ids),
				} as PenNode;
			}
			return node;
		});
}

type NodeTypeIconName =
	| "albums-outline"
	| "layers-outline"
	| "text-outline"
	| "square-outline"
	| "ellipse-outline"
	| "flash-outline"
	| "star-outline"
	| "remove-outline"
	| "shapes-outline"
	| "git-network-outline"
	| "document-text-outline"
	| "apps-outline";

function getTypeIcon(type: PenNode["type"]): NodeTypeIconName {
	switch (type) {
		case "frame":
			return "albums-outline";
		case "group":
			return "layers-outline";
		case "text":
			return "text-outline";
		case "rectangle":
			return "square-outline";
		case "ellipse":
			return "ellipse-outline";
		case "effect":
			return "flash-outline";
		case "icon_font":
			return "star-outline";
		case "line":
			return "remove-outline";
		case "polygon":
			return "shapes-outline";
		case "path":
			return "git-network-outline";
		case "note":
			return "document-text-outline";
		default:
			return "apps-outline";
	}
}

interface LayersPanelProps {
	nodes: PenNode[];
	selectedNodePath: string[] | null;
	onSelectNode: (path: string[]) => void;
}

function LayersPanel({
	nodes,
	selectedNodePath,
	onSelectNode,
}: LayersPanelProps) {
	const { editorColors: c } = useTheme();
	const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

	const selectedId = selectedNodePath?.[selectedNodePath.length - 1] ?? null;

	const toggleExpanded = (id: string) => {
		setExpandedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	const getChildren = (node: PenNode): PenNode[] => {
		if ("children" in node && Array.isArray(node.children)) {
			return node.children as PenNode[];
		}
		return [];
	};

	return (
		<ScrollView
			style={[styles.layersPanel, { borderRightColor: c.border }]}
			contentContainerStyle={styles.layersPanelContent}
		>
			{nodes.map((node) => {
				const children = getChildren(node);
				const hasChildren = children.length > 0;
				const isExpanded = expandedIds.has(node.id);
				const isSelected = selectedId === node.id;

				return (
					<View key={node.id}>
						<Pressable
							onPress={() => onSelectNode([node.id])}
							style={[
								styles.layerRow,
								isSelected && { backgroundColor: c.surfaceHover },
							]}
						>
							<Pressable
								onPress={() => hasChildren && toggleExpanded(node.id)}
								style={styles.layerChevron}
								hitSlop={4}
							>
								{hasChildren ? (
									<Ionicons
										name={isExpanded ? "chevron-down" : "chevron-forward"}
										size={10}
										color={c.textSecondary}
									/>
								) : (
									<View style={{ width: 10 }} />
								)}
							</Pressable>
							<Ionicons
								name={getTypeIcon(node.type)}
								size={12}
								color={isSelected ? c.text : c.textSecondary}
								style={styles.layerTypeIcon}
							/>
							<Text
								style={[
									styles.layerName,
									{ color: isSelected ? c.text : c.textSecondary },
								]}
								numberOfLines={1}
							>
								{getNodeName(node)}
							</Text>
						</Pressable>

						{hasChildren &&
							isExpanded &&
							children.map((child) => {
								const childSelected = selectedId === child.id;
								return (
									<Pressable
										key={child.id}
										onPress={() => onSelectNode([child.id])}
										style={[
											styles.layerRow,
											styles.layerRowChild,
											childSelected && { backgroundColor: c.surfaceHover },
										]}
									>
										<Ionicons
											name={getTypeIcon(child.type)}
											size={12}
											color={childSelected ? c.text : c.textSecondary}
											style={styles.layerTypeIcon}
										/>
										<Text
											style={[
												styles.layerName,
												{ color: childSelected ? c.text : c.textSecondary },
											]}
											numberOfLines={1}
										>
											{getNodeName(child)}
										</Text>
									</Pressable>
								);
							})}
					</View>
				);
			})}
		</ScrollView>
	);
}

// ── Tool Palette ─────────────────────────────────────────────────────────────

interface ToolPaletteProps {
	activeTool: "pointer" | "pen";
	onSelectTool: (tool: "pointer" | "pen") => void;
}

function ToolPalette({ activeTool, onSelectTool }: ToolPaletteProps) {
	return (
		<View style={toolStyles.container}>
			<Pressable
				onPress={() => onSelectTool("pointer")}
				style={[
					toolStyles.toolButton,
					activeTool === "pointer" && toolStyles.toolButtonActive,
				]}
			>
				<Ionicons
					name="navigate-outline"
					size={16}
					color={activeTool === "pointer" ? "#818cf8" : "#6460a0"}
				/>
			</Pressable>
			<Pressable
				onPress={() => onSelectTool("pen")}
				style={[
					toolStyles.toolButton,
					activeTool === "pen" && toolStyles.toolButtonActive,
				]}
			>
				<Ionicons
					name="pencil-outline"
					size={16}
					color={activeTool === "pen" ? "#818cf8" : "#6460a0"}
				/>
			</Pressable>
			{activeTool === "pen" && (
				<View style={toolStyles.hint}>
					<Text style={toolStyles.hintText}>
						Click to add points · Drag for curves · Double-click to finish · Esc
						to cancel
					</Text>
				</View>
			)}
		</View>
	);
}

const toolStyles = StyleSheet.create({
	container: {
		position: "absolute",
		left: 12,
		top: "50%",
		transform: [{ translateY: -44 }],
		backgroundColor: "#0d0a1e",
		borderWidth: 1,
		borderColor: "#2d2650",
		borderRadius: 10,
		padding: 4,
		gap: 2,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 8,
		zIndex: 50,
	},
	toolButton: {
		width: 32,
		height: 32,
		borderRadius: 6,
		justifyContent: "center",
		alignItems: "center",
	},
	toolButtonActive: {
		backgroundColor: "#1e1a35",
	},
	hint: {
		position: "absolute",
		left: 44,
		top: 0,
		backgroundColor: "#0d0a1e",
		borderWidth: 1,
		borderColor: "#2d2650",
		borderRadius: 6,
		paddingHorizontal: 10,
		paddingVertical: 6,
		width: 260,
	},
	hintText: {
		color: "#a096c8",
		fontSize: 11,
		lineHeight: 16,
	},
});

// ─────────────────────────────────────────────────────────────────────────────

export function PenCanvasPanel({
	document: penDocument,
	isLoading,
	onAddNode,
	onDocumentChange,
	selectedNodePaths: selectedNodePathsProp,
	onSelectionChange,
	agentCursors,
	onInteractionEnd,
	isInteractingRef,
	hidePalette,
	externalActiveTool,
	hideHeader,
	hideLayers,
	hideInspector,
	autoFit,
}: PenCanvasPanelProps) {
	const { editorColors: c } = useTheme();
	const { width, height } = useWindowDimensions();
	const {
		camera,
		setCamera,
		onWheel,
		onMouseDown: cameraMouseDown,
		onMouseMove: cameraMouseMove,
		onMouseUp: cameraMouseUp,
	} = useDesignCamera();

	const [showFrameList, setShowFrameList] = useState(false);
	const [selectedFrameIndex, setSelectedFrameIndex] = useState(0);
	const [showLayers, setShowLayers] = useState(false);
	const [showInspector, setShowInspector] = useState(!hideInspector);
	const [selectedNodePaths, setSelectedNodePaths] = useState<string[][]>([]);
	const [hoveredNodePath, setHoveredNodePath] = useState<string[] | null>(null);
	const [marqueeRect, setMarqueeRect] = useState<{
		x: number;
		y: number;
		width: number;
		height: number;
	} | null>(null);

	// ── Pen tool state ────────────────────────────────────────────────────────
	const [activeTool, setActiveToolState] = useState<"pointer" | "pen">(
		"pointer",
	);
	// Sync the sidebar-controlled tool state with the internal pointer/pen state.
	useEffect(() => {
		if (externalActiveTool !== undefined && externalActiveTool !== activeTool) {
			activeToolRef.current = externalActiveTool;
			setActiveToolState(externalActiveTool);
		}
	}, [externalActiveTool, activeTool]);
	const [penState, setPenState] = useState<PenDrawingState>(EMPTY_PEN_STATE);
	const primarySelectedNodePath = selectedNodePaths[0] ?? null;

	// Refs so event handlers never go stale
	const activeToolRef = useRef<"pointer" | "pen">("pointer");
	const penStateRef = useRef<PenDrawingState>(EMPTY_PEN_STATE);
	const cameraRef = useRef<DesignCamera>(camera);
	const isDraggingHandleRef = useRef(false);
	const isSpaceDownRef = useRef(false);
	const marqueeRef = useRef<{
		startScreenX: number;
		startScreenY: number;
		currentScreenX: number;
		currentScreenY: number;
	} | null>(null);
	const dragRef = useRef<{
		lastDocX: number;
		lastDocY: number;
		paths: string[][];
		didMove: boolean;
	} | null>(null);
	cameraRef.current = camera;
	penStateRef.current = penState;

	// ── Pan state (spacebar + middle mouse) ──────────────────────────────────
	const [isSpaceDown, setIsSpaceDown] = useState(false);
	const [isMiddleMouseDown, setIsMiddleMouseDown] = useState(false);
	const [isSpaceDragging, setIsSpaceDragging] = useState(false);
	useEffect(() => {
		if (!selectedNodePathsProp) return;
		setSelectedNodePaths(selectedNodePathsProp);
	}, [selectedNodePathsProp]);

	useEffect(() => {
		setShowInspector(!hideInspector);
	}, [hideInspector]);

	const updateSelection = useCallback(
		(updater: (prev: string[][]) => string[][]) => {
			setSelectedNodePaths((prev) => {
				const next = updater(prev);
				onSelectionChange?.(next);
				return next;
			});
		},
		[onSelectionChange],
	);

	const applyDocumentUpdate = useCallback(
		(updater: (doc: PenDocument) => PenDocument) => {
			if (!onDocumentChange) return;
			onDocumentChange(updater(penDocument));
		},
		[onDocumentChange, penDocument],
	);

	const applyNumericDelta = useCallback(
		(key: "x" | "y" | "width" | "height", delta: number) => {
			if (selectedNodePaths.length === 0) return;
			const ids = new Set(
				selectedNodePaths
					.map((path) => path[path.length - 1])
					.filter((id): id is string => Boolean(id)),
			);
			applyDocumentUpdate((doc) => ({
				...doc,
				children: updateNodesById(doc.children, ids, (node) => {
					const current = (node as Record<string, unknown>)[key];
					if (typeof current !== "number") return node;
					return { ...node, [key]: current + delta } as PenNode;
				}),
			}));
		},
		[applyDocumentUpdate, selectedNodePaths],
	);

	const layoutNodes = useMemo(() => {
		const registry = buildComponentRegistry(penDocument.children);
		const resolved = resolveAllRefs(penDocument.children, registry);
		const withVars = resolveTreeVariables(
			resolved,
			penDocument.variables,
			penDocument.themes,
		);
		return layoutTree(withVars, estimateTextSize);
	}, [penDocument]);

	const selectableLayoutNodes = useMemo(() => {
		const acc: Array<{
			path: string[];
			rect: { x: number; y: number; width: number; height: number };
		}> = [];

		const visit = (
			nodes: Array<{
				node: PenNode;
				rect: { x: number; y: number; width: number; height: number };
				children: any[];
			}>,
			path: string[],
		) => {
			for (const ln of nodes) {
				const nextPath = [...path, ln.node.id];
				acc.push({ path: nextPath, rect: ln.rect });
				visit(ln.children as any[], nextPath);
			}
		};

		visit(layoutNodes as any[], []);
		return acc;
	}, [layoutNodes]);

	const switchTool = useCallback((tool: "pointer" | "pen") => {
		activeToolRef.current = tool;
		setActiveToolState(tool);
		if (tool === "pointer") {
			isDraggingHandleRef.current = false;
			penStateRef.current = EMPTY_PEN_STATE;
			setPenState(EMPTY_PEN_STATE);
		}
	}, []);

	const commitPenPath = useCallback(
		(closed: boolean) => {
			const node = buildPathNode(penStateRef.current.anchors, closed);
			if (node) onAddNode?.(node);
			isDraggingHandleRef.current = false;
			penStateRef.current = EMPTY_PEN_STATE;
			setPenState(EMPTY_PEN_STATE);
			activeToolRef.current = "pointer";
			setActiveToolState("pointer");
		},
		[onAddNode],
	);

	const penMouseDown = useCallback(
		(e: React.MouseEvent) => {
			const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
			const sx = e.clientX - rect.left;
			const sy = e.clientY - rect.top;
			const [docX, docY] = screenToDoc(sx, sy, cameraRef.current);

			if (e.detail >= 2) {
				commitPenPath(false);
				return;
			}

			const prev = penStateRef.current;
			const newAnchor = {
				docX,
				docY,
				handleInDocX: docX,
				handleInDocY: docY,
				handleOutDocX: docX,
				handleOutDocY: docY,
			};

			const next: PenDrawingState = {
				...prev,
				anchors: [...prev.anchors, newAnchor],
				cursorDocX: docX,
				cursorDocY: docY,
				isDraggingHandle: true,
			};
			penStateRef.current = next;
			setPenState(next);
			isDraggingHandleRef.current = true;
		},
		[commitPenPath],
	);

	const penMouseMove = useCallback((e: React.MouseEvent) => {
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const sx = e.clientX - rect.left;
		const sy = e.clientY - rect.top;
		const [docX, docY] = screenToDoc(sx, sy, cameraRef.current);

		const prev = penStateRef.current;

		if (isDraggingHandleRef.current && prev.anchors.length > 0) {
			const lastIdx = prev.anchors.length - 1;
			const anchor = prev.anchors[lastIdx];
			const updatedAnchors = [...prev.anchors];
			updatedAnchors[lastIdx] = {
				...anchor,
				handleOutDocX: docX,
				handleOutDocY: docY,
				handleInDocX: 2 * anchor.docX - docX,
				handleInDocY: 2 * anchor.docY - docY,
			};
			const next: PenDrawingState = {
				...prev,
				anchors: updatedAnchors,
				cursorDocX: docX,
				cursorDocY: docY,
			};
			penStateRef.current = next;
			setPenState(next);
		} else {
			const next: PenDrawingState = {
				...prev,
				cursorDocX: docX,
				cursorDocY: docY,
			};
			penStateRef.current = next;
			setPenState(next);
		}
	}, []);

	const penMouseUp = useCallback(() => {
		isDraggingHandleRef.current = false;
		const next = { ...penStateRef.current, isDraggingHandle: false };
		penStateRef.current = next;
		setPenState(next);
	}, []);

	const hitTestNodePath = useCallback(
		(docX: number, docY: number): string[] | null => {
			const visit = (
				nodes: Array<{
					node: PenNode;
					rect: { x: number; y: number; width: number; height: number };
					children: any[];
				}>,
				path: string[],
			): string[] | null => {
				for (let i = nodes.length - 1; i >= 0; i -= 1) {
					const ln = nodes[i];
					const { x, y, width: w, height: h } = ln.rect;
					const within =
						docX >= x && docX <= x + w && docY >= y && docY <= y + h;
					if (!within) continue;

					const nextPath = [...path, ln.node.id];
					const childHit = visit(ln.children as any[], nextPath);
					if (childHit) return childHit;
					return nextPath;
				}
				return null;
			};

			return visit(layoutNodes as any[], []);
		},
		[layoutNodes],
	);

	const onMouseDown = useCallback(
		(e: React.MouseEvent) => {
			if (activeToolRef.current === "pen") {
				penMouseDown(e);
				return;
			}

			// Pan interaction: middle click or spacebar held
			const isPanInteraction = e.button === 1 || isSpaceDownRef.current;
			if (isPanInteraction) {
				if (e.button === 1) setIsMiddleMouseDown(true);
				if (isSpaceDownRef.current) setIsSpaceDragging(true);
				cameraMouseDown?.(e);
				return;
			}

			const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
			const sx = e.clientX - rect.left;
			const sy = e.clientY - rect.top;
			const [docX, docY] = screenToDoc(sx, sy, cameraRef.current);
			const hitPath = hitTestNodePath(docX, docY);

			if (hitPath) {
				const hitId = hitPath[hitPath.length - 1];
				const hasModifier = e.shiftKey || e.metaKey || e.ctrlKey;

				if (!hasModifier && e.button === 0) {
					const currentlySelected = selectedNodePaths.some(
						(path) => path[path.length - 1] === hitId,
					);
					const rawPaths =
						currentlySelected && selectedNodePaths.length > 0
							? selectedNodePaths
							: [hitPath];
					const normalizedPaths = rawPaths.map((path) => {
						if (path.length <= 1) return path;
						const root = findNodeById(penDocument.children, path[0]);
						if (root?.type === "ref") {
							return [path[0]];
						}
						return path;
					});
					const uniquePaths = Array.from(
						new Map(
							normalizedPaths.map((path) => [path.join("/"), path]),
						).values(),
					);

					if (!currentlySelected) {
						updateSelection(() => [hitPath]);
					}

					dragRef.current = {
						lastDocX: docX,
						lastDocY: docY,
						paths: uniquePaths,
						didMove: false,
					};
					if (isInteractingRef) isInteractingRef.current = true;
					return;
				}

				updateSelection((prev) => {
					if (!hasModifier) return [hitPath];

					const exists = prev.some((path) => path[path.length - 1] === hitId);
					if (exists) {
						return prev.filter((path) => path[path.length - 1] !== hitId);
					}
					return [...prev, hitPath];
				});
				return;
			}

			if (e.button === 0 && !e.altKey) {
				marqueeRef.current = {
					startScreenX: sx,
					startScreenY: sy,
					currentScreenX: sx,
					currentScreenY: sy,
				};
				setMarqueeRect({ x: sx, y: sy, width: 0, height: 0 });
				updateSelection(() => []);
				setHoveredNodePath(null);
				return;
			}

			cameraMouseDown?.(e);
		},
		[
			cameraMouseDown,
			hitTestNodePath,
			isInteractingRef,
			penMouseDown,
			penDocument.children,
			selectedNodePaths,
			updateSelection,
		],
	);

	const onMouseMove = useCallback(
		(e: React.MouseEvent) => {
			if (activeToolRef.current === "pen") {
				penMouseMove(e);
				return;
			}

			const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
			const sx = e.clientX - rect.left;
			const sy = e.clientY - rect.top;
			const marquee = marqueeRef.current;
			if (marquee) {
				marquee.currentScreenX = sx;
				marquee.currentScreenY = sy;
				const x = Math.min(marquee.startScreenX, marquee.currentScreenX);
				const y = Math.min(marquee.startScreenY, marquee.currentScreenY);
				const width = Math.abs(marquee.currentScreenX - marquee.startScreenX);
				const height = Math.abs(marquee.currentScreenY - marquee.startScreenY);
				setMarqueeRect({ x, y, width, height });
				return;
			}

			const [docX, docY] = screenToDoc(sx, sy, cameraRef.current);

			const drag = dragRef.current;
			if (drag) {
				const dx = docX - drag.lastDocX;
				const dy = docY - drag.lastDocY;
				if (dx !== 0 || dy !== 0) {
					drag.didMove = true;
					drag.lastDocX = docX;
					drag.lastDocY = docY;

					const moveNode = (node: PenNode): PenNode => {
						const patch: Record<string, number> = {};
						const x = (node as Record<string, unknown>).x;
						const y = (node as Record<string, unknown>).y;
						const x1 = (node as Record<string, unknown>).x1;
						const y1 = (node as Record<string, unknown>).y1;
						const x2 = (node as Record<string, unknown>).x2;
						const y2 = (node as Record<string, unknown>).y2;
						if (typeof x === "number") patch.x = x + dx;
						if (typeof y === "number") patch.y = y + dy;
						if (typeof x1 === "number") patch.x1 = x1 + dx;
						if (typeof y1 === "number") patch.y1 = y1 + dy;
						if (typeof x2 === "number") patch.x2 = x2 + dx;
						if (typeof y2 === "number") patch.y2 = y2 + dy;
						if (Object.keys(patch).length === 0) return node;
						return { ...node, ...patch } as PenNode;
					};

					const updatePath = (nodes: PenNode[], path: string[]): PenNode[] => {
						if (path.length === 0) return nodes;
						const [head, ...rest] = path;
						return nodes.map((node) => {
							if (node.id !== head) return node;
							if (rest.length === 0) return moveNode(node);

							if (
								(node.type === "frame" || node.type === "group") &&
								Array.isArray(node.children)
							) {
								return {
									...node,
									children: updatePath(node.children as PenNode[], rest),
								} as PenNode;
							}

							if (node.type === "ref") {
								const descendantPath = rest.join("/");
								const descendants = {
									...(node.descendants ?? {}),
								} as Record<string, Record<string, unknown>>;
								const existing = descendants[descendantPath] ?? {};
								const patch: Record<string, unknown> = { ...existing };

								if (typeof patch.x === "number") patch.x = patch.x + dx;
								if (typeof patch.y === "number") patch.y = patch.y + dy;
								if (typeof patch.x1 === "number") patch.x1 = patch.x1 + dx;
								if (typeof patch.y1 === "number") patch.y1 = patch.y1 + dy;
								if (typeof patch.x2 === "number") patch.x2 = patch.x2 + dx;
								if (typeof patch.y2 === "number") patch.y2 = patch.y2 + dy;

								descendants[descendantPath] = patch;
								return { ...node, descendants };
							}

							return node;
						});
					};

					applyDocumentUpdate((doc) => ({
						...doc,
						children: drag.paths.reduce(
							(children, path) => updatePath(children, path),
							doc.children,
						),
					}));
				}
				return;
			}

			setHoveredNodePath(hitTestNodePath(docX, docY));
			cameraMouseMove?.(e);
		},
		[applyDocumentUpdate, cameraMouseMove, hitTestNodePath, penMouseMove],
	);

	const onMouseUp = useCallback(
		(e: React.MouseEvent) => {
			setIsMiddleMouseDown(false);
			setIsSpaceDragging(false);

			if (activeToolRef.current === "pen") {
				penMouseUp();
				return;
			}

			const drag = dragRef.current;
			if (drag) {
				dragRef.current = null;
				if (isInteractingRef) isInteractingRef.current = false;
				if (drag.didMove) onInteractionEnd?.();
				return;
			}

			const marquee = marqueeRef.current;
			if (marquee) {
				const [docStartX, docStartY] = screenToDoc(
					marquee.startScreenX,
					marquee.startScreenY,
					cameraRef.current,
				);
				const [docEndX, docEndY] = screenToDoc(
					marquee.currentScreenX,
					marquee.currentScreenY,
					cameraRef.current,
				);
				const left = Math.min(docStartX, docEndX);
				const top = Math.min(docStartY, docEndY);
				const right = Math.max(docStartX, docEndX);
				const bottom = Math.max(docStartY, docEndY);

				const selected = selectableLayoutNodes
					.filter(({ rect }) => {
						const rectRight = rect.x + rect.width;
						const rectBottom = rect.y + rect.height;
						return !(
							rectRight < left ||
							rect.x > right ||
							rectBottom < top ||
							rect.y > bottom
						);
					})
					.map(({ path }) => path);

				updateSelection(() => selected);
				marqueeRef.current = null;
				setMarqueeRect(null);
				return;
			}

			cameraMouseUp?.(e);
		},
		[
			cameraMouseUp,
			isInteractingRef,
			onInteractionEnd,
			penMouseUp,
			selectableLayoutNodes,
			updateSelection,
		],
	);

	const topLevelFrames = useMemo(
		() =>
			penDocument.children.filter(
				(n) => n.type === "frame" || n.type === "group",
			),
		[penDocument.children],
	);
	const totalFrames = topLevelFrames.length;
	const selectedNodes = useMemo(() => {
		return selectedNodePaths
			.map((path) => path[path.length - 1])
			.filter((id): id is string => Boolean(id))
			.map((id) => findNodeById(penDocument.children, id))
			.filter((node): node is PenNode => node !== null);
	}, [penDocument.children, selectedNodePaths]);

	const canvasHeight = height - (hideHeader ? 0 : 48);

	const handleZoomToFit = useCallback(() => {
		setCamera(computeZoomToFit(penDocument, width, canvasHeight));
	}, [penDocument, width, canvasHeight, setCamera]);

	useEffect(() => {
		if (!autoFit) return;
		setCamera(computeZoomToFit(penDocument, width, canvasHeight));
	}, [autoFit, canvasHeight, penDocument, setCamera, width]);

	const handleNodeTap = useCallback(
		(nodePath: string[]) => {
			updateSelection(() => [nodePath]);
		},
		[updateSelection],
	);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const tag = (e.target as HTMLElement)?.tagName;
			if (tag === "INPUT" || tag === "TEXTAREA") return;

			// Spacebar pan mode
			if (e.code === "Space") {
				e.preventDefault();
				if (!isSpaceDownRef.current) {
					isSpaceDownRef.current = true;
					setIsSpaceDown(true);
				}
				return;
			}

			// Pen tool shortcuts
			if (activeToolRef.current === "pen") {
				if (e.key === "Escape") {
					isDraggingHandleRef.current = false;
					penStateRef.current = EMPTY_PEN_STATE;
					setPenState(EMPTY_PEN_STATE);
					activeToolRef.current = "pointer";
					setActiveToolState("pointer");
					return;
				}
				if (e.key === "Enter") {
					commitPenPath(false);
					return;
				}
			}

			if (e.key === "p" || e.key === "P") {
				if (onAddNode) switchTool("pen");
				return;
			}
			if (e.key === "v" || e.key === "V") {
				switchTool("pointer");
				return;
			}

			if (
				(e.key === "Delete" || e.key === "Backspace") &&
				selectedNodePaths.length > 0
			) {
				e.preventDefault();
				const ids = new Set(
					selectedNodePaths
						.map((path) => path[path.length - 1])
						.filter((id): id is string => Boolean(id)),
				);
				applyDocumentUpdate((doc) => ({
					...doc,
					children: removeNodesById(doc.children, ids),
				}));
				updateSelection(() => []);
				return;
			}

			if (e.key === "f" || e.key === "F") handleZoomToFit();
			if (e.key === "[") setSelectedFrameIndex((i) => Math.max(0, i - 1));
			if (e.key === "]")
				setSelectedFrameIndex((i) => Math.min(totalFrames - 1, i + 1));
		};

		const handleKeyUp = (e: KeyboardEvent) => {
			if (e.code === "Space") {
				isSpaceDownRef.current = false;
				setIsSpaceDown(false);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("keyup", handleKeyUp);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("keyup", handleKeyUp);
		};
	}, [
		applyDocumentUpdate,
		commitPenPath,
		handleZoomToFit,
		onAddNode,
		selectedNodePaths,
		switchTool,
		totalFrames,
		updateSelection,
	]);

	return (
		<View
			style={[styles.container, { backgroundColor: c.panelBg }]}
			accessibilityLabel="Pen Canvas Panel"
			testID="pen-canvas-panel"
		>
			{!hideHeader && (
				<View style={[styles.header, { borderBottomColor: c.border }]}>
					<Text style={[styles.title, { color: c.text }]}>CANVAS</Text>
					<View style={styles.headerRight}>
						<View style={[styles.navControls, { backgroundColor: c.surface }]}>
							<Pressable
								onPress={() => setShowLayers((v) => !v)}
								style={[
									styles.navButton,
									showLayers && { backgroundColor: c.surfaceHover },
								]}
							>
								<Ionicons name="layers-outline" size={14} color={c.text} />
							</Pressable>
							<Pressable
								onPress={() => setShowInspector((v) => !v)}
								style={[
									styles.navButton,
									showInspector && { backgroundColor: c.surfaceHover },
								]}
							>
								<Ionicons name="options-outline" size={14} color={c.text} />
							</Pressable>
						</View>

						<View style={[styles.navControls, { backgroundColor: c.surface }]}>
							<Pressable onPress={handleZoomToFit} style={styles.navButton}>
								<Ionicons name="expand" size={14} color={c.text} />
							</Pressable>
							<Text style={[styles.counterText, { color: c.textSecondary }]}>
								{Math.round(camera.scale * 100)}%
							</Text>
						</View>

						{totalFrames > 0 && (
							<View
								style={[styles.navControls, { backgroundColor: c.surface }]}
							>
								<Pressable
									onPress={() =>
										setSelectedFrameIndex((i) => Math.max(0, i - 1))
									}
									disabled={selectedFrameIndex <= 0}
									style={({ pressed }) => [
										styles.navButton,
										{
											opacity: pressed || selectedFrameIndex <= 0 ? 0.3 : 1,
										},
									]}
								>
									<Ionicons name="chevron-back" size={14} color={c.text} />
								</Pressable>

								<Pressable
									onPress={() => setShowFrameList((v) => !v)}
									style={styles.frameSelector}
								>
									<Text
										style={[styles.counterText, { color: c.textSecondary }]}
									>
										{selectedFrameIndex + 1} / {totalFrames}
									</Text>
									<Ionicons
										name="chevron-down"
										size={12}
										color={c.textSecondary}
									/>
								</Pressable>

								<Pressable
									onPress={() =>
										setSelectedFrameIndex((i) =>
											Math.min(totalFrames - 1, i + 1),
										)
									}
									disabled={selectedFrameIndex >= totalFrames - 1}
									style={({ pressed }) => [
										styles.navButton,
										{
											opacity:
												pressed || selectedFrameIndex >= totalFrames - 1
													? 0.3
													: 1,
										},
									]}
								>
									<Ionicons name="chevron-forward" size={14} color={c.text} />
								</Pressable>
							</View>
						)}
					</View>
				</View>
			)}

			<View style={styles.content}>
				{isLoading ? (
					<Text style={[styles.message, { color: c.textSecondary }]}>
						Loading design...
					</Text>
				) : (
					<View style={styles.canvasArea}>
						{!hideLayers && showLayers && (
							<LayersPanel
								nodes={penDocument.children}
								selectedNodePath={primarySelectedNodePath}
								onSelectNode={handleNodeTap}
							/>
						)}
						<View
							style={[
								{ flex: 1, position: "relative" },
								{
									cursor:
										isMiddleMouseDown || isSpaceDragging
											? "grabbing"
											: isSpaceDown
												? "grab"
												: "default",
								} as object,
							]}
							{...({
								onWheel,
								onMouseDown,
								onMouseMove,
								onMouseUp,
								onMouseLeave: () => {
									setIsMiddleMouseDown(false);
									setIsSpaceDragging(false);
									marqueeRef.current = null;
									setMarqueeRect(null);
									setHoveredNodePath(null);
									if (activeToolRef.current === "pen") {
										setPenState((prev) => ({
											...prev,
											cursorDocX: null,
											cursorDocY: null,
										}));
									}
								},
							} as object)}
						>
							<Suspense fallback={null}>
								<PenRenderer
									document={penDocument}
									camera={camera}
									width={showLayers ? width - 180 : width}
									height={canvasHeight}
									selectedNodePath={primarySelectedNodePath ?? undefined}
									onNodeTap={handleNodeTap}
									penDrawingState={activeTool === "pen" ? penState : undefined}
								/>
							</Suspense>
							<MultiplayerOverlay
								cursors={agentCursors ?? []}
								document={penDocument}
								camera={camera}
							/>
							{!hidePalette && onAddNode && (
								<ToolPalette
									activeTool={activeTool}
									onSelectTool={switchTool}
								/>
							)}
							{!hideInspector && showInspector && selectedNodes.length > 0 && (
								<View
									style={[
										styles.inspectorPopover,
										{
											backgroundColor: c.panelBg,
											borderColor: c.border,
										},
									]}
								>
									<Text style={[styles.inspectorTitle, { color: c.text }]}>
										INSPECTOR
									</Text>
									<Text
										style={[styles.inspectorMeta, { color: c.textSecondary }]}
									>
										{selectedNodes.length} selected
									</Text>
									{selectedNodes.slice(0, 5).map((node) => (
										<View key={node.id} style={styles.inspectorRow}>
											<Text
												style={[styles.inspectorNodeName, { color: c.text }]}
											>
												{getNodeName(node)}
											</Text>
											<Text
												style={[
													styles.inspectorNodeType,
													{ color: c.textSecondary },
												]}
											>
												{node.type}
											</Text>
										</View>
									))}
									{onDocumentChange && selectedNodes.length > 0 && (
										<View style={styles.inspectorActions}>
											<Pressable
												style={styles.inspectorActionButton}
												onPress={() => applyNumericDelta("x", -1)}
											>
												<Text
													style={[
														styles.inspectorActionText,
														{ color: c.text },
													]}
												>
													X-
												</Text>
											</Pressable>
											<Pressable
												style={styles.inspectorActionButton}
												onPress={() => applyNumericDelta("x", 1)}
											>
												<Text
													style={[
														styles.inspectorActionText,
														{ color: c.text },
													]}
												>
													X+
												</Text>
											</Pressable>
											<Pressable
												style={styles.inspectorActionButton}
												onPress={() => applyNumericDelta("y", -1)}
											>
												<Text
													style={[
														styles.inspectorActionText,
														{ color: c.text },
													]}
												>
													Y-
												</Text>
											</Pressable>
											<Pressable
												style={styles.inspectorActionButton}
												onPress={() => applyNumericDelta("y", 1)}
											>
												<Text
													style={[
														styles.inspectorActionText,
														{ color: c.text },
													]}
												>
													Y+
												</Text>
											</Pressable>
											<Pressable
												style={styles.inspectorActionButton}
												onPress={() => applyNumericDelta("width", -1)}
											>
												<Text
													style={[
														styles.inspectorActionText,
														{ color: c.text },
													]}
												>
													W-
												</Text>
											</Pressable>
											<Pressable
												style={styles.inspectorActionButton}
												onPress={() => applyNumericDelta("width", 1)}
											>
												<Text
													style={[
														styles.inspectorActionText,
														{ color: c.text },
													]}
												>
													W+
												</Text>
											</Pressable>
											<Pressable
												style={styles.inspectorActionButton}
												onPress={() => applyNumericDelta("height", -1)}
											>
												<Text
													style={[
														styles.inspectorActionText,
														{ color: c.text },
													]}
												>
													H-
												</Text>
											</Pressable>
											<Pressable
												style={styles.inspectorActionButton}
												onPress={() => applyNumericDelta("height", 1)}
											>
												<Text
													style={[
														styles.inspectorActionText,
														{ color: c.text },
													]}
												>
													H+
												</Text>
											</Pressable>
										</View>
									)}
								</View>
							)}
							{marqueeRect && (
								<View
									pointerEvents="none"
									style={[
										styles.marqueeRect,
										{
											left: marqueeRect.x,
											top: marqueeRect.y,
											width: marqueeRect.width,
											height: marqueeRect.height,
											borderColor: c.accent,
										},
									]}
								/>
							)}
						</View>
					</View>
				)}

				{showFrameList && totalFrames > 0 && (
					<View
						style={[
							styles.frameListDropdown,
							{
								backgroundColor: c.panelBg,
								borderColor: c.border,
							},
						]}
					>
						{topLevelFrames.map((f, i) => (
							<Pressable
								key={f.id}
								style={[
									styles.frameListItem,
									i === selectedFrameIndex && {
										backgroundColor: c.surfaceHover,
									},
								]}
								onPress={() => {
									setSelectedFrameIndex(i);
									setShowFrameList(false);
								}}
							>
								<Text
									style={[
										styles.frameListText,
										{
											color:
												i === selectedFrameIndex ? c.text : c.textSecondary,
										},
									]}
									numberOfLines={1}
								>
									{i + 1}. {getNodeName(f)}
								</Text>
							</Pressable>
						))}
					</View>
				)}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		padding: 12,
		borderBottomWidth: 1,
		height: 48,
		zIndex: 10,
	},
	headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
	title: { fontSize: 12, fontWeight: "600", letterSpacing: 0.5 },
	navControls: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		borderRadius: 6,
		padding: 2,
		borderWidth: 1,
		borderColor: "rgba(0,0,0,0.05)",
	},
	navButton: { padding: 4, borderRadius: 4 },
	frameSelector: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		paddingHorizontal: 4,
		paddingVertical: 2,
		borderRadius: 4,
	},
	counterText: {
		fontSize: 11,
		fontVariant: ["tabular-nums"],
		minWidth: 32,
		textAlign: "center",
		fontWeight: "500",
	},
	content: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		position: "relative",
	},
	canvasArea: {
		flex: 1,
		width: "100%",
		flexDirection: "row",
	},
	layersPanel: {
		width: 180,
		borderRightWidth: 1,
	},
	layersPanelContent: {
		paddingVertical: 4,
	},
	layerRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 8,
		paddingVertical: 4,
		gap: 4,
	},
	layerRowChild: {
		paddingLeft: 24,
	},
	layerChevron: {
		width: 14,
		alignItems: "center",
	},
	layerTypeIcon: {
		marginRight: 2,
	},
	layerName: {
		fontSize: 11,
		fontWeight: "500",
		flex: 1,
	},
	inspectorPopover: {
		position: "absolute",
		top: 12,
		right: 12,
		width: 240,
		maxHeight: 300,
		borderWidth: 1,
		borderRadius: 10,
		padding: 10,
		gap: 6,
		zIndex: 70,
	},
	inspectorTitle: {
		fontSize: 11,
		fontWeight: "700",
		letterSpacing: 0.4,
	},
	inspectorMeta: {
		fontSize: 10,
	},
	inspectorRow: {
		paddingVertical: 5,
		borderBottomWidth: 1,
		borderBottomColor: "rgba(255,255,255,0.08)",
	},
	inspectorNodeName: {
		fontSize: 12,
		fontWeight: "600",
	},
	inspectorNodeType: {
		fontSize: 10,
	},
	inspectorActions: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 6,
		paddingTop: 6,
	},
	inspectorActionButton: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.15)",
		borderRadius: 6,
	},
	inspectorActionText: {
		fontSize: 10,
		fontWeight: "600",
	},
	marqueeRect: {
		position: "absolute",
		borderWidth: 1,
		backgroundColor: "rgba(79, 134, 255, 0.12)",
		zIndex: 60,
	},
	message: { fontSize: 14, fontWeight: "500", textAlign: "center" },
	frameListDropdown: {
		position: "absolute",
		top: 8,
		right: 16,
		width: 200,
		maxHeight: 300,
		borderWidth: 1,
		borderRadius: 8,
		padding: 4,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.1,
		shadowRadius: 12,
		elevation: 5,
		zIndex: 100,
	},
	frameListItem: { padding: 8, borderRadius: 4 },
	frameListText: { fontSize: 12, fontWeight: "500" },
});
