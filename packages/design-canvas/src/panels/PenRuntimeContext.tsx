import type { PenDocument } from "@slopcade/shared/types/pen";
import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import {
	penDocumentToSceneGraph,
	sceneGraphToPenDocument,
} from "../pen/runtime/adapters";
import { PenToolFacade } from "../pen/runtime/facade";
import type { SceneGraph } from "../pen/runtime/scene-graph";

type RightPanel = "inspector" | "variables" | "components";

interface PenRuntimeContextValue {
	graph: SceneGraph;
	facade: PenToolFacade;
	// Single selection (primary selected node)
	selectedId: string | null;
	setSelectedId: (id: string | null) => void;
	// Multi-selection set
	selectedIds: ReadonlySet<string>;
	setSelectedIds: (ids: Set<string>) => void;
	toggleSelectedId: (id: string, additive: boolean) => void;
	activeTool: string;
	setActiveTool: (tool: string) => void;
	// A way to trigger re-renders when the graph mutates
	revision: number;
	commitMutation: () => void;
	activeRightPanel: RightPanel;
	setActiveRightPanel: (panel: RightPanel) => void;
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
	}, []); // We only initialize once — graph is the mutable source of truth

	const [selectedId, setSelectedIdRaw] = useState<string | null>(null);
	const [selectedIds, setSelectedIdsRaw] = useState<ReadonlySet<string>>(
		new Set(),
	);
	const [activeTool, setActiveTool] = useState<string>("pointer");
	const [revision, setRevision] = useState(0);
	const [activeRightPanel, setActiveRightPanel] =
		useState<RightPanel>("inspector");

	const setSelectedId = useCallback((id: string | null) => {
		setSelectedIdRaw(id);
		setSelectedIdsRaw(id ? new Set([id]) : new Set());
	}, []);

	const setSelectedIds = useCallback((ids: Set<string>) => {
		setSelectedIdsRaw(ids);
		// Primary selection is the last added (or first in set)
		const first = ids.values().next().value ?? null;
		setSelectedIdRaw(first);
	}, []);

	const toggleSelectedId = useCallback((id: string, additive: boolean) => {
		if (additive) {
			setSelectedIdsRaw((prev) => {
				const next = new Set(prev);
				if (next.has(id)) {
					next.delete(id);
				} else {
					next.add(id);
				}
				const first = next.values().next().value ?? null;
				setSelectedIdRaw(first);
				return next;
			});
		} else {
			setSelectedIdRaw(id);
			setSelectedIdsRaw(new Set([id]));
		}
	}, []);

	const commitMutation = useCallback(() => {
		setRevision((r) => r + 1);
		if (onChange) {
			onChange(sceneGraphToPenDocument(graph));
		}
	}, [graph, onChange]);

	const value = useMemo(
		() => ({
			graph,
			facade,
			selectedId,
			setSelectedId,
			selectedIds,
			setSelectedIds,
			toggleSelectedId,
			activeTool,
			setActiveTool,
			revision,
			commitMutation,
			activeRightPanel,
			setActiveRightPanel,
		}),
		[
			graph,
			facade,
			selectedId,
			setSelectedId,
			selectedIds,
			setSelectedIds,
			toggleSelectedId,
			activeTool,
			revision,
			commitMutation,
			activeRightPanel,
		],
	);

	return (
		<PenRuntimeContext.Provider value={value}>
			{children}
		</PenRuntimeContext.Provider>
	);
}
