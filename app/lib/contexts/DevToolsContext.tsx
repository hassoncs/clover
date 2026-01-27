import { createContext, useContext, type ReactNode } from 'react';
import { useDevTools, type DevToolsState } from '../hooks/useDevTools';

interface DevToolsContextValue {
  state: DevToolsState;
  isLoading: boolean;
  toggleInputDebug: () => void;
  togglePhysicsShapes: () => void;
  toggleFPS: () => void;
  toggleExpanded: () => void;
}

const DevToolsContext = createContext<DevToolsContextValue | null>(null);

export function DevToolsProvider({ children }: { children: ReactNode }) {
  const devTools = useDevTools();

  return (
    <DevToolsContext.Provider value={devTools}>
      {children}
    </DevToolsContext.Provider>
  );
}

export function useDevToolsContext() {
  const context = useContext(DevToolsContext);
  if (!context) {
    throw new Error('useDevToolsContext must be used within DevToolsProvider');
  }
  return context;
}

export function useDevToolsOptional() {
  return useContext(DevToolsContext);
}
