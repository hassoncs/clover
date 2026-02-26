import type { EntityManager } from "@slopcade/game-runtime/EntityManager";
import type {
	AssetPlacement,
	EntityPrefab,
	GameDefinition,
	GameEntity,
	PreviewContext,
} from "@slopcade/shared";
import type {
	ValidationError,
	ValidationWarning,
} from "@slopcade/shared/validation/gameDefinitionTypes";
import React, {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
} from "react";
import type { Physics2D } from "@/lib/physics2d";
import { getStorageItem } from "@/lib/utils/storage";
import { usePackageReadiness } from "./usePackageReadiness";

export interface ResolvedAssetEntry {
	imageUrl: string;
	placement?: AssetPlacement;
}

export type EditorMode = "author" | "live";
export type TimeMode = "paused" | "playing";
export type DesignMode = "idle" | "select" | "pan";
export type DesignPhase = "idle" | "designing" | "approved" | "implementing";
export type EditorTab =
	| "gallery"
	| "assets"
	| "properties"
	| "layers"
	| "debug"
	| "chat"
	| "files"
	| "live-state";
export type SheetSnapPoint = 0 | 1 | 2;

interface Vec2 {
	x: number;
	y: number;
}

export interface EditorAction {
	type: string;
	entityId?: string;
	from?: unknown;
	to?: unknown;
	entity?: GameEntity;
	path?: string;
}

interface HistoryEntry {
	document: GameDefinition;
	selectedEntityId: string | null;
}

interface EditorState {
	mode: EditorMode;
	timeMode: TimeMode;
	selectedEntityId: string | null;
	activeTab: EditorTab;
	sheetSnapPoint: SheetSnapPoint;
	document: GameDefinition;
	isDirty: boolean;
	undoStack: HistoryEntry[];
	redoStack: HistoryEntry[];
	cameraPosition: Vec2;
	cameraZoom: number;
	previewContexts: PreviewContext[];
	activeContextId: string;
	focusedContextId: string;
	selectedDesignFrameId: string | null;
	selectedDesignElementId: string | null;
	designMode: DesignMode;
	designPhase: DesignPhase;
}

type EditorStateAction =
	| { type: "SET_MODE"; mode: EditorMode }
	| { type: "SET_TIME_MODE"; mode: TimeMode }
	| { type: "SELECT_ENTITY"; entityId: string | null }
	| { type: "SET_ACTIVE_TAB"; tab: EditorTab }
	| { type: "SET_SHEET_SNAP_POINT"; point: SheetSnapPoint }
	| { type: "UPDATE_DOCUMENT"; document: GameDefinition }
	| { type: "SET_DIRTY"; isDirty: boolean }
	| { type: "PUSH_UNDO"; action: EditorAction }
	| { type: "UNDO" }
	| { type: "REDO" }
	| { type: "SET_CAMERA"; position?: Vec2; zoom?: number }
	| { type: "MOVE_ENTITY"; entityId: string; x: number; y: number }
	| { type: "SCALE_ENTITY"; entityId: string; scale: number }
	| { type: "ROTATE_ENTITY"; entityId: string; angle: number }
	| { type: "DELETE_ENTITY"; entityId: string }
	| { type: "DUPLICATE_ENTITY"; entityId: string }
	| { type: "ADD_ENTITY"; entity: GameEntity }
	| { type: "ADD_ENTITY_FROM_PREFAB"; prefabId: string; x: number; y: number }
	| {
			type: "UPDATE_ENTITY_PROPERTY";
			entityId: string;
			path: string;
			value: unknown;
	  }
	| { type: "SET_ACTIVE_ASSETS"; entries: Record<string, ResolvedAssetEntry> }
	| { type: "SET_ACTIVE_CONTEXT"; contextId: string }
	| { type: "SET_FOCUSED_CONTEXT"; contextId: string }
	| { type: "UPDATE_PREVIEW_CONTEXTS"; contexts: PreviewContext[] }
	| { type: "SELECT_DESIGN_FRAME"; frameId: string | null }
	| { type: "SELECT_DESIGN_ELEMENT"; elementId: string | null; frameId: string }
	| { type: "CLEAR_DESIGN_SELECTION" }
	| { type: "SET_DESIGN_MODE"; mode: DesignMode }
	| { type: "SET_DESIGN_PHASE"; phase: DesignPhase };

