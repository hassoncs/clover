import {
	DesignCanvasPanel as BaseDesignCanvasPanel,
	type DesignCanvasHost,
} from "@pencil/design-canvas";
import { useEditor } from "../EditorProvider";
import { useSharedWorkspaceFiles } from "../useWorkspaceFiles";

/**
 * Editor-specific wrapper around @pencil/design-canvas DesignCanvasPanel.
 *
 * Bridges the editor context (useEditor + useSharedWorkspaceFiles) into the
 * generic DesignCanvasHost adapter interface, keeping the canvas logic fully
 * decoupled from editor-specific state.
 */
export function DesignCanvasPanel() {
	const {
		selectedDesignFrameId,
		selectedDesignElementId,
		selectDesignFrame,
		selectDesignElement,
		clearDesignSelection,
		setDesignMode,
		designPhase,
		setDesignPhase,
	} = useEditor();
	const { designDocument, isLoadingDesign, saveDesignDocument } =
		useSharedWorkspaceFiles();

	const host: DesignCanvasHost = {
		document: designDocument ?? null,
		isLoadingDocument: isLoadingDesign,
		saveDocument: saveDesignDocument,
		selectedFrameId: selectedDesignFrameId,
		selectedElementId: selectedDesignElementId,
		selectedElementIds: [],
		selectFrame: selectDesignFrame,
		selectElement: selectDesignElement,
		clearSelection: clearDesignSelection,
		designMode: "select",
		setDesignMode,
		designPhase,
		setDesignPhase,
	};

	return <BaseDesignCanvasPanel host={host} />;
}
