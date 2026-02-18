import React, {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import { useEditor } from "../EditorProvider";

export interface PreviewConfig {
	orientation: "portrait" | "landscape";
	aspectRatio: string; // e.g., "9:19.5" for phone
}

interface WireframeModeContextValue {
	mode: "structural" | "production";
	setMode: (mode: "structural" | "production") => void;
	toggleMode: () => void;
	selectedScreenIndex: number;
	setSelectedScreenIndex: (index: number) => void;
	totalScreens: number;
	previewConfig: PreviewConfig;
}

const WireframeModeContext = createContext<WireframeModeContextValue | null>(
	null,
);

export function WireframeModeProvider({ children }: { children: ReactNode }) {
	const { document } = useEditor();
	const [mode, setMode] = useState<"structural" | "production">("structural");
	const [selectedScreenIndex, setSelectedScreenIndex] = useState(0);

	const totalScreens = useMemo(() => {
		// TODO: Update this when GameDefinition has explicit screens/phases
		// For now, we assume 3 phases for party games (lobby, playing, ended) or 1 for others
		if (document.party) {
			return 3;
		}
		return 1;
	}, [document]);

	const toggleMode = useCallback(() => {
		setMode((prev) => (prev === "structural" ? "production" : "structural"));
	}, []);

	const previewConfig = useMemo<PreviewConfig>(
		() => ({
			orientation: "portrait",
			aspectRatio: "9:19.5",
		}),
		[],
	);

	const value = useMemo(
		() => ({
			mode,
			setMode,
			toggleMode,
			selectedScreenIndex,
			setSelectedScreenIndex,
			totalScreens,
			previewConfig,
		}),
		[mode, toggleMode, selectedScreenIndex, totalScreens, previewConfig],
	);

	return (
		<WireframeModeContext.Provider value={value}>
			{children}
		</WireframeModeContext.Provider>
	);
}

export function useWireframeMode() {
	const context = useContext(WireframeModeContext);
	if (!context) {
		throw new Error(
			"useWireframeMode must be used within WireframeModeProvider",
		);
	}
	return context;
}
