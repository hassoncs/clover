import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@slopcade/theme";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
	ActivityIndicator,
	Pressable,
	StyleSheet,
	Text,
	useWindowDimensions,
	View,
} from "react-native";
import {
	GestureDetector,
	GestureHandlerRootView,
} from "react-native-gesture-handler";
import { useDesignCamera } from "../camera/useDesignCamera";
import type { DesignCanvasHost } from "../host/types";
import { useDesignInteractionsNative } from "../interactions/useDesignInteractionsNative";

const DesignCanvasRenderer = lazy(() => import("../core/DesignCanvasRenderer"));

export interface DesignCanvasPanelProps {
	host: DesignCanvasHost;
}

export function DesignCanvasPanel({ host }: DesignCanvasPanelProps) {
	const { editorColors: c } = useTheme();
	const { width, height } = useWindowDimensions();
	const {
		document: designDocument,
		isLoadingDocument: isLoadingDesign,
		saveDocument: saveDesignDocument,
		selectedFrameId: selectedDesignFrameId,
		selectedElementId: selectedDesignElementId,
		selectedElementIds,
		selectFrame: selectDesignFrame,
		selectElement: selectDesignElement,
		clearSelection: clearDesignSelection,
		setDesignMode,
		designPhase,
		setDesignPhase,
	} = host;

	const {
		camera,
		zoomToFit,
		handlePanStart,
		handlePanUpdate,
		handlePinchStart,
		handlePinchUpdate,
	} = useDesignCamera();

	const [localSelectedElementIds, setLocalSelectedElementIds] =
		useState<string[]>(selectedElementIds);
	const [showFrameList, setShowFrameList] = useState(false);

	useEffect(() => {
		setLocalSelectedElementIds(selectedElementIds);
	}, [selectedElementIds]);

	const frames = designDocument?.frames || [];
	const totalFrames = frames.length;
	const selectedFrameIndex = frames.findIndex(
		(f) => f.id === selectedDesignFrameId,
	);
	const selectedFrame = frames[selectedFrameIndex];
	const selectedElement = selectedFrame?.elements.find(
		(e) => e.id === selectedDesignElementId,
	);

	const handleZoomToFit = () => {
		if (frames.length > 0) {
			zoomToFit(frames, width, height - 48);
		}
	};

	const goPrevFrame = () => {
		if (selectedFrameIndex > 0) {
			selectDesignFrame(frames[selectedFrameIndex - 1].id);
		}
	};

	const goNextFrame = () => {
		if (selectedFrameIndex >= 0 && selectedFrameIndex < totalFrames - 1) {
			selectDesignFrame(frames[selectedFrameIndex + 1].id);
		} else if (selectedFrameIndex === -1 && totalFrames > 0) {
			selectDesignFrame(frames[0].id);
		}
	};

	const { gesture, snapLines, liveDocument } = useDesignInteractionsNative({
		document: designDocument ?? null,
		camera,
		selectedFrameId: selectedDesignFrameId,
		selectedElementId: selectedDesignElementId,
		selectedElementIds: localSelectedElementIds,
		setSelectedElementIds: setLocalSelectedElementIds,
		saveDesignDocument,
		selectDesignElement,
		selectDesignFrame,
		clearDesignSelection,
		setDesignMode,
		cameraHandlers: {
			handlePanStart,
			handlePanUpdate,
			handlePinchStart,
			handlePinchUpdate,
		},
	});

	const breadcrumbText = useMemo(() => {
		if (!selectedFrame) return null;
		if (selectedElement) {
			return `${selectedFrame.title} > ${selectedElement.type} (${selectedElement.id.substring(0, 4)})`;
		}
		return selectedFrame.title;
	}, [selectedFrame, selectedElement]);

	useEffect(() => {
		if (designDocument && designPhase === "idle") {
			setDesignPhase("designing");
		}
	}, [designDocument, designPhase, setDesignPhase]);

	return (
		<View
			style={[styles.container, { backgroundColor: c.panelBg }]}
			accessibilityLabel="Design Canvas Panel"
			testID="editor-design-canvas-panel"
		>
			<View style={[styles.header, { borderBottomColor: c.border }]}>
				<View style={styles.headerLeft}>
					<Text style={[styles.title, { color: c.text }]}>DESIGN CANVAS</Text>
					{breadcrumbText && (
						<>
							<Ionicons
								name="chevron-forward"
								size={12}
								color={c.textSecondary}
								style={{ marginHorizontal: 4 }}
							/>
							<Text
								style={[styles.breadcrumb, { color: c.textSecondary }]}
								numberOfLines={1}
							>
								{breadcrumbText}
							</Text>
						</>
					)}
				</View>

				<View style={styles.headerRight}>
					{designPhase !== "idle" && (
						<View
							style={[
								styles.phaseBadge,
								{ backgroundColor: c.surfaceHover, borderColor: c.border },
							]}
						>
							<Text style={[styles.phaseText, { color: c.textSecondary }]}>
								{designPhase.toUpperCase()}
							</Text>
						</View>
					)}

					{designPhase === "designing" && (
						<Pressable
							style={[styles.actionButton, { backgroundColor: "#3b82f6" }]}
							onPress={() => setDesignPhase("approved")}
						>
							<Text style={[styles.actionButtonText, { color: "#fff" }]}>
								✓ Approve Design
							</Text>
						</Pressable>
					)}

					{designPhase === "approved" && (
						<Pressable
							style={[styles.actionButton, { backgroundColor: "#10b981" }]}
							onPress={() => setDesignPhase("implementing")}
						>
							<Text style={[styles.actionButtonText, { color: "#fff" }]}>
								🚀 Start Implementation
							</Text>
						</Pressable>
					)}

					{designPhase === "implementing" && (
						<View
							style={[
								styles.actionButton,
								{ backgroundColor: c.surfaceHover, opacity: 0.7 },
							]}
						>
							<Text
								style={[styles.actionButtonText, { color: c.textSecondary }]}
							>
								Implementing...
							</Text>
						</View>
					)}

					<View style={[styles.navControls, { backgroundColor: c.surface }]}>
						<Pressable onPress={handleZoomToFit} style={styles.navButton}>
							<Ionicons name="expand" size={14} color={c.text} />
						</Pressable>
						<Text style={[styles.counterText, { color: c.textSecondary }]}>
							{Math.round(camera.scale * 100)}%
						</Text>
					</View>

					{totalFrames > 0 && (
						<View style={[styles.navControls, { backgroundColor: c.surface }]}>
							<Pressable
								onPress={goPrevFrame}
								disabled={selectedFrameIndex <= 0}
								style={({ pressed }) => [
									styles.navButton,
									{ opacity: pressed || selectedFrameIndex <= 0 ? 0.3 : 1 },
								]}
							>
								<Ionicons name="chevron-back" size={14} color={c.text} />
							</Pressable>

							<Pressable
								onPress={() => setShowFrameList(!showFrameList)}
								style={styles.frameSelector}
							>
								<Text style={[styles.counterText, { color: c.textSecondary }]}>
									{selectedFrameIndex >= 0
										? `${selectedFrameIndex + 1} / ${totalFrames}`
										: `0 / ${totalFrames}`}
								</Text>
								<Ionicons
									name="chevron-down"
									size={12}
									color={c.textSecondary}
								/>
							</Pressable>

							<Pressable
								onPress={goNextFrame}
								disabled={
									selectedFrameIndex === -1 ||
									selectedFrameIndex >= totalFrames - 1
								}
								style={({ pressed }) => [
									styles.navButton,
									{
										opacity:
											pressed ||
											selectedFrameIndex === -1 ||
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
				{isLoadingDesign ? (
					<Text style={[styles.message, { color: c.textSecondary }]}>
						Loading design...
					</Text>
				) : designDocument ? (
					<GestureHandlerRootView style={styles.gestureRoot}>
						<GestureDetector gesture={gesture}>
							<View style={{ flex: 1, width: "100%" }}>
								<Suspense
									fallback={
										<View style={styles.rendererFallback}>
											<ActivityIndicator color="#818cf8" />
										</View>
									}
								>
									<DesignCanvasRenderer
										document={liveDocument || designDocument}
										camera={camera}
										selectedFrameId={selectedDesignFrameId}
										selectedElementId={selectedDesignElementId}
										selectedElementIds={localSelectedElementIds}
										width={width}
										height={height - 48}
										snapLines={snapLines}
										showGrid={false}
									/>
								</Suspense>
							</View>
						</GestureDetector>
					</GestureHandlerRootView>
				) : (
					<Text style={[styles.message, { color: c.textSecondary }]}>
						No design document found.
					</Text>
				)}

				{showFrameList && totalFrames > 0 && (
					<View
						style={[
							styles.frameListDropdown,
							{ backgroundColor: c.panelBg, borderColor: c.border },
						]}
					>
						{frames.map((f, i) => (
							<Pressable
								key={f.id}
								style={[
									styles.frameListItem,
									f.id === selectedDesignFrameId && {
										backgroundColor: c.surfaceHover,
									},
								]}
								onPress={() => {
									selectDesignFrame(f.id);
									setShowFrameList(false);
								}}
							>
								<Text
									style={[
										styles.frameListText,
										{
											color:
												f.id === selectedDesignFrameId
													? c.text
													: c.textSecondary,
										},
									]}
									numberOfLines={1}
								>
									{i + 1}. {f.title}
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
	headerLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
	headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
	title: { fontSize: 12, fontWeight: "600", letterSpacing: 0.5 },
	breadcrumb: { fontSize: 12, fontWeight: "500", flexShrink: 1 },
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
	gestureRoot: { flex: 1, width: "100%" },
	rendererFallback: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#050310",
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
	phaseBadge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 4,
		borderWidth: 1,
	},
	phaseText: { fontSize: 10, fontWeight: "600", letterSpacing: 0.5 },
	actionButton: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 6,
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	actionButtonText: { fontSize: 12, fontWeight: "600" },
});
