import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { CodeEditor } from "./code-editor";
import { detectLanguage } from "./code-editor/types";
import { BinaryPreviewPanel } from "./preview/BinaryPreviewPanel";
import { isBinaryFile } from "./preview/utils";

interface FileViewerProps {
	filename: string | null;
	content: string | null;
	isLoading: boolean;
	onSave?: (content: string) => void;
	isSaving?: boolean;
}

export function FileViewer({
	filename,
	content,
	isLoading,
	onSave,
	isSaving,
}: FileViewerProps) {
	const [localContent, setLocalContent] = useState(content ?? "");
	const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
		"idle",
	);
	const [hasRecentEdit, setHasRecentEdit] = useState(false);
	const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const editFlagTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (content !== null && content !== localContent && !hasRecentEdit) {
			setLocalContent(content);
		}
	}, [content, hasRecentEdit, localContent]);

	useEffect(() => {
		if (isSaving) {
			setSaveStatus("saving");
		} else if (saveStatus === "saving") {
			setSaveStatus("saved");
			const timer = setTimeout(() => setSaveStatus("idle"), 2000);
			return () => clearTimeout(timer);
		}
	}, [isSaving, saveStatus]);

	const handleTextChange = (text: string) => {
		setLocalContent(text);
		setHasRecentEdit(true);

		if (editFlagTimerRef.current) {
			clearTimeout(editFlagTimerRef.current);
		}
		editFlagTimerRef.current = setTimeout(() => {
			setHasRecentEdit(false);
		}, 2000);

		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}

		debounceTimerRef.current = setTimeout(() => {
			if (onSave) {
				onSave(text);
			}
		}, 800);
	};

	useEffect(() => {
		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
			if (editFlagTimerRef.current) {
				clearTimeout(editFlagTimerRef.current);
			}
		};
	}, []);

	if (!filename) {
		return (
			<View className="flex-1 bg-secondary-800">
				<View className="flex-1 items-center justify-center p-8">
					<Text className="text-5xl mb-4">📄</Text>
					<Text className="text-white text-lg font-semibold mb-2">
						No File Selected
					</Text>
					<Text className="text-secondary-400 text-sm text-center leading-5">
						Select a file from the sidebar to view its content.
					</Text>
				</View>
			</View>
		);
	}

	// Check for binary file
	if (isBinaryFile(filename)) {
		return <BinaryPreviewPanel filename={filename} />;
	}

	if (isLoading && content === null) {
		return (
			<View className="flex-1 bg-secondary-800 items-center justify-center">
				<ActivityIndicator size="large" color="#6366F1" />
			</View>
		);
	}

	if (content === null) {
		if (filename === "document.md") {
			return (
				<View className="flex-1 bg-secondary-800">
					<View className="flex-1 items-center justify-center p-8">
						<Text className="text-5xl mb-4">📄</Text>
						<Text className="text-white text-lg font-semibold mb-2">
							Shared Document
						</Text>
						<Text className="text-secondary-400 text-sm text-center leading-5">
							The AI will create and edit a document here as you chat.
						</Text>
					</View>
				</View>
			);
		}

		return (
			<View className="flex-1 bg-secondary-800">
				<View className="flex-1 items-center justify-center p-8">
					<Text className="text-secondary-400 text-sm text-center leading-5">
						File is empty or could not be read.
					</Text>
				</View>
			</View>
		);
	}

	return (
		<View className="flex-1 bg-secondary-800" testID="file-viewer">
			<CodeEditor
				value={localContent}
				onChange={handleTextChange}
				language={detectLanguage(filename)}
				testID="file-viewer-editor"
			/>
			{saveStatus !== "idle" && (
				<View className="h-6 bg-secondary-900 border-t border-secondary-700 justify-center px-3">
					<Text className="text-xs text-secondary-400">
						{saveStatus === "saving" ? "Saving..." : "Saved"}
					</Text>
				</View>
			)}
		</View>
	);
}