const MAX_HISTORY = 50;

function editorReducer(
	state: EditorState,
	action: EditorStateAction,
): EditorState {
	switch (action.type) {
		case "SET_MODE":
			return { ...state, mode: action.mode };

		case "SET_TIME_MODE":
			return { ...state, timeMode: action.mode };

		case "SELECT_ENTITY":
			return { ...state, selectedEntityId: action.entityId };

		case "SET_ACTIVE_TAB":
			return { ...state, activeTab: action.tab };

		case "SET_SHEET_SNAP_POINT":
			return { ...state, sheetSnapPoint: action.point };

		case "UPDATE_DOCUMENT":
			return { ...state, document: action.document, isDirty: true };

		case "SET_DIRTY":
			return { ...state, isDirty: action.isDirty };

		case "PUSH_UNDO": {
			const entry: HistoryEntry = {
				document: JSON.parse(JSON.stringify(state.document)),
				selectedEntityId: state.selectedEntityId,
			};
			const newUndoStack = [...state.undoStack, entry].slice(-MAX_HISTORY);
			return { ...state, undoStack: newUndoStack, redoStack: [] };
		}

		case "UNDO": {
			if (state.undoStack.length === 0) return state;
			const currentEntry: HistoryEntry = {
				document: JSON.parse(JSON.stringify(state.document)),
				selectedEntityId: state.selectedEntityId,
			};
			const prevEntry = state.undoStack[state.undoStack.length - 1];
			const newUndoStack = state.undoStack.slice(0, -1);
			const newRedoStack = [...state.redoStack, currentEntry];
			return {
				...state,
				document: prevEntry.document,
				selectedEntityId: prevEntry.selectedEntityId,
				undoStack: newUndoStack,
				redoStack: newRedoStack,
				isDirty: newUndoStack.length > 0,
			};
		}

		case "REDO": {
			if (state.redoStack.length === 0) return state;
			const currentEntry: HistoryEntry = {
				document: JSON.parse(JSON.stringify(state.document)),
				selectedEntityId: state.selectedEntityId,
			};
			const nextEntry = state.redoStack[state.redoStack.length - 1];
			const newRedoStack = state.redoStack.slice(0, -1);
			const newUndoStack = [...state.undoStack, currentEntry];
			return {
				...state,
				document: nextEntry.document,
				selectedEntityId: nextEntry.selectedEntityId,
				undoStack: newUndoStack,
				redoStack: newRedoStack,
				isDirty: true,
			};
		}

		case "SET_CAMERA":
			return {
				...state,
				cameraPosition: action.position ?? state.cameraPosition,
				cameraZoom: action.zoom ?? state.cameraZoom,
			};

		case "MOVE_ENTITY": {
			const newDocument = { ...state.document };
			const entityIndex = newDocument.entities.findIndex(
				(e) => e.id === action.entityId,
			);
			if (entityIndex === -1) return state;

			const historyEntry: HistoryEntry = {
				document: JSON.parse(JSON.stringify(state.document)),
				selectedEntityId: state.selectedEntityId,
			};

			const entity = { ...newDocument.entities[entityIndex] };
			entity.transform = { ...entity.transform, x: action.x, y: action.y };
			newDocument.entities = [...newDocument.entities];
			newDocument.entities[entityIndex] = entity;

			return {
				...state,
				document: newDocument,
				isDirty: true,
				undoStack: [...state.undoStack, historyEntry].slice(-MAX_HISTORY),
				redoStack: [],
			};
		}

		case "SCALE_ENTITY": {
			const newDocument = { ...state.document };
			const entityIndex = newDocument.entities.findIndex(
				(e) => e.id === action.entityId,
			);
			if (entityIndex === -1) return state;

			const historyEntry: HistoryEntry = {
				document: JSON.parse(JSON.stringify(state.document)),
				selectedEntityId: state.selectedEntityId,
			};

			const entity = { ...newDocument.entities[entityIndex] };
			entity.transform = {
				...entity.transform,
				scaleX: action.scale,
				scaleY: action.scale,
			};
			newDocument.entities = [...newDocument.entities];
			newDocument.entities[entityIndex] = entity;

			return {
				...state,
				document: newDocument,
				isDirty: true,
				undoStack: [...state.undoStack, historyEntry].slice(-MAX_HISTORY),
				redoStack: [],
			};
		}

		case "ROTATE_ENTITY": {
			const newDocument = { ...state.document };
			const entityIndex = newDocument.entities.findIndex(
				(e) => e.id === action.entityId,
			);
			if (entityIndex === -1) return state;

			const historyEntry: HistoryEntry = {
				document: JSON.parse(JSON.stringify(state.document)),
				selectedEntityId: state.selectedEntityId,
			};

			const entity = { ...newDocument.entities[entityIndex] };
			entity.transform = { ...entity.transform, angle: action.angle };
			newDocument.entities = [...newDocument.entities];
			newDocument.entities[entityIndex] = entity;

			return {
				...state,
				document: newDocument,
				isDirty: true,
				undoStack: [...state.undoStack, historyEntry].slice(-MAX_HISTORY),
				redoStack: [],
			};
		}

		case "DELETE_ENTITY": {
			const newDocument = { ...state.document };
			const entityIndex = newDocument.entities.findIndex(
				(e) => e.id === action.entityId,
			);
			if (entityIndex === -1) return state;

			const historyEntry: HistoryEntry = {
				document: JSON.parse(JSON.stringify(state.document)),
				selectedEntityId: state.selectedEntityId,
			};

			newDocument.entities = newDocument.entities.filter(
				(e) => e.id !== action.entityId,
			);

			return {
				...state,
				document: newDocument,
				isDirty: true,
				selectedEntityId:
					state.selectedEntityId === action.entityId
						? null
						: state.selectedEntityId,
				undoStack: [...state.undoStack, historyEntry].slice(-MAX_HISTORY),
				redoStack: [],
			};
		}

		case "DUPLICATE_ENTITY": {
			const newDocument = { ...state.document };
			const entityIndex = newDocument.entities.findIndex(
				(e) => e.id === action.entityId,
			);
			if (entityIndex === -1) return state;

			const historyEntry: HistoryEntry = {
				document: JSON.parse(JSON.stringify(state.document)),
				selectedEntityId: state.selectedEntityId,
			};

			const originalEntity = newDocument.entities[entityIndex] as GameEntity;
			const newId = `${originalEntity.id}_copy_${Date.now()}`;
			const duplicatedEntity: GameEntity = {
				...originalEntity,
				id: newId,
				name: `${originalEntity.name} (copy)`,
				transform: {
					...originalEntity.transform,
					x: originalEntity.transform.x + 1,
					y: originalEntity.transform.y + 1,
				},
			};

			newDocument.entities = [...newDocument.entities, duplicatedEntity];

			return {
				...state,
				document: newDocument,
				isDirty: true,
				selectedEntityId: newId,
				undoStack: [...state.undoStack, historyEntry].slice(-MAX_HISTORY),
				redoStack: [],
			};
		}

		case "ADD_ENTITY": {
			const historyEntry: HistoryEntry = {
				document: JSON.parse(JSON.stringify(state.document)),
				selectedEntityId: state.selectedEntityId,
			};

			const newDocument = { ...state.document };
			newDocument.entities = [...newDocument.entities, action.entity];

			return {
				...state,
				document: newDocument,
				isDirty: true,
				selectedEntityId: action.entity.id,
				undoStack: [...state.undoStack, historyEntry].slice(-MAX_HISTORY),
				redoStack: [],
			};
		}

		case "ADD_ENTITY_FROM_PREFAB": {
			const template = state.document.prefabs[action.prefabId] as
				| EntityPrefab
				| undefined;
			if (!template) return state;

			const historyEntry: HistoryEntry = {
				document: JSON.parse(JSON.stringify(state.document)),
				selectedEntityId: state.selectedEntityId,
			};

			const newId = `${action.prefabId}_${Date.now()}`;
			const newEntity: GameEntity = {
				id: newId,
				name: action.prefabId,
				prefab: action.prefabId,
				transform: {
					x: action.x,
					y: action.y,
					angle: 0,
					scaleX: 1,
					scaleY: 1,
				},
				visual: template.visual,
				collider: template.collider,
				tags: template.tags,
				layer: template.layer,
			};

			const newDocument = { ...state.document };
			newDocument.entities = [...newDocument.entities, newEntity];

			return {
				...state,
				document: newDocument,
				isDirty: true,
				selectedEntityId: newId,
				undoStack: [...state.undoStack, historyEntry].slice(-MAX_HISTORY),
				redoStack: [],
			};
		}

		case "UPDATE_ENTITY_PROPERTY": {
			const newDocument = { ...state.document };
			const entityIndex = newDocument.entities.findIndex(
				(e) => e.id === action.entityId,
			);
			if (entityIndex === -1) return state;

			const historyEntry: HistoryEntry = {
				document: JSON.parse(JSON.stringify(state.document)),
				selectedEntityId: state.selectedEntityId,
			};

			const entity = JSON.parse(
				JSON.stringify(newDocument.entities[entityIndex]),
			) as GameEntity;
			const pathParts = action.path.split(".");
			let target: Record<string, unknown> = entity as unknown as Record<
				string,
				unknown
			>;

			for (let i = 0; i < pathParts.length - 1; i++) {
				const part = pathParts[i];
				if (
					!(part in target) ||
					target[part] === null ||
					target[part] === undefined
				) {
					target[part] = {};
				}
				target = target[part] as Record<string, unknown>;
			}

			const lastPart = pathParts[pathParts.length - 1];
			target[lastPart] = action.value;

			newDocument.entities = [...newDocument.entities];
			newDocument.entities[entityIndex] = entity;

			return {
				...state,
				document: newDocument,
				isDirty: true,
				undoStack: [...state.undoStack, historyEntry].slice(-MAX_HISTORY),
				redoStack: [],
			};
		}

		case "SET_ACTIVE_ASSETS": {
			console.log("[EditorProvider] SET_ACTIVE_ASSETS reducer", {
				entriesCount: Object.keys(action.entries).length,
				templateIds: Object.keys(action.entries),
			});

			const newDocument = JSON.parse(
				JSON.stringify(state.document),
			) as GameDefinition;

			for (const [prefabId, entry] of Object.entries(action.entries)) {
				const prefab = newDocument.prefabs[prefabId];
				if (prefab) {
					const collider = prefab.collider;
					let imageWidth = 1;
					let imageHeight = 1;

					if (collider) {
						if (collider.shape === "box") {
							imageWidth = collider.width;
							imageHeight = collider.height;
						} else if (collider.shape === "circle") {
							imageWidth = collider.radius * 2;
							imageHeight = collider.radius * 2;
						}
					}

					console.log("[EditorProvider] Updating prefab visual", {
						prefabId,
						imageUrl: entry.imageUrl,
						width: imageWidth,
						height: imageHeight,
					});

					prefab.visual = {
						type: "image",
						imageWidth,
						imageHeight,
					};
				}
			}

			console.log("[EditorProvider] Document updated with assets");

			return {
				...state,
				document: newDocument,
				isDirty: true,
			};
		}

		case "SET_ACTIVE_CONTEXT":
			return { ...state, activeContextId: action.contextId };

		case "SET_FOCUSED_CONTEXT":
			return { ...state, focusedContextId: action.contextId };

		case "UPDATE_PREVIEW_CONTEXTS": {
			const activeId =
				state.activeContextId &&
				action.contexts.find((c) => c.id === state.activeContextId)
					? state.activeContextId
					: action.contexts[0]?.id || "";
			const focusedId =
				state.focusedContextId &&
				action.contexts.find((c) => c.id === state.focusedContextId)
					? state.focusedContextId
					: action.contexts[0]?.id || "";

			return {
				...state,
				previewContexts: action.contexts,
				activeContextId: activeId,
				focusedContextId: focusedId,
			};
		}

		case "SELECT_DESIGN_FRAME":
			return {
				...state,
				selectedDesignFrameId: action.frameId,
				selectedDesignElementId: null,
			};

		case "SELECT_DESIGN_ELEMENT":
			return {
				...state,
				selectedDesignFrameId: action.frameId,
				selectedDesignElementId: action.elementId,
			};

		case "CLEAR_DESIGN_SELECTION":
			return {
				...state,
				selectedDesignFrameId: null,
				selectedDesignElementId: null,
				designMode: "idle",
			};

		case "SET_DESIGN_MODE":
			return { ...state, designMode: action.mode };

		case "SET_DESIGN_PHASE":
			return { ...state, designPhase: action.phase };

		default:
			return state;
	}
}

