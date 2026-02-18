export function createCallbackManager<T extends (...args: any[]) => void>() {
  const callbacks: T[] = [];

  const register = (callback: T): (() => void) => {
    callbacks.push(callback);
    return () => {
      const index = callbacks.indexOf(callback);
      if (index >= 0) callbacks.splice(index, 1);
    };
  };

  const invoke = (...args: Parameters<T>) => {
    for (const cb of callbacks) cb(...args);
  };

  const clear = () => {
    callbacks.length = 0;
  };

  return { register, invoke, clear, callbacks };
}

export function generateEntityId(prefabId: string): string {
  return `${prefabId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
