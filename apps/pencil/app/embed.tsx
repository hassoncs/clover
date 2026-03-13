import type { PenDocument } from "@pencil/protocol/pen";
import { useLocalSearchParams } from "expo-router";
import { lazy, Suspense, useMemo, useState, type ComponentType } from "react";
import {
	ActivityIndicator,
	Platform,
	StyleSheet,
	Text,
	View,
} from "react-native";
import type { PenCanvasPanelProps } from "../components/PencilCanvasPanel";
import {
	buildPencilRuntimeState,
	createEmbedDocumentForTarget,
	loadStoredDocument,
	resolvePencilRuntimeBindingFromParams,
	type PencilEmbedMode,
} from "../lib/pencilEmbed";
import { usePencilBridge } from "../lib/usePencilBridge";
import { usePencilDocumentSync } from "../lib/usePencilDocumentSync";

const PenCanvasPanel = lazy(async () => {
	const module =
		Platform.OS === "web"
			? await import("../components/PencilCanvasPanel.web")
			: await import("../components/PencilCanvasPanel.native");

	return {
		default: module.PencilCanvasPanel as ComponentType<PenCanvasPanelProps>,
	};
});

function getSingleParam(value: string | string[] | undefined): string | null {
	if (typeof value === "string" && value.length > 0) return value;
	if (Array.isArray(value) && value[0]) return value[0];
	return null;
}

export default function PencilEmbedScreen() {
	const params = useLocalSearchParams<{
		target?: string | string[];
		mode?: string | string[];
		file?: string | string[];
		filename?: string | string[];
		filePath?: string | string[];
		session?: string | string[];
		sessionId?: string | string[];
		project?: string | string[];
		projectRoot?: string | string[];
		gameId?: string | string[];
	}>();
	const targetId = getSingleParam(params.target);
	const mode = (getSingleParam(params.mode) ?? "prism") as PencilEmbedMode;
	const binding = useMemo(
		() =>
			resolvePencilRuntimeBindingFromParams({
				file: getSingleParam(params.file),
				filename: getSingleParam(params.filename),
				filePath: getSingleParam(params.filePath),
				session: getSingleParam(params.session),
				sessionId: getSingleParam(params.sessionId),
				project: getSingleParam(params.project),
				projectRoot: getSingleParam(params.projectRoot),
				gameId: getSingleParam(params.gameId),
			}),
		[params.file, params.filePath, params.filename, params.gameId, params.project, params.projectRoot, params.session, params.sessionId],
	);

	const [sourceDocument, setSourceDocument] = useState<PenDocument>(() =>
		loadStoredDocument(),
	);

	const {
		sessionId: runtimeSessionId,
		projectRoot: runtimeProjectRoot,
		filePath: runtimeFilePath,
	} = usePencilDocumentSync({
		document: sourceDocument,
		onRemoteDocument: setSourceDocument,
		readOnly: true,
		filename: binding.filename,
	});

	const targetResult = useMemo(
		() =>
			targetId ? createEmbedDocumentForTarget(sourceDocument, targetId) : null,
		[sourceDocument, targetId],
	);

	const renderDocument = targetResult?.document ?? sourceDocument;
	const runtimeState = useMemo(
		() =>
			buildPencilRuntimeState({
				document: renderDocument,
				sessionId: runtimeSessionId,
				projectRoot: runtimeProjectRoot,
				filePath: runtimeFilePath ?? binding.filename,
				legacyWorkspaceId: binding.legacyWorkspaceId,
				targetId,
				targetPath: targetResult?.targetPath ?? null,
				mode,
				readOnly: true,
			}),
		[
			binding.filename,
			binding.legacyWorkspaceId,
			mode,
			renderDocument,
			runtimeFilePath,
			runtimeProjectRoot,
			runtimeSessionId,
			targetId,
			targetResult?.targetPath,
		],
	);

	usePencilBridge(sourceDocument, setSourceDocument, {
		selectedNodePath: targetResult?.targetPath ?? null,
		runtimeState,
	});

	if (targetId && !targetResult) {
		return (
			<View style={styles.errorState}>
				<Text style={styles.errorTitle}>Target not found</Text>
				<Text style={styles.errorBody}>
					No Pencil node exists for `{targetId}` in the current document.
				</Text>
			</View>
		);
	}

	return (
		<View style={styles.root}>
			<Suspense
				fallback={
					<View style={styles.loadingState}>
						<ActivityIndicator color="#8fb6ff" />
					</View>
				}
			>
				<PenCanvasPanel
					document={renderDocument}
					hideHeader
					hideLayers
					hidePalette
					hideInspector
					autoFit
				/>
			</Suspense>
		</View>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: "#050816",
	},
	loadingState: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#050816",
	},
	errorState: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 24,
		backgroundColor: "#050816",
		gap: 8,
	},
	errorTitle: {
		color: "#f5f7fb",
		fontSize: 18,
		fontWeight: "600",
	},
	errorBody: {
		color: "#9aa7bf",
		fontSize: 14,
		textAlign: "center",
		maxWidth: 420,
	},
});
