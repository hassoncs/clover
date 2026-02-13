"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
	LivePreviewController,
	type PreviewLoadState,
	type PreviewMode,
} from "@/lib/game-engine/live/LivePreviewController";
import type { GodotBridge } from "@/lib/godot/types";

const STATE_POLL_INTERVAL_MS = 200;

interface UseWorkspaceSnapshotResult {
	loadState: PreviewLoadState;
	mode: PreviewMode;
	revision: string | null;
	error: string | null;
	setMode: (mode: PreviewMode) => Promise<void>;
	reset: () => Promise<void>;
}

interface SnapshotState {
	loadState: PreviewLoadState;
	mode: PreviewMode;
	revision: string | null;
	error: string | null;
}

const INITIAL_SNAPSHOT_STATE: SnapshotState = {
	loadState: "idle",
	mode: "author",
	revision: null,
	error: null,
};

export function useWorkspaceSnapshot(
	gameId: string | undefined,
	bridge: GodotBridge | null,
	livePreviewEnabled = false,
): UseWorkspaceSnapshotResult {
	const [snapshotState, setSnapshotState] = useState<SnapshotState>(
		INITIAL_SNAPSHOT_STATE,
	);
	const [controllerReady, setControllerReady] = useState(false);
	const initializedRef = useRef(false);
	const initializedGameIdRef = useRef<string | undefined>(undefined);
	const initializedBridgeRef = useRef<GodotBridge | null>(null);

	const syncStateFromController = useCallback(() => {
		const controller = LivePreviewController.getInstance();
		const isInitialized = controller.isInitialized();
		const controllerGameId = controller.getGameId();

		if (
			!isInitialized ||
			(gameId && controllerGameId !== gameId && !initializedRef.current)
		) {
			if (!initializedRef.current) {
				setSnapshotState(INITIAL_SNAPSHOT_STATE);
			}
			return;
		}

		const controllerState = controller.getState();
		setSnapshotState((previous) => {
			if (
				previous.loadState === controllerState.loadState &&
				previous.mode === controllerState.mode &&
				previous.revision === controllerState.revision &&
				previous.error === controllerState.lastError
			) {
				return previous;
			}

			return {
				loadState: controllerState.loadState,
				mode: controllerState.mode,
				revision: controllerState.revision,
				error: controllerState.lastError,
			};
		});
	}, [gameId]);

	useEffect(() => {
		let cancelled = false;

		const initializeController = async () => {
			if (!livePreviewEnabled || !gameId) {
				if (initializedRef.current) {
					LivePreviewController.destroy();
					initializedRef.current = false;
					initializedGameIdRef.current = undefined;
					initializedBridgeRef.current = null;
					setControllerReady(false);
				}
				setSnapshotState(INITIAL_SNAPSHOT_STATE);
				return;
			}

			const controller = LivePreviewController.getInstance();

			if (!bridge) {
				// If no bridge, check if already initialized for this game
				if (controller.isInitialized() && controller.getGameId() === gameId) {
					setControllerReady(true);
					syncStateFromController();
				} else {
					setControllerReady(false);
					if (!initializedRef.current) {
						setSnapshotState(INITIAL_SNAPSHOT_STATE);
					}
				}
				return;
			}

			const sameContext =
				initializedRef.current &&
				initializedGameIdRef.current === gameId &&
				initializedBridgeRef.current === bridge;
			if (sameContext) {
				syncStateFromController();
				return;
			}

			if (initializedRef.current) {
				LivePreviewController.destroy();
				initializedRef.current = false;
				initializedGameIdRef.current = undefined;
				initializedBridgeRef.current = null;
				setControllerReady(false);
			}

			try {
				await controller.initialize(gameId, bridge);
			} catch {
				if (cancelled) {
					return;
				}
			}

			if (cancelled) {
				return;
			}

			initializedRef.current = true;
			initializedGameIdRef.current = gameId;
			initializedBridgeRef.current = bridge;
			setControllerReady(true);
			syncStateFromController();
		};

		void initializeController();

		return () => {
			cancelled = true;
		};
	}, [bridge, gameId, livePreviewEnabled, syncStateFromController]);

	useEffect(() => {
		if (!controllerReady) {
			return;
		}

		const interval = setInterval(() => {
			syncStateFromController();
		}, STATE_POLL_INTERVAL_MS);

		syncStateFromController();

		return () => {
			clearInterval(interval);
		};
	}, [controllerReady, syncStateFromController]);

	useEffect(() => {
		return () => {
			if (initializedRef.current) {
				LivePreviewController.destroy();
				initializedRef.current = false;
				setControllerReady(false);
			}
		};
	}, []);

	const setMode = useCallback(
		async (mode: PreviewMode) => {
			const controller = LivePreviewController.getInstance();
			if (!controller.isInitialized()) {
				return;
			}

			await controller.setMode(mode);
			syncStateFromController();
		},
		[syncStateFromController],
	);

	const reset = useCallback(async () => {
		const controller = LivePreviewController.getInstance();
		if (!controller.isInitialized()) {
			return;
		}

		await controller.reset();
		syncStateFromController();
	}, [syncStateFromController]);

	return {
		loadState: snapshotState.loadState,
		mode: snapshotState.mode,
		revision: snapshotState.revision,
		error: snapshotState.error,
		setMode,
		reset,
	};
}
