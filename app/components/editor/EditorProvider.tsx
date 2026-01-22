import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useRef,
  useMemo,
  type ReactNode,
} from "react";
import type { GameDefinition, GameEntity } from "@slopcade/shared";
import type { RuntimeEntity } from "@/lib/game-engine/types";
import type { Physics2D } from "@/lib/physics2d";
import type { EntityManager } from "@/lib/game-engine/EntityManager";

export type EditorMode = "edit" | "playtest";
export type EditorTab = "assets" | "properties" | "layers" | "debug";
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

interface EditorState {
  mode: EditorMode;
  selectedEntityId: string | null;
  activeTab: EditorTab;
  sheetSnapPoint: SheetSnapPoint;
  document: GameDefinition;
  isDirty: boolean;
  undoStack: EditorAction[];
  redoStack: EditorAction[];
  cameraPosition: Vec2;
  cameraZoom: number;
}

type EditorStateAction =
  | { type: "SET_MODE"; mode: EditorMode }
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
  | { type: "ADD_ENTITY_FROM_TEMPLATE"; templateId: string; x: number; y: number }
  | { type: "UPDATE_ENTITY_PROPERTY"; entityId: string; path: string; value: unknown };

const MAX_HISTORY = 50;

function editorReducer(state: EditorState, action: EditorStateAction): EditorState {
  switch (action.type) {
    case "SET_MODE":
      return { ...state, mode: action.mode };

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
      const newUndoStack = [...state.undoStack, action.action].slice(-MAX_HISTORY);
      return { ...state, undoStack: newUndoStack, redoStack: [] };
    }

    case "UNDO": {
      if (state.undoStack.length === 0) return state;
      const lastAction = state.undoStack[state.undoStack.length - 1];
      const newUndoStack = state.undoStack.slice(0, -1);
      const newRedoStack = [...state.redoStack, lastAction];
      return { ...state, undoStack: newUndoStack, redoStack: newRedoStack };
    }

    case "REDO": {
      if (state.redoStack.length === 0) return state;
      const lastAction = state.redoStack[state.redoStack.length - 1];
      const newRedoStack = state.redoStack.slice(0, -1);
      const newUndoStack = [...state.undoStack, lastAction];
      return { ...state, undoStack: newUndoStack, redoStack: newRedoStack };
    }

    case "SET_CAMERA":
      return {
        ...state,
        cameraPosition: action.position ?? state.cameraPosition,
        cameraZoom: action.zoom ?? state.cameraZoom,
      };

    case "MOVE_ENTITY": {
      const newDocument = { ...state.document };
      const entityIndex = newDocument.entities.findIndex((e) => e.id === action.entityId);
      if (entityIndex === -1) return state;
      
      const entity = { ...newDocument.entities[entityIndex] };
      const oldTransform = entity.transform;
      entity.transform = { ...oldTransform, x: action.x, y: action.y };
      newDocument.entities = [...newDocument.entities];
      newDocument.entities[entityIndex] = entity;
      
      return {
        ...state,
        document: newDocument,
        isDirty: true,
        undoStack: [
          ...state.undoStack,
          {
            type: "MOVE_ENTITY",
            entityId: action.entityId,
            from: { x: oldTransform.x, y: oldTransform.y },
            to: { x: action.x, y: action.y },
          },
        ].slice(-MAX_HISTORY),
        redoStack: [],
      };
    }

    case "SCALE_ENTITY": {
      const newDocument = { ...state.document };
      const entityIndex = newDocument.entities.findIndex((e) => e.id === action.entityId);
      if (entityIndex === -1) return state;
      
      const entity = { ...newDocument.entities[entityIndex] };
      const oldScale = entity.transform.scaleX ?? 1;
      entity.transform = { ...entity.transform, scaleX: action.scale, scaleY: action.scale };
      newDocument.entities = [...newDocument.entities];
      newDocument.entities[entityIndex] = entity;
      
      return {
        ...state,
        document: newDocument,
        isDirty: true,
        undoStack: [
          ...state.undoStack,
          {
            type: "SCALE_ENTITY",
            entityId: action.entityId,
            from: oldScale,
            to: action.scale,
          },
        ].slice(-MAX_HISTORY),
        redoStack: [],
      };
    }

    case "ROTATE_ENTITY": {
      const newDocument = { ...state.document };
      const entityIndex = newDocument.entities.findIndex((e) => e.id === action.entityId);
      if (entityIndex === -1) return state;
      
      const entity = { ...newDocument.entities[entityIndex] };
      const oldAngle = entity.transform.angle ?? 0;
      entity.transform = { ...entity.transform, angle: action.angle };
      newDocument.entities = [...newDocument.entities];
      newDocument.entities[entityIndex] = entity;
      
      return {
        ...state,
        document: newDocument,
        isDirty: true,
        undoStack: [
          ...state.undoStack,
          {
            type: "ROTATE_ENTITY",
            entityId: action.entityId,
            from: oldAngle,
            to: action.angle,
          },
        ].slice(-MAX_HISTORY),
        redoStack: [],
      };
    }

    case "DELETE_ENTITY": {
      const newDocument = { ...state.document };
      const entityIndex = newDocument.entities.findIndex((e) => e.id === action.entityId);
      if (entityIndex === -1) return state;
      
      const deletedEntity = newDocument.entities[entityIndex];
      newDocument.entities = newDocument.entities.filter((e) => e.id !== action.entityId);
      
      return {
        ...state,
        document: newDocument,
        isDirty: true,
        selectedEntityId: state.selectedEntityId === action.entityId ? null : state.selectedEntityId,
        undoStack: [
          ...state.undoStack,
          {
            type: "DELETE_ENTITY",
            entityId: action.entityId,
            entity: deletedEntity,
          },
        ].slice(-MAX_HISTORY),
        redoStack: [],
      };
    }

    case "DUPLICATE_ENTITY": {
      const newDocument = { ...state.document };
      const entityIndex = newDocument.entities.findIndex((e) => e.id === action.entityId);
      if (entityIndex === -1) return state;
      
      const originalEntity = newDocument.entities[entityIndex];
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
        undoStack: [
          ...state.undoStack,
          {
            type: "ADD_ENTITY",
            entityId: newId,
            entity: duplicatedEntity,
          },
        ].slice(-MAX_HISTORY),
        redoStack: [],
      };
    }

    case "ADD_ENTITY": {
      const newDocument = { ...state.document };
      newDocument.entities = [...newDocument.entities, action.entity];
      
      return {
        ...state,
        document: newDocument,
        isDirty: true,
        selectedEntityId: action.entity.id,
        undoStack: [
          ...state.undoStack,
          {
            type: "ADD_ENTITY",
            entityId: action.entity.id,
            entity: action.entity,
          },
        ].slice(-MAX_HISTORY),
        redoStack: [],
      };
    }

    case "ADD_ENTITY_FROM_TEMPLATE": {
      const template = state.document.templates[action.templateId];
      if (!template) return state;
      
      const newId = `${action.templateId}_${Date.now()}`;
      const newEntity: GameEntity = {
        id: newId,
        name: action.templateId,
        template: action.templateId,
        transform: {
          x: action.x,
          y: action.y,
          angle: 0,
          scaleX: 1,
          scaleY: 1,
        },
        sprite: template.sprite,
        physics: template.physics,
        behaviors: template.behaviors,
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
        undoStack: [
          ...state.undoStack,
          {
            type: "ADD_ENTITY",
            entityId: newId,
            entity: newEntity,
          },
        ].slice(-MAX_HISTORY),
        redoStack: [],
      };
    }

    case "UPDATE_ENTITY_PROPERTY": {
      const newDocument = { ...state.document };
      const entityIndex = newDocument.entities.findIndex((e) => e.id === action.entityId);
      if (entityIndex === -1) return state;
      
      const entity = JSON.parse(JSON.stringify(newDocument.entities[entityIndex])) as GameEntity;
      const pathParts = action.path.split(".");
      let target: Record<string, unknown> = entity as unknown as Record<string, unknown>;
      
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (!(part in target) || target[part] === null || target[part] === undefined) {
          target[part] = {};
        }
        target = target[part] as Record<string, unknown>;
      }
      
      const lastPart = pathParts[pathParts.length - 1];
      const oldValue = target[lastPart];
      target[lastPart] = action.value;
      
      newDocument.entities = [...newDocument.entities];
      newDocument.entities[entityIndex] = entity;
      
      return {
        ...state,
        document: newDocument,
        isDirty: true,
        undoStack: [
          ...state.undoStack,
          {
            type: "UPDATE_ENTITY_PROPERTY",
            entityId: action.entityId,
            path: action.path,
            from: oldValue,
            to: action.value,
          },
        ].slice(-MAX_HISTORY),
        redoStack: [],
      };
    }

    default:
      return state;
  }
}

