// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface GodotDriverOptions {
  /** Default: 9876 */
  port?: number;
  /** Absolute path to Godot binary. Auto-detected if omitted. */
  godotPath?: string;
  /** Absolute path to the Godot project directory. Default: `<repoRoot>/godot_project` */
  projectPath?: string;
  /** Scene resource path to load. Default: `res://scenes/HeadlessTest.tscn` */
  scenePath?: string;
  /** Timeout in ms per `call()`. Default: 5000 */
  callTimeout?: number;
  /** Timeout in ms for the "ready" event during `start()`. Default: 10000 */
  startTimeout?: number;
  /** Suppress Godot stdout/stderr forwarding. Default: false */
  quiet?: boolean;
}

// ---------------------------------------------------------------------------
// Wire protocol — outgoing (driver -> Godot)
// ---------------------------------------------------------------------------

export interface BridgeRequest {
  id: number;
  method: string;
  args: unknown[];
}

// ---------------------------------------------------------------------------
// Wire protocol — incoming (Godot -> driver)
// ---------------------------------------------------------------------------

export interface BridgeResponseOk {
  id: number;
  result: unknown;
}

export interface BridgeResponseError {
  id: number;
  error: string;
}

export type BridgeResponse = BridgeResponseOk | BridgeResponseError;

export interface BridgeEvent {
  event: string;
}

export type BridgeIncoming = BridgeResponse | BridgeEvent;

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isBridgeEvent(msg: BridgeIncoming): msg is BridgeEvent {
  return "event" in msg && typeof (msg as BridgeEvent).event === "string";
}

export function isBridgeError(msg: BridgeIncoming): msg is BridgeResponseError {
  return "error" in msg && typeof (msg as BridgeResponseError).error === "string";
}

export function isBridgeOk(msg: BridgeIncoming): msg is BridgeResponseOk {
  return "id" in msg && "result" in msg;
}

// ---------------------------------------------------------------------------
// Driver state
// ---------------------------------------------------------------------------

export type DriverState = "idle" | "starting" | "ready" | "stopping" | "stopped" | "error";
