import type { PenDocument } from "@slopcade/shared/types/pen";
import type React from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
	penDocumentToSceneGraph,
	sceneGraphToPenDocument,
} from "../pen/runtime/adapters";
import { PenToolFacade } from "../pen/runtime/facade";
import type { SceneGraph } from "../pen/runtime/scene-graph";

interface PenRuntimeContextValue {
	graph: SceneGraph;
	facade: PenToolFacade;
	selectedId: string | null;
	setSelectedId: (id: string | null) => void;
	activeTool: string;
	setActiveTool: (tool: string) => void;
	// A way to trigger re-renders when the graph mutates
	revision: number;
	commitMutation: () => void;
}

const PenRuntimeContext = createContext<PenRuntimeContextValue | null>(null);

export function usePenRuntime() {
	const ctx = useContext(PenRuntimeContext);
	if (!ctx)
		throw new Error("usePenRuntime must be used within PenRuntimeProvider");
	return ctx;
}

export type PenRuntimeProviderProps = {
	onChange?: (doc: PenDocument) => void;
	children: React.ReactNode;
} & (
	| { document: PenDocument; graph?: never; facade?: never }
	| { graph: SceneGraph; facade?: PenToolFacade; document?: never }
);

export function PenRuntimeProvider({
	document,
	graph: graphProp,
	facade: facadeProp,
	onChange,
	children,
}: PenRuntimeProviderProps) {
	// Initialize graph and facade once. If graph prop provided, use it directly.
	// If document prop provided, convert to SceneGraph on first render.
	// eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally initialized once
	const { graph, facade } = useMemo(() => {
		if (graphProp !== undefined) {
			const f = facadeProp ?? new PenToolFacade(graphProp);
			return { graph: graphProp, facade: f };
		}
		const g = penDocumentToSceneGraph(document ?? { version: 1, children: [] });
		const f = new PenToolFacade(g);
		return { graph: g, facade: f };
	}, []);  // We only initialize once — graph is the mutable source of truth

	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [activeTool, setActiveTool] = useState<string>("pointer");
	const [revision, setRevision] = useState(0);

	const commitMutation = () => {
		setRevision((r) => r + 1);
		if (onChange) {
			onChange(sceneGraphToPenDocument(graph));
		}
	};

	const value = useMemo(
		() => ({
			graph,
			facade,
			selectedId,
			setSelectedId,
			activeTool,
			setActiveTool,
			revision,
			commitMutation,
		}),
		[graph, facade, selectedId, activeTool, revision],
	);

	return (
		<PenRuntimeContext.Provider value={value}>
			{children}
		</PenRuntimeContext.Provider>
	);
}
