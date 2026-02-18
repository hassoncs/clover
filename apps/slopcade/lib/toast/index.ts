import { getQueueLength, isReady, queueToast, requestRuntime } from "./store";
import type { ToastAPI, ToastOptions, ToastType } from "./types";

export type { ToastAction, ToastAPI, ToastOptions, ToastType } from "./types";

const DEFAULT_DURATIONS: Record<ToastType, number> = {
	success: 4000,
	error: 8000,
	warning: 6000,
	info: 5000,
};

function createToast(
	type: ToastType,
	message: string,
	options?: Omit<ToastOptions, "message">,
): string | number {
	const duration = options?.duration ?? DEFAULT_DURATIONS[type];

	if (isReady()) {
		return queueToast({ type, message, duration, ...options });
	}

	requestRuntime();
	return queueToast({ type, message, duration, ...options });
}

export const toast: ToastAPI = {
	success: (message, options) => createToast("success", message, options),
	error: (message, options) => createToast("error", message, options),
	warning: (message, options) => createToast("warning", message, options),
	info: (message, options) => createToast("info", message, options),
	show: (options) => createToast(options.type, options.message, options),
	promise: async (promise, messages, options) => {
		const { loadRuntime } = await import("./runtime");
		await loadRuntime();
		const { toastPromise } = await import("./runtime");
		return toastPromise(promise, messages, options);
	},
	dismiss: async (id) => {
		const { dismissToast } = await import("./runtime");
		dismissToast(id);
	},
	dismissAll: async () => {
		const { dismissAllToasts } = await import("./runtime");
		dismissAllToasts();
	},
};

export { isReady, getQueueLength };
