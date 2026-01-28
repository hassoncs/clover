import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export interface InspectorState {
  selectedEntityId: string | null;
  hoveredEntityId: string | null;
  inspectMode: boolean;
  expandedNodes: Set<string>;
}

export interface InspectorContextValue extends InspectorState {
  selectEntity: (id: string | null) => void;
  hoverEntity: (id: string | null) => void;
  toggleInspectMode: () => void;
  isNodeExpanded: (id: string) => boolean;
  toggleNodeExpanded: (id: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
}

const InspectorContext = createContext<InspectorContextValue | null>(null);

export function InspectorProvider({ children }: { children: ReactNode }) {
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [hoveredEntityId, setHoveredEntityId] = useState<string | null>(null);
  const [inspectMode, setInspectMode] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));

  const selectEntity = useCallback((id: string | null) => {
    setSelectedEntityId(id);
  }, []);

  const hoverEntity = useCallback((id: string | null) => {
    setHoveredEntityId(id);
  }, []);

  const toggleInspectMode = useCallback(() => {
    setInspectMode((prev) => !prev);
  }, []);

  const isNodeExpanded = useCallback((id: string) => {
    return expandedNodes.has(id);
  }, [expandedNodes]);

  const toggleNodeExpanded = useCallback((id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedNodes(new Set(['root']));
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set());
  }, []);

  const value: InspectorContextValue = {
    selectedEntityId,
    hoveredEntityId,
    inspectMode,
    expandedNodes,
    selectEntity,
    hoverEntity,
    toggleInspectMode,
    isNodeExpanded,
    toggleNodeExpanded,
    expandAll,
    collapseAll,
  };

  return (
    <InspectorContext.Provider value={value}>
      {children}
    </InspectorContext.Provider>
  );
}

export function useInspector() {
  const context = useContext(InspectorContext);
  if (!context) {
    throw new Error('useInspector must be used within InspectorProvider');
  }
  return context;
}
