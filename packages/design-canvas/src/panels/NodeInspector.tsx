import { Ionicons } from "@expo/vector-icons";
import type {
	PenDocument,
	PenFill,
	PenNode,
	PenRef,
	PenStroke,
} from "@slopcade/shared/types/pen";
import { useTheme } from "@slopcade/theme";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { getNodeChildren, updateNodesById } from "../pen/nodeUtils";
import type { FieldValue } from "./inspectorHelpers";
import {
	computeSharedNumericField,
	computeSharedStringField,
	getPrimaryFillColor,
	getPrimaryStrokeColor,
	getPrimaryStrokeThickness,
	nodeHasFill,
	nodeHasStroke,
	nodeHasWidthHeight,
} from "./inspectorHelpers";

// ── Section divider ────────────────────────────────────────────────────────────

function SectionDivider({ label, color }: { label: string; color: string }) {
	return (
		<View style={dividerStyles.row}>
			<Text style={[dividerStyles.label, { color }]}>{label}</Text>
			<View style={dividerStyles.line} />
		</View>
	);
}

const dividerStyles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		marginTop: 6,
		marginBottom: 2,
	},
	label: {
		fontSize: 9,
		fontWeight: "700",
		letterSpacing: 0.5,
		opacity: 0.65,
	},
	line: {
		flex: 1,
		height: 1,
		backgroundColor: "rgba(255,255,255,0.08)",
	},
});

// ── Numeric field input ────────────────────────────────────────────────────────

interface InspectorNumericInputProps {
	label: string;
	fieldValue: FieldValue<number>;
	onCommit: (v: number) => void;
	/** Multiplier for display (e.g. 100 for opacity shown as %). Internal value = display / scale. */
	scale?: number;
	suffix?: string;
	disabled?: boolean;
}

