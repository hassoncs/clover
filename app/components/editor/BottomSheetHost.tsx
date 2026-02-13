import { forwardRef, useCallback, useImperativeHandle, useState } from "react";
import { ChatSheet } from "./ChatSheet";
import { type EditorTab, useEditor } from "./EditorProvider";
import { EditorToolbar } from "./EditorToolbar";
import { ToolSheet } from "./ToolSheet";
import { useEditorChatSession } from "./useEditorChatSession";

export interface BottomSheetHostHandle {
	openTab: (tabId: EditorTab) => void;
}

export const BottomSheetHost = forwardRef<BottomSheetHostHandle>(
	function BottomSheetHost(_props, ref) {
		const { mode } = useEditor();
		const [chatOpen, setChatOpen] = useState(false);
		const [activeToolTab, setActiveToolTab] = useState<EditorTab | null>(null);

		const {
			messages,
			handleSendMessage: sendMessage,
			isRunning,
			isSending,
			submitAnswer,
			submitUserAnswer,
			pendingQuestions,
		} = useEditorChatSession();

		const handleSendMessage = useCallback(
			async (text: string) => {
				await sendMessage(text);
				setActiveToolTab(null);
				setChatOpen(true);
			},
			[sendMessage],
		);

		const handleTabPress = useCallback((tabId: EditorTab) => {
			setChatOpen(false);
			setActiveToolTab(tabId);
		}, []);

		const handleDismissChat = useCallback(() => {
			setChatOpen(false);
		}, []);

		const handleDismissTool = useCallback(() => {
			setActiveToolTab(null);
		}, []);

		useImperativeHandle(ref, () => ({
			openTab: (tabId: EditorTab) => {
				setChatOpen(false);
				setActiveToolTab(tabId);
			},
		}));

		if (mode === "playtest") {
			return null;
		}

		return (
			<>
				<EditorToolbar
					onSendMessage={handleSendMessage}
					onTabPress={handleTabPress}
					isSending={isSending}
				/>
				<ChatSheet
					visible={chatOpen}
					onDismiss={handleDismissChat}
					messages={messages}
					onSendMessage={handleSendMessage}
					isSending={isSending}
					isRunning={isRunning}
					submitAnswer={submitAnswer}
					submitUserAnswer={submitUserAnswer}
					pendingQuestions={pendingQuestions}
				/>
				<ToolSheet activeTab={activeToolTab} onDismiss={handleDismissTool} />
			</>
		);
	},
);
