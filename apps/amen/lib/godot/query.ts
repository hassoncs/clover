/**
 * Shared async query system for Godot Bridge communication
 *
 * Provides Promise-based querying from TypeScript to GDScript via
 * a request/response pattern. Works with the QuerySystem.gd on the Godot side.
 */

export interface GodotBridgeBase {
  query?: (requestId: string, method: string, argsJson: string) => void;
}

interface QueryResolver {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

interface GodotQueryWindow extends Window {
  _godotPendingQueries?: Map<string, QueryResolver>;
  _godotQueryIdCounter?: number;
  _godotQueryResolve?: (requestId: string, resultJson: string) => void;
}

let resolverSetup = false;

function getPendingQueries(): Map<string, QueryResolver> {
  const win = window as GodotQueryWindow;
  if (!win._godotPendingQueries) {
    win._godotPendingQueries = new Map();
  }
  return win._godotPendingQueries;
}

function getNextQueryId(): string {
  const win = window as GodotQueryWindow;
  win._godotQueryIdCounter = (win._godotQueryIdCounter || 0) + 1;
  return `q_${Date.now()}_${win._godotQueryIdCounter}`;
}

/**
 * Setup the global query resolver that receives responses from Godot.
 * Called automatically by queryAsync, but can be called early to ensure setup.
 */
export function setupQueryResolver(): void {
  if (resolverSetup) return;

  const win = window as GodotQueryWindow;

  // Always set up the resolver - don't assume an existing one is correct
  win._godotQueryResolve = (requestId: string, resultJson: string) => {
    const pendingQueries = getPendingQueries();
    const pending = pendingQueries.get(requestId);
    if (pending) {
      clearTimeout(pending.timeout);
      pendingQueries.delete(requestId);
      try {
        const result = JSON.parse(resultJson);
        pending.resolve(result);
      } catch (e) {
        pending.reject(new Error(`Failed to parse query result: ${e}`));
      }
    }
  };

  resolverSetup = true;
}

/**
 * Get the Godot bridge from either iframe (web) or window (direct)
 */
export function getGodotBridge(): GodotBridgeBase | null {
  // Try iframe first (Godot runs in iframe on web)
  const iframe = document.querySelector(
    'iframe[title="Godot Game Engine"]'
  ) as HTMLIFrameElement | null;

  if (iframe?.contentWindow) {
    const win = iframe.contentWindow as { GodotBridge?: GodotBridgeBase };
    return win.GodotBridge ?? null;
  }

  // Fallback to window (direct embedding)
  const win = window as unknown as { GodotBridge?: GodotBridgeBase };
  return win.GodotBridge ?? null;
}

export interface QueryOptions {
  timeoutMs?: number;
}

/**
 * Execute an async query to Godot and wait for the response.
 *
 * @param bridge - The Godot bridge instance (must have .query method)
 * @param method - Query method name (e.g., 'getSceneSnapshot', 'findEntities')
 * @param args - Arguments to pass to the query method
 * @param options - Query options (timeout)
 * @returns Promise resolving to the query result
 */
export function queryAsync<T>(
  bridge: GodotBridgeBase,
  method: string,
  args: unknown[] = [],
  options: QueryOptions = {}
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!bridge.query) {
      reject(
        new Error(
          "Godot bridge does not support async queries - rebuild Godot export"
        )
      );
      return;
    }

    setupQueryResolver();

    const pendingQueries = getPendingQueries();
    const requestId = getNextQueryId();
    const timeoutMs = options.timeoutMs ?? 5000;

    const timeout = setTimeout(() => {
      pendingQueries.delete(requestId);
      reject(new Error(`Query timeout: ${method} (${requestId})`));
    }, timeoutMs);

    pendingQueries.set(requestId, {
      resolve: (result: unknown) => resolve(result as T),
      reject,
      timeout,
    });

    bridge.query(requestId, method, JSON.stringify(args));
  });
}

/**
 * Convenience function to query the default Godot bridge.
 * Auto-discovers the bridge from iframe or window.
 */
export async function queryGodot<T>(
  method: string,
  args: unknown[] = [],
  options: QueryOptions = {}
): Promise<T> {
  const bridge = getGodotBridge();
  if (!bridge) {
    throw new Error("Godot bridge not found");
  }
  return queryAsync<T>(bridge, method, args, options);
}
