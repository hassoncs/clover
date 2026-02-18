import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useState,
} from "react";

export interface DevToolsState {
	showInputDebug: boolean;
	showPhysicsShapes: boolean;
	showZones: boolean;
	showFPS: boolean;
	isExpanded: boolean;
}

interface DevToolsContextValue {
	state: DevToolsState;
	isLoading: boolean;
	toggleInputDebug: () => void;
	togglePhysicsShapes: () => void;
	toggleZones: () => void;
	toggleFPS: () => void;
	toggleExpanded: () => void;
}

const DEFAULT_STATE: DevToolsState = {
	showInputDebug: false,
	showPhysicsShapes: false,
	showZones: false,
	showFPS: false,
	isExpanded: false,
};

const DevToolsContext = createContext<DevToolsContextValue | null>(null);

export function DevToolsProvider({ children }: { children: ReactNode }) {
	const [state, setState] = useState<DevToolsState>(DEFAULT_STATE);

	const toggleInputDebug = useCallback(() => {
		setState((prev) => ({ ...prev, showInputDebug: !prev.showInputDebug }));
	}, []);

	const togglePhysicsShapes = useCallback(() => {
		setState((prev) => ({
			...prev,
			showPhysicsShapes: !prev.showPhysicsShapes,
		}));
	}, []);

	const toggleZones = useCallback(() => {
		setState((prev) => ({ ...prev, showZones: !prev.showZones }));
	}, []);

	const toggleFPS = useCallback(() => {
		setState((prev) => ({ ...prev, showFPS: !prev.showFPS }));
	}, []);

	const toggleExpanded = useCallback(() => {
		setState((prev) => ({ ...prev, isExpanded: !prev.isExpanded }));
	}, []);

	const value: DevToolsContextValue = {
		state,
		isLoading: false,
		toggleInputDebug,
		togglePhysicsShapes,
		toggleZones,
		toggleFPS,
		toggleExpanded,
	};

	return (
		<DevToolsContext.Provider value={value}>
			{children}
		</DevToolsContext.Provider>
	);
}

export function useDevToolsContext() {
	const context = useContext(DevToolsContext);
	if (!context) {
		throw new Error("useDevToolsContext must be used within DevToolsProvider");
	}
	return context;
}

export function useDevToolsOptional() {
	return useContext(DevToolsContext);
}