function InspectorNumericInput({
	label,
	fieldValue,
	onCommit,
	scale = 1,
	suffix,
	disabled = false,
}: InspectorNumericInputProps) {
	const { editorColors: c } = useTheme();
	const isFocused = useRef(false);

	const toDisplayStr = (v: number) => {
		const scaled = v * scale;
		return Number.isInteger(scaled) ? String(scaled) : scaled.toFixed(1);
	};

	const [text, setText] = useState(
		fieldValue.kind === "single" ? toDisplayStr(fieldValue.value) : "",
	);

	useEffect(() => {
		if (!isFocused.current) {
			setText(
				fieldValue.kind === "single" ? toDisplayStr(fieldValue.value) : "",
			);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [fieldValue]);

	const commit = useCallback(() => {
		const n = parseFloat(text.replace(",", "."));
		if (!isNaN(n)) onCommit(n / scale);
	}, [text, onCommit, scale]);

	return (
		<View style={numericStyles.container}>
			<Text
				style={[numericStyles.label, { color: c.textSecondary }]}
				numberOfLines={1}
			>
				{label}
			</Text>
			<View
				style={[
					numericStyles.inputRow,
					{ borderColor: "rgba(255,255,255,0.10)" },
				]}
			>
				<TextInput
					style={[
						numericStyles.input,
						{ color: disabled ? c.textSecondary : c.text },
					]}
					value={text}
					onChangeText={setText}
					onFocus={() => {
						isFocused.current = true;
					}}
					onBlur={() => {
						isFocused.current = false;
						commit();
					}}
					onSubmitEditing={commit}
					placeholder={fieldValue.kind === "mixed" ? "mixed" : "—"}
					placeholderTextColor={c.textSecondary}
					editable={!disabled}
					selectTextOnFocus
					keyboardType="numbers-and-punctuation"
					{...({ outlineWidth: 0 } as object)}
				/>
				{suffix ? (
					<Text style={[numericStyles.suffix, { color: c.textSecondary }]}>
						{suffix}
					</Text>
				) : null}
			</View>
		</View>
	);
}

const numericStyles = StyleSheet.create({
	container: { flex: 1, gap: 2 },
	label: { fontSize: 9, fontWeight: "500", letterSpacing: 0.3 },
	inputRow: {
		flexDirection: "row",
		alignItems: "center",
		borderWidth: 1,
		borderRadius: 4,
		backgroundColor: "rgba(255,255,255,0.04)",
		paddingHorizontal: 5,
		height: 22,
	},
	input: {
		flex: 1,
		fontSize: 11,
		fontVariant: ["tabular-nums"],
	},
	suffix: { fontSize: 9, fontWeight: "500", marginLeft: 1, flexShrink: 0 },
});

// ── Color field input ──────────────────────────────────────────────────────────

interface InspectorColorInputProps {
	label?: string;
	fieldValue: FieldValue<string>;
	onCommit: (v: string) => void;
	disabled?: boolean;
}

function InspectorColorInput({
	label,
	fieldValue,
	onCommit,
	disabled = false,
}: InspectorColorInputProps) {
	const { editorColors: c } = useTheme();
	const isFocused = useRef(false);
	const [text, setText] = useState(
		fieldValue.kind === "single" ? fieldValue.value : "",
	);

	useEffect(() => {
		if (!isFocused.current) {
			setText(fieldValue.kind === "single" ? fieldValue.value : "");
		}
	}, [fieldValue]);

	const commit = useCallback(() => {
		if (text.trim()) onCommit(text.trim());
	}, [text, onCommit]);

	const swatchBg =
		fieldValue.kind === "single" ? fieldValue.value : "transparent";

	return (
		<View style={colorStyles.container}>
			{label ? (
				<Text style={[colorStyles.label, { color: c.textSecondary }]}>
					{label}
				</Text>
			) : null}
			<View
				style={[
					colorStyles.inputRow,
					{ borderColor: "rgba(255,255,255,0.10)" },
				]}
			>
				<View
					style={[
						colorStyles.swatch,
						{
							backgroundColor: swatchBg,
							borderColor: "rgba(255,255,255,0.18)",
						},
					]}
				/>
				<TextInput
					style={[
						colorStyles.input,
						{ color: disabled ? c.textSecondary : c.text },
					]}
					value={text}
					onChangeText={setText}
					onFocus={() => {
						isFocused.current = true;
					}}
					onBlur={() => {
						isFocused.current = false;
						commit();
					}}
					onSubmitEditing={commit}
					placeholder={fieldValue.kind === "mixed" ? "mixed" : "—"}
					placeholderTextColor={c.textSecondary}
					editable={!disabled}
					selectTextOnFocus
					autoCapitalize="none"
					autoCorrect={false}
					{...({ outlineWidth: 0 } as object)}
				/>
			</View>
		</View>
	);
}

const colorStyles = StyleSheet.create({
	container: { flex: 1, gap: 2 },
	label: { fontSize: 9, fontWeight: "500", letterSpacing: 0.3 },
	inputRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
		borderWidth: 1,
		borderRadius: 4,
		backgroundColor: "rgba(255,255,255,0.04)",
		paddingHorizontal: 5,
		height: 22,
	},
	swatch: {
		width: 12,
		height: 12,
		borderRadius: 2,
		borderWidth: 1,
		flexShrink: 0,
	},
	input: { flex: 1, fontSize: 11 },
});

// ── Node Inspector ─────────────────────────────────────────────────────────────

export interface NodeInspectorProps {
	selectedNodes: PenNode[];
	selectedNodePaths: string[][];
	document: PenDocument;
	applyDocumentUpdate: (updater: (doc: PenDocument) => PenDocument) => void;
	onDocumentChange: ((doc: PenDocument) => void) | undefined;
}

// ── Local helpers ──────────────────────────────────────────────────────────────

function getNodeName(node: PenNode): string {
	const n = node as { name?: string };
	return typeof n.name === "string" ? n.name : node.id;
}

function isNodeHidden(node: PenNode): boolean {
	return (node as { visible?: boolean }).visible === false;
}

function isNodeDisabled(node: PenNode): boolean {
	return (node as { enabled?: boolean }).enabled === false;
}

function isNodeReusable(node: PenNode): boolean {
	return (node as { reusable?: boolean }).reusable === true;
}

const TYPE_ICONS: Partial<Record<PenNode["type"], string>> = {
	frame: "albums-outline",
	group: "layers-outline",
	text: "text-outline",
	rectangle: "square-outline",
	ellipse: "ellipse-outline",
	effect: "flash-outline",
	icon_font: "star-outline",
	line: "remove-outline",
	polygon: "shapes-outline",
	path: "git-network-outline",
	note: "document-text-outline",
	ref: "link-outline",
	image: "image-outline",
	connection: "git-merge-outline",
};

function getTypeIcon(type: PenNode["type"]): string {
	return TYPE_ICONS[type] ?? "apps-outline";
}

// ── Main component ─────────────────────────────────────────────────────────────

export function NodeInspector({
	selectedNodes,
	selectedNodePaths,
	document: penDocument,
	applyDocumentUpdate,
	onDocumentChange,
}: NodeInspectorProps) {
	const { editorColors: c } = useTheme();
	const editable = Boolean(onDocumentChange);

	const selectionIds = useMemo(
		() =>
			new Set(
				selectedNodePaths
					.map((p) => p[p.length - 1])
					.filter((id): id is string => Boolean(id)),
			),
		[selectedNodePaths],
	);

	// ── Field computations ───────────────────────────────────────────────────

	const fieldX = computeSharedNumericField(
		selectedNodes,
		(n) => (n as { x?: number }).x,
	);
	const fieldY = computeSharedNumericField(
		selectedNodes,
		(n) => (n as { y?: number }).y,
	);
	const fieldW = computeSharedNumericField(
		selectedNodes,
		(n) => {
			const w = (n as { width?: unknown }).width;
			return typeof w === "number" ? w : undefined;
		},
		(n) => nodeHasWidthHeight(n.type),
	);
	const fieldH = computeSharedNumericField(
		selectedNodes,
		(n) => {
			const h = (n as { height?: unknown }).height;
			return typeof h === "number" ? h : undefined;
		},
		(n) => nodeHasWidthHeight(n.type),
	);
	const fieldOpacity = computeSharedNumericField(
		selectedNodes,
		(n) => (n as { opacity?: number }).opacity,
	);

	const allHaveFill =
		selectedNodes.length > 0 && selectedNodes.every((n) => nodeHasFill(n.type));
	const allHaveStroke =
		selectedNodes.length > 0 &&
		selectedNodes.every((n) => nodeHasStroke(n.type));

	const absentStr: FieldValue<string> = { kind: "absent" };
	const absentNum: FieldValue<number> = { kind: "absent" };

	const fieldFillColor = allHaveFill
		? computeSharedStringField(selectedNodes, (n) =>
				getPrimaryFillColor((n as { fill?: PenFill }).fill),
			)
		: absentStr;

	const fieldStrokeColor = allHaveStroke
		? computeSharedStringField(selectedNodes, (n) =>
				getPrimaryStrokeColor((n as { stroke?: PenStroke }).stroke),
			)
		: absentStr;

	const fieldStrokeThickness = allHaveStroke
		? computeSharedNumericField(selectedNodes, (n) => {
				const t = getPrimaryStrokeThickness((n as { stroke?: PenStroke }).stroke);
				return t ?? undefined;
			})
		: absentNum;

	// ── Single ref node info ──────────────────────────────────────────────────

	const singleNode = selectedNodes.length === 1 ? selectedNodes[0] : null;
	const singleRefNode: PenRef | null =
		singleNode?.type === "ref" ? (singleNode as PenRef) : null;

	const refComponent = useMemo((): PenNode | null => {
		if (!singleRefNode) return null;
		const search = (nodes: PenNode[]): PenNode | null => {
			for (const node of nodes) {
				if (node.id === singleRefNode.ref && isNodeReusable(node)) return node;
				const found = search(getNodeChildren(node));
				if (found) return found;
			}
			return null;
		};
		return search(penDocument.children);
	}, [singleRefNode, penDocument.children]);

	// ── Update helpers ────────────────────────────────────────────────────────

	const updateSimpleField = useCallback(
		(key: string, value: unknown, filter?: (n: PenNode) => boolean) => {
			applyDocumentUpdate((doc) => ({
				...doc,
				children: updateNodesById(doc.children, selectionIds, (node) => {
					if (filter && !filter(node)) return node;
					return { ...node, [key]: value } as PenNode;
				}),
			}));
		},
		[applyDocumentUpdate, selectionIds],
	);

	const updateFillColor = useCallback(
		(color: string) => {
			applyDocumentUpdate((doc) => ({
				...doc,
				children: updateNodesById(doc.children, selectionIds, (node) => {
					if (!nodeHasFill(node.type)) return node;
					return { ...node, fill: color } as PenNode;
				}),
			}));
		},
		[applyDocumentUpdate, selectionIds],
	);

	const updateStrokeColor = useCallback(
		(color: string) => {
			applyDocumentUpdate((doc) => ({
				...doc,
				children: updateNodesById(doc.children, selectionIds, (node) => {
					if (!nodeHasStroke(node.type)) return node;
					const existing = (node as { stroke?: PenStroke }).stroke ?? {};
					return { ...node, stroke: { ...existing, fill: color } } as PenNode;
				}),
			}));
		},
		[applyDocumentUpdate, selectionIds],
	);

	const updateStrokeThickness = useCallback(
		(thickness: number) => {
			applyDocumentUpdate((doc) => ({
				...doc,
				children: updateNodesById(doc.children, selectionIds, (node) => {
					if (!nodeHasStroke(node.type)) return node;
					const existing = (node as { stroke?: PenStroke }).stroke ?? {};
					return { ...node, stroke: { ...existing, thickness } } as PenNode;
				}),
			}));
		},
		[applyDocumentUpdate, selectionIds],
	);

	// ── Display flags ─────────────────────────────────────────────────────────

	const showTransform =
		fieldX.kind !== "absent" ||
		fieldY.kind !== "absent" ||
		fieldW.kind !== "absent" ||
		fieldH.kind !== "absent";
	const showWH = fieldW.kind !== "absent" || fieldH.kind !== "absent";
	const showFill = fieldFillColor.kind !== "absent";
	const showStroke =
		fieldStrokeColor.kind !== "absent" ||
		fieldStrokeThickness.kind !== "absent";
	const showRef = Boolean(singleRefNode);
	const descendantCount = singleRefNode?.descendants
		? Object.keys(singleRefNode.descendants).length
		: 0;

	// ── Render ────────────────────────────────────────────────────────────────

	return (
		<ScrollView
			style={styles.scroll}
			contentContainerStyle={styles.content}
			showsVerticalScrollIndicator={false}
		>
			<View style={styles.header}>
				<Text style={[styles.title, { color: c.text }]}>INSPECTOR</Text>
				<Text style={[styles.meta, { color: c.textSecondary }]}>
					{selectedNodes.length === 1
						? "1 node"
						: `${selectedNodes.length} nodes`}
				</Text>
			</View>

			{selectedNodes.slice(0, 2).map((node) => {
				const hidden = isNodeHidden(node);
				const disabled = isNodeDisabled(node);
				const reusable = isNodeReusable(node);
				return (
					<View
						key={node.id}
						style={[
							styles.nodeRow,
							{ borderBottomColor: "rgba(255,255,255,0.07)" },
						]}
					>
						<Ionicons
							name={getTypeIcon(node.type) as never}
							size={10}
							color={c.textSecondary}
						/>
						<Text
							style={[
								styles.nodeRowName,
								{ color: c.text, opacity: hidden || disabled ? 0.5 : 1 },
							]}
							numberOfLines={1}
						>
							{getNodeName(node)}
						</Text>
						<View style={styles.nodeRowBadges}>
							{hidden ? (
								<Ionicons name="eye-off-outline" size={9} color="#f97316" />
							) : null}
							{disabled && !hidden ? (
								<Ionicons name="lock-closed-outline" size={9} color="#94a3b8" />
							) : null}
							{reusable ? (
								<Ionicons name="diamond-outline" size={9} color="#a78bfa" />
							) : null}
						</View>
					</View>
				);
			})}
			{selectedNodes.length > 2 ? (
				<Text style={[styles.overflow, { color: c.textSecondary }]}>
					+{selectedNodes.length - 2} more
				</Text>
			) : null}

			{showTransform ? (
				<>
					<SectionDivider label="TRANSFORM" color={c.textSecondary} />
					<View style={styles.fieldRow}>
						<InspectorNumericInput
							label="X"
							fieldValue={fieldX}
							onCommit={(v) => updateSimpleField("x", v)}
							disabled={!editable}
						/>
						<InspectorNumericInput
							label="Y"
							fieldValue={fieldY}
							onCommit={(v) => updateSimpleField("y", v)}
							disabled={!editable}
						/>
					</View>
					{showWH ? (
						<View style={styles.fieldRow}>
							<InspectorNumericInput
								label="W"
								fieldValue={fieldW}
								onCommit={(v) =>
									updateSimpleField("width", v, (n) =>
										nodeHasWidthHeight(n.type),
									)
								}
								disabled={!editable}
							/>
							<InspectorNumericInput
								label="H"
								fieldValue={fieldH}
								onCommit={(v) =>
									updateSimpleField("height", v, (n) =>
										nodeHasWidthHeight(n.type),
									)
								}
								disabled={!editable}
							/>
						</View>
					) : null}
					<View style={styles.fieldRow}>
						<InspectorNumericInput
							label="Opacity"
							fieldValue={fieldOpacity}
							onCommit={(v) =>
								updateSimpleField("opacity", Math.max(0, Math.min(1, v)))
							}
							scale={100}
							suffix="%"
							disabled={!editable}
						/>
					</View>
				</>
			) : null}

			{showFill ? (
				<>
					<SectionDivider label="FILL" color={c.textSecondary} />
					<View style={styles.fieldRow}>
						<InspectorColorInput
							fieldValue={fieldFillColor}
							onCommit={updateFillColor}
							disabled={!editable}
						/>
					</View>
				</>
			) : null}

			{showStroke ? (
				<>
					<SectionDivider label="STROKE" color={c.textSecondary} />
					<View style={styles.fieldRow}>
						<InspectorColorInput
							fieldValue={fieldStrokeColor}
							onCommit={updateStrokeColor}
							disabled={!editable}
						/>
						<InspectorNumericInput
							label="T"
							fieldValue={fieldStrokeThickness}
							onCommit={updateStrokeThickness}
							disabled={!editable}
						/>
					</View>
				</>
			) : null}

			{showRef && singleRefNode ? (
				<>
					<SectionDivider label="COMPONENT" color={c.textSecondary} />
					<View style={styles.refSection}>
						<View style={styles.refRow}>
							<Ionicons name="link-outline" size={10} color={c.textSecondary} />
							<Text
								style={[styles.refTarget, { color: c.text }]}
								numberOfLines={1}
							>
								{refComponent ? getNodeName(refComponent) : singleRefNode.ref}
							</Text>
							{!refComponent ? (
								<Text style={[styles.refMissing, { color: "#f97316" }]}>
									missing
								</Text>
							) : null}
						</View>

						{descendantCount > 0 ? (
							<Text style={[styles.refMeta, { color: c.textSecondary }]}>
								{descendantCount}{" "}
								{descendantCount === 1
									? "descendant override"
									: "descendant overrides"}
							</Text>
						) : null}

						{refComponent ? (
							<View style={styles.refTagRow}>
								{(refComponent as { slot?: boolean }).slot ? (
									<View
										style={[
											styles.refTag,
											{ backgroundColor: "rgba(99,179,237,0.12)" },
										]}
									>
										<Text style={[styles.refTagText, { color: "#63b3ed" }]}>
											slot
										</Text>
									</View>
								) : null}
								{(refComponent as { placeholder?: boolean }).placeholder ? (
									<View
										style={[
											styles.refTag,
											{ backgroundColor: "rgba(154,230,180,0.12)" },
										]}
									>
										<Text style={[styles.refTagText, { color: "#9ae6b4" }]}>
											placeholder
										</Text>
									</View>
								) : null}
								{isNodeReusable(refComponent) ? (
									<View
										style={[
											styles.refTag,
											{ backgroundColor: "rgba(167,139,250,0.12)" },
										]}
									>
										<Text style={[styles.refTagText, { color: "#a78bfa" }]}>
											component
										</Text>
									</View>
								) : null}
							</View>
						) : null}

						{descendantCount > 0 ? (
							<View style={styles.descendantList}>
								{Object.keys(singleRefNode.descendants ?? {})
									.slice(0, 3)
									.map((key) => (
										<Text
											key={key}
											style={[styles.descendantKey, { color: c.textSecondary }]}
											numberOfLines={1}
										>
											• {key}
										</Text>
									))}
								{descendantCount > 3 ? (
									<Text style={[styles.refMeta, { color: c.textSecondary }]}>
										+{descendantCount - 3} more
									</Text>
								) : null}
							</View>
						) : null}
					</View>
				</>
			) : null}
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	scroll: { flex: 1 },
	content: { padding: 10, gap: 4 },
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 2,
	},
	title: { fontSize: 11, fontWeight: "700", letterSpacing: 0.4 },
	meta: { fontSize: 10 },
	nodeRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		paddingVertical: 3,
		borderBottomWidth: 1,
	},
	nodeRowName: { fontSize: 11, fontWeight: "500", flex: 1 },
	nodeRowBadges: {
		flexDirection: "row",
		alignItems: "center",
		gap: 3,
		flexShrink: 0,
	},
	overflow: { fontSize: 9, paddingVertical: 2 },
	fieldRow: { flexDirection: "row", gap: 6 },
	refSection: { gap: 4 },
	refRow: { flexDirection: "row", alignItems: "center", gap: 4 },
	refTarget: { fontSize: 11, fontWeight: "600", flex: 1 },
	refMissing: { fontSize: 9, fontWeight: "600" },
	refMeta: { fontSize: 9 },
	refTagRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
	refTag: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
	refTagText: { fontSize: 9, fontWeight: "600" },
	descendantList: { gap: 2 },
	descendantKey: { fontSize: 9 },
});