export interface GameRuntimeRef {
	getPhysics: () => Physics2D | null;
	getEntityManager: () => EntityManager | null;
	getGameState: () => any; // Typed as ReactGameState in implementation
	setVariable: (key: string, value: any) => void;
}

export type ShaderHotSwapHandler = (shaderId: string, source: string) => void;

export interface EphemeralSource {
	type: "database" | "offline";
	id: string;
}

interface EditorContextValue {
	gameId: string;
	state: EditorState;
	mode: EditorMode;
	timeMode: TimeMode;
	selectedEntityId: string | null;
	activeTab: EditorTab;
	sheetSnapPoint: SheetSnapPoint;
	document: GameDefinition;
	isDirty: boolean;
	canUndo: boolean;
	canRedo: boolean;
	isEphemeral: boolean;
	ephemeralSource: EphemeralSource | undefined;
	showAIRunPanel: boolean;

	// Preview Contexts
	previewContexts: PreviewContext[];
	activeContextId: string;
	focusedContextId: string;
	setActiveContext: (contextId: string) => void;
	setFocusedContext: (contextId: string) => void;

	setMode: (mode: EditorMode) => void;
	setTimeMode: (mode: TimeMode) => void;
	toggleMode: () => void;
	toggleAIRunPanel: () => void;
	selectEntity: (id: string | null) => void;
	setActiveTab: (tab: EditorTab) => void;
	setSheetSnapPoint: (point: SheetSnapPoint) => void;

