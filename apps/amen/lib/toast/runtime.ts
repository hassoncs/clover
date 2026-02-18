import { AccessibilityInfo, Platform } from "react-native";
import { flushQueue, setReady } from "./store";
import type { ToastAPI, ToastIntent, ToastOptions } from "./types";

type SonnerToast = typeof import("sonner-native").toast;

let sonnerToast: SonnerToast | null = null;
let loadPromise: Promise<void> | null = null;

export async function loadRuntime(): Promise<void> {
	if (sonnerToast) return;
	if (loadPromise) return loadPromise;

	loadPromise = import("sonner-native").then((module) => {
		sonnerToast = module.toast;
		setReady(true);
		flushQueue().forEach(dispatchToast);
	});

	return loadPromise;
}

export function dispatchToast(intent: ToastIntent): string | number {
	if (!sonnerToast) {
		loadRuntime();
		return intent.id ?? `queued-${Date.now()}`;
	}

	const id = intent.id ?? undefined;
	const duration = intent.duration ?? getDefaultDuration(intent.type);

	announceForAccessibility(intent);

	switch (intent.type) {
		case "success":
			return sonnerToast.success(intent.message, {
				id,
				description: intent.description,
				duration,
				action: intent.action
					? { label: intent.action.label, onClick: intent.action.onClick }
					: undefined,
				onDismiss: intent.onDismiss,
				onAutoClose: intent.onAutoClose,
			});
		case "error":
			return sonnerToast.error(intent.message, {
				id,
				description: intent.description,
				duration,
				action: intent.action
					? { label: intent.action.label, onClick: intent.action.onClick }
					: undefined,
				onDismiss: intent.onDismiss,
				onAutoClose: intent.onAutoClose,
			});
		case "warning":
			return sonnerToast.warning(intent.message, {
				id,
				description: intent.description,
				duration,
				action: intent.action
					? { label: intent.action.label, onClick: intent.action.onClick }
					: undefined,
				onDismiss: intent.onDismiss,
				onAutoClose: intent.onAutoClose,
			});
		case "info":
			return sonnerToast.info(intent.message, {
				id,
				description: intent.description,
				duration,
				action: intent.action
					? { label: intent.action.label, onClick: intent.action.onClick }
					: undefined,
				onDismiss: intent.onDismiss,
				onAutoClose: intent.onAutoClose,
			});
	}
}

export function dismissToast(id: string | number): void {
	if (sonnerToast) {
		sonnerToast.dismiss(id);
	}
}

export function dismissAllToasts(): void {
	if (sonnerToast) {
		sonnerToast.dismiss();
	}
}

export async function toastPromise<T>(
	promise: Promise<T>,
	messages: {
		loading: string;
		success: string | ((data: T) => string);
		error: string | ((error: unknown) => string);
	},
	options?: Omit<ToastOptions, "message">,
): Promise<T> {
	await loadRuntime();

	if (!sonnerToast) {
		throw new Error("Toast runtime not loaded");
	}

	const successFn =
		typeof messages.success === "string"
			? () => messages.success as string
			: messages.success;

	const result = sonnerToast.promise(promise, {
		loading: messages.loading,
		success: successFn,
		error: messages.error,
	});

	return promise;
}

function getDefaultDuration(type: ToastIntent["type"]): number {
	switch (type) {
		case "success":
			return 4000;
		case "error":
			return 8000;
		case "warning":
			return 6000;
		case "info":
			return 5000;
	}
}

function announceForAccessibility(intent: ToastIntent): void {
	if (Platform.OS !== "web") {
		const announcement = intent.description
			? `${intent.message}. ${intent.description}`
			: intent.message;
		AccessibilityInfo.announceForAccessibility(announcement);
	}
}

export const runtimeToast: ToastAPI = {
	success: (message, options) =>
		dispatchToast({ type: "success", message, ...options }),
	error: (message, options) =>
		dispatchToast({ type: "error", message, ...options }),
	warning: (message, options) =>
		dispatchToast({ type: "warning", message, ...options }),
	info: (message, options) =>
		dispatchToast({ type: "info", message, ...options }),
	show: (options) => dispatchToast(options),
	promise: toastPromise,
	dismiss: dismissToast,
	dismissAll: dismissAllToasts,
};
