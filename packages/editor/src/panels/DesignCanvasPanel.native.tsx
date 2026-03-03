import {
	DesignCanvasPanel as BaseDesignCanvasPanel,
	type DesignCanvasHost,
} from "@slopcade/design-canvas";
import { useEditor } from "../EditorProvider";
import { useSharedWorkspaceFiles } from "../useWorkspaceFiles";

/**
 * Native editor adapter — bridges editor context into DesignCanvasHost.
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