	moveEntity: (id: string, x: number, y: number) => void;
	scaleEntity: (id: string, scale: number) => void;
	rotateEntity: (id: string, angle: number) => void;
	deleteEntity: (id: string) => void;
	duplicateEntity: (id: string) => void;
	addEntity: (entity: GameEntity) => void;
	addEntityFromPrefab: (templateId: string, x: number, y: number) => void;
	updateEntityProperty: (id: string, path: string, value: unknown) => void;
	setActiveAssets: (entries: Record<string, ResolvedAssetEntry>) => void;

	undo: () => void;
	redo: () => void;

	setCamera: (position?: Vec2, zoom?: number) => void;

	selectedDesignFrameId: string | null;
	selectedDesignElementId: string | null;
	designMode: DesignMode;
	designPhase: DesignPhase;
	selectDesignFrame: (frameId: string | null) => void;
	selectDesignElement: (elementId: string | null, frameId: string) => void;
	clearDesignSelection: () => void;
	setDesignMode: (mode: DesignMode) => void;
	setDesignPhase: (phase: DesignPhase) => void;

	runtimeRef: React.RefObject<GameRuntimeRef | null>;
	selectedEntity: GameEntity | null;

	livePreviewEnabled: boolean;
	setLivePreviewEnabled: (enabled: boolean) => void;

