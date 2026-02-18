/**
 * Toast Store - Tiny event store for queue + readiness state
 *
 * This is part of the core bundle. It manages:
 * - Whether the lazy runtime is loaded
 * - A queue of toasts waiting to be shown
 * - Subscriptions for React components
 */

import type { ToastIntent, ToastStore } from "./types";

const store: ToastStore = {
	ready: false,
	requested: false,
	queue: [],
	listeners: new Set(),
};

/**
 * Subscribe to store changes
 */
export function subscribe(listener: () => void): () => void {
	store.listeners.add(listener);
	return () => store.listeners.delete(listener);
}

/**
 * Get current store state (snapshot)
 */
export function getSnapshot(): ToastStore {
	return store;
}

/**
 * Request the toast runtime to load
 * Called when first toast is triggered
 */
export function requestRuntime(): void {
	if (!store.requested) {
		store.requested = true;
		emitChange();
	}
}

/**
 * Mark the runtime as ready
 * Called by ToastHost when lazy runtime is mounted
 */
export function setReady(ready: boolean): void {
	store.ready = ready;
	emitChange();
}

/**
 * Queue a toast to be shown
 * If runtime is ready, it will be shown immediately
 * If not, it will be shown when runtime loads
 */
export function queueToast(intent: ToastIntent): string | number {
	const id = intent.id ?? generateId();
	const toastWithId = { ...intent, id };

	store.queue.push(toastWithId);
	emitChange();

	// Trigger lazy load if not already requested
	if (!store.requested) {
		requestRuntime();
	}

	return id;
}

/**
 * Get and clear the queue
 * Called by runtime when it's ready to process queued toasts
 */
export function flushQueue(): ToastIntent[] {
	const queued = [...store.queue];
	store.queue = [];
	emitChange();
	return queued;
}

/**
 * Remove a toast from the queue by ID
 */
export function removeFromQueue(id: string | number): void {
	const index = store.queue.findIndex((t) => t.id === id);
	if (index !== -1) {
		store.queue.splice(index, 1);
		emitChange();
	}
}

/**
 * Get queue length
 */
export function getQueueLength(): number {
	return store.queue.length;
}

/**
 * Check if runtime is ready
 */
export function isReady(): boolean {
	return store.ready;
}

/**
 * Check if runtime has been requested
 */
export function isRequested(): boolean {
	return store.requested;
}

// --- Internal ---

function emitChange(): void {
	store.listeners.forEach((listener) => {
		listener();
	});
}

let idCounter = 0;
function generateId(): string {
	return `toast-${Date.now()}-${idCounter++}`;
}
