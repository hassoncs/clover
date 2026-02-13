import type { Browser, Page } from "playwright";

export const DEFAULT_BASE_URL = "http://localhost:8085";
export const DEFAULT_TIMEOUT = 30000;

export interface DebugBridge {
	enabled: boolean;
	getSnapshot: (opts: {
		detail: string;
		filterTemplate?: string;
		filterTags?: string[];
	}) => Promise<unknown>;
	simulateTap: (x: number, y: number) => Promise<unknown>;
	simulateDrag: (
		sx: number,
		sy: number,
		ex: number,
		ey: number,
		duration: number,
	) => Promise<void>;
	waitForStationary: (
		id: string,
		timeout: number,
		epsilon: number,
	) => Promise<unknown>;
	waitForCollision: (a: string, b: string, timeout: number) => Promise<unknown>;
	assert: {
		exists: (id: string) => unknown;
		nearPosition: (
			id: string,
			pos: { x: number; y: number },
			tolerance: number,
		) => unknown;
		hasVelocity: (id: string, threshold: number) => unknown;
		isStationary: (id: string, threshold: number) => unknown;
		collisionOccurred: (a: string, b: string) => unknown;
		hasTag: (id: string, tag: string) => unknown;
		entityCount: (tag: string, count: number) => unknown;
	};
}

export interface TimeState {
	paused: boolean;
	timeScale: number;
	frame: number;
	elapsed: number;
	gameState: string;
	score: number;
	lives: number;
}

export interface StepResult {
	frame: number;
	elapsed: number;
	gameState: string;
	score: number;
	lives: number;
}

export interface SlopcadeDebugBridgeInterface {
	ready: boolean;
	gameId: string;
	paused: boolean;
	timeScale: number;
	frame: number;
	elapsed: number;
	pause(): Promise<void> | void;
	resume(): Promise<void> | void;
	step(frames?: number): Promise<StepResult>;
	setTimeScale(scale: number): Promise<void> | void;
	getTimeState(): Promise<TimeState> | TimeState;
	getSnapshot(options?: {
		detail?: string;
		includeGodot?: boolean;
	}): Promise<unknown> | unknown;
}

export interface WindowWithBridge {
	GodotDebugBridge?: DebugBridge;
	SlopcadeDebugBridge?: SlopcadeDebugBridgeInterface;
	slopcadeGameReady?: boolean;
}

export interface AssertParams {
	type: string;
	entityId?: string;
	position?: { x: number; y: number };
	tolerance?: number;
	threshold?: number;
	entityA?: string;
	entityB?: string;
	tag?: string;
	count?: number;
}

export interface ConsoleLogEntry {
	timestamp: number;
	type: "log" | "warn" | "error" | "info" | "debug";
	text: string;
	args?: string[];
}

export interface InspectorTarget {
	id: string;
	label: string;
	mode: string;
}

export interface GameInspectorState {
	browser: Browser | null;
	page: Page | null;
	currentGameId: string | null;
	consoleLogs: ConsoleLogEntry[];
	maxLogEntries: number;
	/** Active target context ID. When set, operations target this specific preview context. */
	activeTargetId: string | null;
}