	registerShaderHandler: (handler: ShaderHotSwapHandler | null) => void;
	hotSwapShader: (shaderId: string, source: string) => void;

	readiness: {
		ready: boolean;
		errors: ValidationError[];
		warnings: ValidationWarning[];
		isChecking: boolean;
		isCompiling: boolean;
		checkNow: () => void;
		triggerCompile: () => void;
		lastChecked?: number;
		buildId?: string;
	};
}

const EditorContext = createContext<EditorContextValue | null>(null);

export interface EditorProviderProps {
	gameId: string;
	initialDefinition: GameDefinition;
	children: ReactNode;
	isEphemeral?: boolean;
	ephemeralSource?: EphemeralSource;
}

export function EditorProvider({
	gameId,
	initialDefinition,
	children,
	isEphemeral = false,
	ephemeralSource,
}: EditorProviderProps) {
	const runtimeRef = useRef<GameRuntimeRef | null>(null);
	const shaderHandlerRef = useRef<ShaderHotSwapHandler | null>(null);
	const [showAIRunPanel, setShowAIRunPanel] = useState(false);
	const [livePreviewEnabled, setLivePreviewEnabled] = useState(false);
	const readiness = usePackageReadiness(gameId);

	useEffect(() => {
		let cancelled = false;
		const loadFlag = async () => {
			const enabled = await getStorageItem("livePreviewEnabled", false);
			if (!cancelled) {
				setLivePreviewEnabled(enabled);
			}
		};
		void loadFlag();
		return () => {
			cancelled = true;
		};
	}, []);

	const registerShaderHandler = useCallback(
		(handler: ShaderHotSwapHandler | null) => {
			shaderHandlerRef.current = handler;
		},
		[],
	);

	const hotSwapShader = useCallback((shaderId: string, source: string) => {
		shaderHandlerRef.current?.(shaderId, source);
	}, []);

	const selectDesignFrame = useCallback((frameId: string | null) => {
		dispatch({ type: "SELECT_DESIGN_FRAME", frameId });
	}, []);

	const selectDesignElement = useCallback(
		(elementId: string | null, frameId: string) => {
			dispatch({ type: "SELECT_DESIGN_ELEMENT", elementId, frameId });
		},
		[],
	);

	const clearDesignSelection = useCallback(() => {
		dispatch({ type: "CLEAR_DESIGN_SELECTION" });
	}, []);

	const setDesignMode = useCallback((mode: DesignMode) => {
		dispatch({ type: "SET_DESIGN_MODE", mode });
	}, []);

	const setDesignPhase = useCallback((phase: DesignPhase) => {
		dispatch({ type: "SET_DESIGN_PHASE", phase });
	}, []);

	const initialState: EditorState = {
		mode: "author",
		timeMode: "paused",
		selectedEntityId: null,
		activeTab: "gallery",
		sheetSnapPoint: 0,
		document: initialDefinition,
		isDirty: false,
		undoStack: [],
		redoStack: [],
		cameraPosition: { x: 0, y: 0 },
		cameraZoom: initialDefinition.camera?.zoom ?? 1,
		previewContexts: [
			{
				id: "host",
				label: "Host",
				mode: "scene",
				runtimeIntent: "author",
			},
			{
				id: "player",
				label: "Player",
				mode: "scene",
				runtimeIntent: "live",
			},
		],
		activeContextId: "host",
		focusedContextId: "host",
		selectedDesignFrameId: null,
		selectedDesignElementId: null,
		designMode: "idle",
		designPhase: "idle",
	};

	const [state, dispatch] = useReducer(editorReducer, initialState);

	const setActiveContext = useCallback((contextId: string) => {
		dispatch({ type: "SET_ACTIVE_CONTEXT", contextId });
	}, []);

	const setFocusedContext = useCallback((contextId: string) => {
		dispatch({ type: "SET_FOCUSED_CONTEXT", contextId });
	}, []);

	const setMode = useCallback((mode: EditorMode) => {
		dispatch({ type: "SET_MODE", mode });
	}, []);

	const setTimeMode = useCallback((mode: TimeMode) => {
		dispatch({ type: "SET_TIME_MODE", mode });
	}, []);

	const toggleMode = useCallback(() => {
		dispatch({
			type: "SET_MODE",
			mode: state.mode === "author" ? "live" : "author",
		});
	}, [state.mode]);

	const toggleAIRunPanel = useCallback(() => {
		setShowAIRunPanel((prev) => !prev);
	}, []);

	const selectEntity = useCallback((id: string | null) => {
		dispatch({ type: "SELECT_ENTITY", entityId: id });
	}, []);

	const setActiveTab = useCallback((tab: EditorTab) => {
		dispatch({ type: "SET_ACTIVE_TAB", tab });
	}, []);

	const setSheetSnapPoint = useCallback((point: SheetSnapPoint) => {
		dispatch({ type: "SET_SHEET_SNAP_POINT", point });
	}, []);

	const moveEntity = useCallback((id: string, x: number, y: number) => {
		dispatch({ type: "MOVE_ENTITY", entityId: id, x, y });
	}, []);

	const scaleEntity = useCallback((id: string, scale: number) => {
		dispatch({ type: "SCALE_ENTITY", entityId: id, scale });
	}, []);

	const rotateEntity = useCallback((id: string, angle: number) => {
		dispatch({ type: "ROTATE_ENTITY", entityId: id, angle });
	}, []);

	const deleteEntity = useCallback((id: string) => {
		dispatch({ type: "DELETE_ENTITY", entityId: id });
	}, []);

	const duplicateEntity = useCallback((id: string) => {
		dispatch({ type: "DUPLICATE_ENTITY", entityId: id });
	}, []);

	const addEntity = useCallback((entity: GameEntity) => {
		dispatch({ type: "ADD_ENTITY", entity });
	}, []);

	const addEntityFromPrefab = useCallback(
		(prefabId: string, x: number, y: number) => {
			dispatch({ type: "ADD_ENTITY_FROM_PREFAB", prefabId, x, y });
		},
		[],
	);

	const updateEntityProperty = useCallback(
		(id: string, path: string, value: unknown) => {
			dispatch({ type: "UPDATE_ENTITY_PROPERTY", entityId: id, path, value });
		},
		[],
	);

	const undo = useCallback(() => {
		dispatch({ type: "UNDO" });
	}, []);

	const redo = useCallback(() => {
		dispatch({ type: "REDO" });
	}, []);

	const setCamera = useCallback((position?: Vec2, zoom?: number) => {
		dispatch({ type: "SET_CAMERA", position, zoom });
	}, []);

	const setActiveAssets = useCallback(
		(entries: Record<string, ResolvedAssetEntry>) => {
			console.log("[EditorProvider] setActiveAssets called", {
				entriesCount: Object.keys(entries).length,
			});
			dispatch({ type: "SET_ACTIVE_ASSETS", entries });
		},
		[],
	);

	const selectedEntity = useMemo((): GameEntity | null => {
		if (!state.selectedEntityId) return null;
		return (
			(state.document.entities.find((e) => e.id === state.selectedEntityId) as
				| GameEntity
				| undefined) ?? null
		);
	}, [state.selectedEntityId, state.document.entities]);

	const value: EditorContextValue = useMemo(
		() => ({
			gameId,
			state,
			mode: state.mode,
			timeMode: state.timeMode,
			selectedEntityId: state.selectedEntityId,
			activeTab: state.activeTab,
			sheetSnapPoint: state.sheetSnapPoint,
			document: state.document,
			isDirty: state.isDirty,
			canUndo: state.undoStack.length > 0,
			canRedo: state.redoStack.length > 0,
			isEphemeral,
			ephemeralSource,
			showAIRunPanel,
			previewContexts: state.previewContexts,
			activeContextId: state.activeContextId,
			focusedContextId: state.focusedContextId,
			setActiveContext,
			setFocusedContext,

			setMode,
			setTimeMode,
			toggleMode,
			toggleAIRunPanel,
			selectEntity,
			setActiveTab,
			setSheetSnapPoint,

			moveEntity,
			scaleEntity,
			rotateEntity,
			deleteEntity,
			duplicateEntity,
			addEntity,
			addEntityFromPrefab,
			updateEntityProperty,
			setActiveAssets,

			undo,
			redo,

			setCamera,

			selectedDesignFrameId: state.selectedDesignFrameId,
			selectedDesignElementId: state.selectedDesignElementId,
			designMode: state.designMode,
			designPhase: state.designPhase,
			selectDesignFrame,
			selectDesignElement,
			clearDesignSelection,
			setDesignMode,
			setDesignPhase,

			runtimeRef,
			selectedEntity,

			livePreviewEnabled,
			setLivePreviewEnabled,

			registerShaderHandler,
			hotSwapShader,
			readiness: {
				ready: readiness.ready,
				errors: readiness.errors,
				warnings: readiness.warnings,
				isChecking: readiness.isChecking,
				isCompiling: readiness.isCompiling,
				checkNow: readiness.checkNow,
				triggerCompile: readiness.triggerCompile,
				lastChecked: readiness.lastChecked,
				buildId: readiness.buildId,
			},
		}),
		[
			gameId,
			state,
			setMode,
			setTimeMode,
			toggleMode,
			selectEntity,
			setActiveTab,
			setSheetSnapPoint,
			moveEntity,
			scaleEntity,
			rotateEntity,
			deleteEntity,
			duplicateEntity,
			addEntity,
			addEntityFromPrefab,
			updateEntityProperty,
			setActiveAssets,
			undo,
			redo,
			setCamera,
			selectedEntity,
			isEphemeral,
			ephemeralSource,
			showAIRunPanel,
			toggleAIRunPanel,
			setActiveContext,
			setFocusedContext,
			livePreviewEnabled,
			registerShaderHandler,
			hotSwapShader,
			readiness,
			selectDesignFrame,
			selectDesignElement,
			clearDesignSelection,
			setDesignMode,
			setDesignPhase,
		],
	);

	return (
		<EditorContext.Provider value={value}>{children}</EditorContext.Provider>
	);
}

export function useEditor(): EditorContextValue {
	const context = useContext(EditorContext);
	if (!context) {
		throw new Error("useEditor must be used within an EditorProvider");
	}
	return context;
}
