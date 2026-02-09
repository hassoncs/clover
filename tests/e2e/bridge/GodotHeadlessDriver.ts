import { spawn, execSync } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { createConnection } from "node:net";
import type { Socket } from "node:net";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { EventEmitter } from "node:events";

import type {
  GodotDriverOptions,
  BridgeRequest,
  BridgeIncoming,
  DriverState,
} from "./types.js";
import { isBridgeEvent, isBridgeError } from "./types.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_PORT = 9876;
const DEFAULT_CALL_TIMEOUT = 5_000;
const DEFAULT_START_TIMEOUT = 10_000;
const DEFAULT_SCENE = "res://scenes/HeadlessTest.tscn";
const CONNECT_RETRY_INTERVAL = 100;
const LOG_PREFIX = "[Godot]";

const GODOT_SEARCH_PATHS = [
  "/Applications/Godot-4.5.app/Contents/MacOS/Godot",
  "vendor/godot/bin/godot.macos.editor.arm64",
  "/Applications/Godot-4.4.app/Contents/MacOS/Godot",
  "/Applications/Godot-4.3.app/Contents/MacOS/Godot",
  "godot",
  "/opt/homebrew/bin/godot",
  "/usr/local/bin/godot",
  "/Applications/Godot.app/Contents/MacOS/Godot",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findRepoRoot(): string {
  const thisFile = fileURLToPath(import.meta.url);
  // tests/e2e/bridge/GodotHeadlessDriver.ts → repo root is 4 levels up
  return resolve(dirname(thisFile), "..", "..", "..");
}

function findGodot(): string {
  for (const candidate of GODOT_SEARCH_PATHS) {
    try {
      execSync(`"${candidate}" --version`, { stdio: "ignore" });
      return candidate;
    } catch {
      continue;
    }
  }
  throw new Error(
    "Godot not found. Install with: brew install godot\n" +
      "Or download from: https://godotengine.org/download",
  );
}

// ---------------------------------------------------------------------------
// Pending request tracking
// ---------------------------------------------------------------------------

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

// ---------------------------------------------------------------------------
// Driver
// ---------------------------------------------------------------------------

export default class GodotHeadlessDriver extends EventEmitter {
  private readonly port: number;
  private readonly godotPath: string;
  private readonly projectPath: string;
  private readonly scenePath: string;
  private readonly callTimeout: number;
  private readonly startTimeout: number;
  private readonly quiet: boolean;

  private state: DriverState = "idle";
  private nextId = 1;
  private process: ChildProcess | null = null;
  private socket: Socket | null = null;
  private receiveBuffer = "";
  private readonly pending = new Map<number, PendingRequest>();

  constructor(options: GodotDriverOptions = {}) {
    super();
    const repoRoot = findRepoRoot();
    this.port = options.port ?? DEFAULT_PORT;
    this.godotPath = options.godotPath ?? findGodot();
    this.projectPath = options.projectPath ?? resolve(repoRoot, "godot_project");
    this.scenePath = options.scenePath ?? DEFAULT_SCENE;
    this.callTimeout = options.callTimeout ?? DEFAULT_CALL_TIMEOUT;
    this.startTimeout = options.startTimeout ?? DEFAULT_START_TIMEOUT;
    this.quiet = options.quiet ?? false;
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  /** Launch Godot in headless mode and wait for the bridge "ready" event. */
  async start(): Promise<void> {
    if (this.state !== "idle") {
      throw new Error(`Cannot start driver in state "${this.state}"`);
    }
    this.state = "starting";

    this.spawnGodot();

    await this.connectTcp();

    await this.waitForReady();

    this.state = "ready";
  }

  /** Shut down the TCP connection and kill the Godot process. */
  async stop(): Promise<void> {
    if (this.state === "stopped" || this.state === "stopping") return;
    this.state = "stopping";

    this.rejectAllPending(new Error("Driver stopping"));

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.destroy();
      this.socket = null;
    }

    await this.killGodot();

    this.state = "stopped";
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Send a bridge method call and wait for the correlated response.
   * Rejects if the response is an error or the call times out.
   */
  async call(method: string, args: unknown[] = []): Promise<unknown> {
    if (this.state !== "ready") {
      throw new Error(`Cannot call "${method}" — driver state is "${this.state}"`);
    }

    const id = this.nextId++;
    const request: BridgeRequest = { id, method, args };

    return new Promise<unknown>((res, rej) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        rej(new Error(`Bridge call "${method}" (id=${id}) timed out after ${this.callTimeout}ms`));
      }, this.callTimeout);

      this.pending.set(id, { resolve: res, reject: rej, timer });
      this.sendJson(request);
    });
  }

  /** Convenience: ping the bridge to verify connectivity. */
  async ping(): Promise<unknown> {
    return this.call("_ping");
  }

  /** Current lifecycle state. */
  getState(): DriverState {
    return this.state;
  }

  // -------------------------------------------------------------------------
  // Process management
  // -------------------------------------------------------------------------

  private spawnGodot(): void {
    const args = [
      "--headless",
      "--path",
      this.projectPath,
      this.scenePath,
    ];

    this.process = spawn(this.godotPath, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    this.process.stdout?.on("data", (chunk: Buffer) => {
      if (!this.quiet) {
        const lines = chunk.toString().trimEnd().split("\n");
        for (const line of lines) {
          console.log(`${LOG_PREFIX} ${line}`);
        }
      }
    });

    this.process.stderr?.on("data", (chunk: Buffer) => {
      if (!this.quiet) {
        const lines = chunk.toString().trimEnd().split("\n");
        for (const line of lines) {
          console.error(`${LOG_PREFIX} ${line}`);
        }
      }
    });

    this.process.on("exit", (code, signal) => {
      if (this.state !== "stopping" && this.state !== "stopped") {
        this.state = "error";
        const reason = signal ? `signal ${signal}` : `code ${code}`;
        const err = new Error(`Godot process exited unexpectedly (${reason})`);
        this.rejectAllPending(err);
        this.emit("error", err);
      }
    });
  }

  private killGodot(): Promise<void> {
    return new Promise<void>((res) => {
      if (!this.process || this.process.exitCode !== null) {
        res();
        return;
      }

      const forceKillTimer = setTimeout(() => {
        this.process?.kill("SIGKILL");
      }, 2_000);

      this.process.once("exit", () => {
        clearTimeout(forceKillTimer);
        res();
      });

      this.process.kill("SIGTERM");
    });
  }

  // -------------------------------------------------------------------------
  // TCP connection
  // -------------------------------------------------------------------------

  private connectTcp(): Promise<void> {
    return new Promise<void>((res, rej) => {
      const deadline = Date.now() + this.startTimeout;

      const attempt = (): void => {
        if (Date.now() > deadline) {
          rej(new Error(`TCP connection to Godot timed out after ${this.startTimeout}ms`));
          return;
        }

        // Check if Godot process died before we connected
        if (this.process && this.process.exitCode !== null) {
          rej(new Error(`Godot process exited (code ${this.process.exitCode}) before TCP connected`));
          return;
        }

        const sock = createConnection({ host: "127.0.0.1", port: this.port }, () => {
          this.socket = sock;
          this.setupSocketHandlers();
          res();
        });

        sock.once("error", () => {
          sock.destroy();
          setTimeout(attempt, CONNECT_RETRY_INTERVAL);
        });
      };

      attempt();
    });
  }

  private setupSocketHandlers(): void {
    if (!this.socket) return;

    this.socket.on("data", (chunk: Buffer) => {
      this.receiveBuffer += chunk.toString();
      this.processBuffer();
    });

    this.socket.on("close", () => {
      if (this.state === "ready") {
        this.state = "error";
        const err = new Error("TCP connection closed unexpectedly");
        this.rejectAllPending(err);
        this.emit("error", err);
      }
    });

    this.socket.on("error", (err: Error) => {
      if (this.state === "ready") {
        this.state = "error";
        this.rejectAllPending(err);
        this.emit("error", err);
      }
    });
  }

  // -------------------------------------------------------------------------
  // NDJSON framing
  // -------------------------------------------------------------------------

  private processBuffer(): void {
    let newlineIdx = this.receiveBuffer.indexOf("\n");
    while (newlineIdx !== -1) {
      const line = this.receiveBuffer.slice(0, newlineIdx).trim();
      this.receiveBuffer = this.receiveBuffer.slice(newlineIdx + 1);

      if (line.length > 0) {
        try {
          const msg: BridgeIncoming = JSON.parse(line);
          this.handleMessage(msg);
        } catch {
          console.error(`${LOG_PREFIX} Failed to parse NDJSON line: ${line}`);
        }
      }

      newlineIdx = this.receiveBuffer.indexOf("\n");
    }
  }

  private handleMessage(msg: BridgeIncoming): void {
    if (isBridgeEvent(msg)) {
      this.emit("event", msg.event);
      return;
    }

    if (!("id" in msg) || typeof msg.id !== "number") {
      console.error(`${LOG_PREFIX} Received message without valid id:`, msg);
      return;
    }

    const pending = this.pending.get(msg.id);
    if (!pending) {
      console.error(`${LOG_PREFIX} Received response for unknown id ${msg.id}`);
      return;
    }

    this.pending.delete(msg.id);
    clearTimeout(pending.timer);

    if (isBridgeError(msg)) {
      pending.reject(new Error(`Bridge error (id=${msg.id}): ${msg.error}`));
    } else {
      pending.resolve(msg.result);
    }
  }

  // -------------------------------------------------------------------------
  // Ready handshake
  // -------------------------------------------------------------------------

  private waitForReady(): Promise<void> {
    return new Promise<void>((res, rej) => {
      const timer = setTimeout(() => {
        this.removeListener("event", onEvent);
        rej(new Error(`Godot did not send "ready" event within ${this.startTimeout}ms`));
      }, this.startTimeout);

      const onEvent = (eventName: string): void => {
        if (eventName === "ready") {
          clearTimeout(timer);
          this.removeListener("event", onEvent);
          res();
        }
      };

      this.on("event", onEvent);
    });
  }

  // -------------------------------------------------------------------------
  // Utilities
  // -------------------------------------------------------------------------

  private sendJson(obj: BridgeRequest): void {
    if (!this.socket || this.socket.destroyed) {
      throw new Error("Cannot send — TCP socket is not connected");
    }
    this.socket.write(JSON.stringify(obj) + "\n");
  }

  private rejectAllPending(err: Error): void {
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(err);
      this.pending.delete(id);
    }
  }
}
