import { Ionicons } from "@expo/vector-icons";
import type { PenDocument, PenNode } from "@slopcade/shared/types/pen";
import { useTheme } from "@slopcade/theme";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { PenRenderer } from "../pen/render/PenRenderer";
import { estimateTextSize } from "../pen/text-measure";
import type { PenDrawingState } from "../tools/penToolState";
import {
	EMPTY_PEN_STATE,
	buildPathNode,
	screenToDoc,
} from "../tools/penToolState";
import { resolveTreeVariables } from "../pen/variables";

export interface PenCanvasPanelProps {
	document: PenDocument;
	isLoading?: boolean;
	onAddNode?: (node: PenNode) => void;
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
	const newScale = Math.max(
		MIN_SCALE,
		Math.min(MAX_SCALE, scaleX, scaleY, 2),
	);
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

type NodeTypeIconName =
	| "albums-outline"
	| "layers-outline"
	| "text-outline"
	| "square-outline"
	| "ellipse-outline"
	| "star-outline"
	| "remove-outline"
	| "shapes-outline"
	| "git-network-outline"
	| "document-text-outline"
	| "apps-outline";

function getTypeIcon(type: PenNode["type"]): NodeTypeIconName {
	switch (type) {
		case "frame": return "albums-outline";
		case "group": return "layers-outline";
		case "text": return "text-outline";
		case "rectangle": return "square-outline";
		case "ellipse": return "ellipse-outline";
		case "icon_font": return "star-outline";
		case "line": return "remove-outline";
		case "polygon": return "shapes-outline";
		case "path": return "git-network-outline";
		case "note": return "document-text-outline";
		default: return "apps-outline";
	}
}

interface LayersPanelProps {
	nodes: PenNode[];
	selectedNodePath: string[] | null;
	onSelectNode: (path: string[]) => void;
}

function LayersPanel({ nodes, selectedNodePath, onSelectNode }: LayersPanelProps) {
	const { editorColors: c } = useTheme();
	const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

	const selectedId = selectedNodePath?.[0] ?? null;

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

						{hasChildren && isExpanded && children.map((child) => {
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
						Click to add points · Drag for curves · Double-click to finish · Esc to cancel
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
	const [selectedNodePath, setSelectedNodePath] = useState<string[] | null>(null);

	// ── Pen tool state ────────────────────────────────────────────────────────
	const [activeTool, setActiveToolState] = useState<"pointer" | "pen">("pointer");
	const [penState, setPenState] = useState<PenDrawingState>(EMPTY_PEN_STATE);

	// Refs so event handlers never go stale
	const activeToolRef = useRef<"pointer" | "pen">("pointer");
	const penStateRef = useRef<PenDrawingState>(EMPTY_PEN_STATE);
	const cameraRef = useRef<DesignCamera>(camera);
	const isDraggingHandleRef = useRef(false);
	cameraRef.current = camera;
	penStateRef.current = penState;

	const switchTool = useCallback(
		(tool: "pointer" | "pen") => {
			activeToolRef.current = tool;
			setActiveToolState(tool);
			if (tool === "pointer") {
				isDraggingHandleRef.current = false;
				penStateRef.current = EMPTY_PEN_STATE;
				setPenState(EMPTY_PEN_STATE);
			}
		},
		[],
	);

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
			const next: PenDrawingState = { ...prev, cursorDocX: docX, cursorDocY: docY };
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

	const onMouseDown = useCallback(
		(e: React.MouseEvent) => {
			if (activeToolRef.current === "pen") penMouseDown(e);
			else cameraMouseDown?.(e);
		},
		[penMouseDown, cameraMouseDown],
	);

	const onMouseMove = useCallback(
		(e: React.MouseEvent) => {
			if (activeToolRef.current === "pen") penMouseMove(e);
			else cameraMouseMove?.(e);
		},
		[penMouseMove, cameraMouseMove],
	);

	const onMouseUp = useCallback(
		(e: React.MouseEvent) => {
			if (activeToolRef.current === "pen") penMouseUp();
			else cameraMouseUp?.(e);
		},
		[penMouseUp, cameraMouseUp],
	);

	const topLevelFrames = useMemo(
		() =>
			penDocument.children.filter(
				(n) => n.type === "frame" || n.type === "group",
			),
		[penDocument.children],
	);
	const totalFrames = topLevelFrames.length;

	const canvasHeight = height - 48;

	const handleZoomToFit = useCallback(() => {
		setCamera(computeZoomToFit(penDocument, width, canvasHeight));
	}, [penDocument, width, canvasHeight, setCamera]);

	const handleNodeTap = useCallback((nodePath: string[]) => {
		setSelectedNodePath(nodePath);
	}, []);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const tag = (e.target as HTMLElement)?.tagName;
			if (tag === "INPUT" || tag === "TEXTAREA") return;

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

			if (e.key === "f" || e.key === "F") handleZoomToFit();
			if (e.key === "[")
				setSelectedFrameIndex((i) => Math.max(0, i - 1));
			if (e.key === "]")
				setSelectedFrameIndex((i) => Math.min(totalFrames - 1, i + 1));
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [handleZoomToFit, totalFrames, commitPenPath, switchTool, onAddNode]);

	return (
		<View
			style={[styles.container, { backgroundColor: c.panelBg }]}
			accessibilityLabel="Pen Canvas Panel"
			testID="pen-canvas-panel"
		>
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
										opacity:
											pressed || selectedFrameIndex <= 0 ? 0.3 : 1,
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
									style={[
										styles.counterText,
										{ color: c.textSecondary },
									]}
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
											pressed ||
											selectedFrameIndex >= totalFrames - 1
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

			<View style={styles.content}>
				{isLoading ? (
					<Text
						style={[styles.message, { color: c.textSecondary }]}
					>
						Loading design...
					</Text>
				) : (
					<View style={styles.canvasArea}>
						{showLayers && (
							<LayersPanel
								nodes={penDocument.children}
								selectedNodePath={selectedNodePath}
								onSelectNode={setSelectedNodePath}
							/>
						)}
						<View
							style={{ flex: 1, position: "relative" }}
							{...({
								onWheel,
								onMouseDown,
								onMouseMove,
								onMouseUp,
								onMouseLeave: () => {
									if (activeToolRef.current === "pen") {
										setPenState((prev) => ({ ...prev, cursorDocX: null, cursorDocY: null }));
									}
								},
							} as object)}
						>
							<PenRenderer
								document={penDocument}
								camera={camera}
								width={showLayers ? width - 180 : width}
								height={canvasHeight}
								selectedNodePath={selectedNodePath ?? undefined}
								onNodeTap={handleNodeTap}
								penDrawingState={activeTool === "pen" ? penState : undefined}
							/>
							{onAddNode && (
								<ToolPalette activeTool={activeTool} onSelectTool={switchTool} />
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
												i === selectedFrameIndex
													? c.text
													: c.textSecondary,
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
