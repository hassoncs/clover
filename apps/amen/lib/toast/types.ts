export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastAction {
	label: string;
	onClick: () => void;
}

export interface ToastOptions {
	message: string;
	description?: string;
	duration?: number;
	action?: ToastAction;
	onDismiss?: () => void;
	onAutoClose?: () => void;
	id?: string | number;
}

export interface ToastIntent extends ToastOptions {
	type: ToastType;
}

export interface ToastPromiseMessages<T> {
	loading: string;
	success: string | ((data: T) => string);
	error: string | ((error: unknown) => string);
}

export interface ToastStore {
	ready: boolean;
	requested: boolean;
	queue: ToastIntent[];
	listeners: Set<() => void>;
}

export type ToastFunction = (
	message: string,
	options?: Omit<ToastOptions, "message">,
) => string | number;

export interface ToastAPI {
	success: ToastFunction;
	error: ToastFunction;
	warning: ToastFunction;
	info: ToastFunction;
	show: (options: ToastOptions & { type: ToastType }) => string | number;
	promise: <T>(
		promise: Promise<T>,
		messages: ToastPromiseMessages<T>,
		options?: Omit<ToastOptions, "message">,
	) => Promise<T>;
	dismiss: (id: string | number) => void;
	dismissAll: () => void;
}
