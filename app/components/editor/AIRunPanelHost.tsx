import { useEditor } from "./EditorProvider";
import { AIEditorPanel } from "./AIEditor";

export function AIRunPanelHost() {
  const { showAIRunPanel, toggleAIRunPanel, gameId } = useEditor();

  if (!showAIRunPanel) return null;

  return <AIEditorPanel gameId={gameId} />;
}
