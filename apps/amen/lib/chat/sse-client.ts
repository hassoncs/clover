import type { AgUiEvent } from "@slopcade/shared/chat";

export interface SSEClientOptions {
	url: string;
	onEvent: (event: AgUiEvent) => void;
	onError?: (error: Error) => void;
	onClose?: () => void;
}

function parseSseEventChunk(chunk: string): string | null {
	const lines = chunk.split("\n");
	const dataLines: string[] = [];

	for (const rawLine of lines) {
		const line = rawLine.trimEnd();
		if (!line || line.startsWith(":")) continue;
		if (line.startsWith("data:")) {
			dataLines.push(line.slice(5).trimStart());
		}
	}

	if (dataLines.length === 0) {
		return null;
	}

	return dataLines.join("\n");
}

export function connectSSE(options: SSEClientOptions): { close: () => void } {
	const controller = new AbortController();

	void (async () => {
		try {
			const response = await fetch(options.url, {
				method: "GET",
				signal: controller.signal,
			});

			if (!response.ok) {
				options.onError?.(
					new Error(
						`SSE connection failed: ${response.status} ${response.statusText}`,
					),
				);
				return;
			}

			const reader = response.body?.getReader();
			if (!reader) {
				options.onError?.(new Error("SSE connection failed: no response body"));
				return;
			}

			const decoder = new TextDecoder();
			let buffer = "";

			while (true) {
				const { done, value } = await reader.read();
				if (done) {
					break;
				}

				buffer += decoder.decode(value, { stream: true });

				const eventChunks = buffer.split("\n\n");
				buffer = eventChunks.pop() ?? "";

				for (const eventChunk of eventChunks) {
					const data = parseSseEventChunk(eventChunk);
					if (!data) continue;

					try {
						const event = JSON.parse(data) as AgUiEvent;
						options.onEvent(event);
					} catch {}
				}
			}

			if (buffer.trim()) {
				const data = parseSseEventChunk(buffer);
				if (data) {
					try {
						const event = JSON.parse(data) as AgUiEvent;
						options.onEvent(event);
					} catch {}
				}
			}
		} catch (error) {
			if (
				typeof DOMException !== "undefined" &&
				error instanceof DOMException &&
				error.name === "AbortError"
			) {
				return;
			}
			options.onError?.(
				error instanceof Error ? error : new Error(String(error)),
			);
		} finally {
			options.onClose?.();
		}
	})();

	return {
		close: () => controller.abort(),
	};
}