export interface GameRuntimeRef {
  getPhysics: () => Physics2D | null;
  getEntityManager: () => EntityManager | null;
}

interface EditorContextValue {
  state: EditorState;
  mode: EditorMode;
  selectedEntityId: string | null;
  activeTab: EditorTab;
  sheetSnapPoint: SheetSnapPoint;
  document: GameDefinition;
  isDirty: boolean;
  canUndo: boolean;
  canRedo: boolean;

  setMode: (mode: EditorMode) => void;
  toggleMode: () => void;
  selectEntity: (id: string | null) => void;
  setActiveTab: (tab: EditorTab) => void;
  setSheetSnapPoint: (point: SheetSnapPoint) => void;

  moveEntity: (id: string, x: number, y: number) => void;
  scaleEntity: (id: string, scale: number) => void;
  rotateEntity: (id: string, angle: number) => void;
  deleteEntity: (id: string) => void;
  duplicateEntity: (id: string) => void;
  addEntity: (entity: GameEntity) => void;
  addEntityFromTemplate: (templateId: string, x: number, y: number) => void;
  updateEntityProperty: (id: string, path: string, value: unknown) => void;

  undo: () => void;
  redo: () => void;

  setCamera: (position?: Vec2, zoom?: number) => void;

  runtimeRef: React.RefObject<GameRuntimeRef | null>;
  selectedEntity: GameEntity | null;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export interface EditorProviderProps {
  gameId: string;
  initialDefinition: GameDefinition;
  children: ReactNode;
}

export function EditorProvider({
  gameId,
  initialDefinition,
  children,
}: EditorProviderProps) {
  const runtimeRef = useRef<GameRuntimeRef | null>(null);

  const initialState: EditorState = {
    mode: "edit",
    selectedEntityId: null,
    activeTab: "assets",
    sheetSnapPoint: 0,
    document: initialDefinition,
    isDirty: false,
    undoStack: [],
    redoStack: [],
    cameraPosition: { x: 0, y: 0 },
    cameraZoom: initialDefinition.camera?.zoom ?? 1,
  };

  const [state, dispatch] = useReducer(editorReducer, initialState);

  const setMode = useCallback((mode: EditorMode) => {
    dispatch({ type: "SET_MODE", mode });
  }, []);

  const toggleMode = useCallback(() => {
    dispatch({ type: "SET_MODE", mode: state.mode === "edit" ? "playtest" : "edit" });
  }, [state.mode]);

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

  const addEntityFromTemplate = useCallback((templateId: string, x: number, y: number) => {
    dispatch({ type: "ADD_ENTITY_FROM_TEMPLATE", templateId, x, y });
  }, []);

  const updateEntityProperty = useCallback((id: string, path: string, value: unknown) => {
    dispatch({ type: "UPDATE_ENTITY_PROPERTY", entityId: id, path, value });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: "UNDO" });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: "REDO" });
  }, []);

  const setCamera = useCallback((position?: Vec2, zoom?: number) => {
    dispatch({ type: "SET_CAMERA", position, zoom });
  }, []);

  const selectedEntity = useMemo(() => {
    if (!state.selectedEntityId) return null;
    return state.document.entities.find((e) => e.id === state.selectedEntityId) ?? null;
  }, [state.selectedEntityId, state.document.entities]);

  const value: EditorContextValue = useMemo(
    () => ({
      state,
      mode: state.mode,
      selectedEntityId: state.selectedEntityId,
      activeTab: state.activeTab,
      sheetSnapPoint: state.sheetSnapPoint,
      document: state.document,
      isDirty: state.isDirty,
      canUndo: state.undoStack.length > 0,
      canRedo: state.redoStack.length > 0,

      setMode,
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
      addEntityFromTemplate,
      updateEntityProperty,

      undo,
      redo,

      setCamera,

      runtimeRef,
      selectedEntity,
    }),
    [
      state,
      setMode,
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
      addEntityFromTemplate,
      updateEntityProperty,
      undo,
      redo,
      setCamera,
      selectedEntity,
    ]
  );

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor(): EditorContextValue {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error("useEditor must be used within an EditorProvider");
  }
  return context;
}
