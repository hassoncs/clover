import type { RealtimeRelayEnv } from "./types/realtime-relay";

const SESSION_TIMEOUT_MS = 5 * 60 * 1000;

export class RealtimeRelayDO {
	private clientWs: WebSocket | null = null;
	private openaiWs: WebSocket | null = null;

	constructor(
		private state: DurableObjectState,
		private env: RealtimeRelayEnv,
	) {}

	async fetch(request: Request): Promise<Response> {
		const upgradeHeader = request.headers.get("Upgrade");
		if (upgradeHeader !== "websocket") {
			return new Response("Expected WebSocket", { status: 426 });
		}

		const url = new URL(request.url);
		const token = url.searchParams.get("token");
		if (!token) {
			return new Response("Unauthorized", { status: 401 });
		}

		const [client, server] = Object.values(new WebSocketPair());
		this.clientWs = server;

		server.accept();

		try {
			const openaiResponse = await fetch(
				"https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview",
				{
					headers: {
						Upgrade: "websocket",
						Authorization: `Bearer ${this.env.OPENAI_API_KEY}`,
						"OpenAI-Beta": "realtime=v1",
					},
				},
			);

			this.openaiWs = openaiResponse.webSocket;
			if (!this.openaiWs) {
				server.close(1011, "Failed to connect to OpenAI");
				return new Response(null, { status: 101, webSocket: client });
			}

			this.openaiWs.accept();

			server.addEventListener("message", (event) => {
				if (this.openaiWs?.readyState === WebSocket.OPEN) {
					this.openaiWs.send(event.data as string | ArrayBuffer);
				}
			});

			this.openaiWs.addEventListener("message", (event) => {
				if (server.readyState === WebSocket.OPEN) {
					server.send(event.data as string | ArrayBuffer);
				}
			});

			server.addEventListener("close", () => {
				this.openaiWs?.close();
			});

			this.openaiWs.addEventListener("close", () => {
				server.close();
			});

			this.openaiWs.addEventListener("error", () => {
				server.close();
			});
		} catch {
			server.close(1011, "Failed to connect to OpenAI");
		}

		await this.state.storage.setAlarm(Date.now() + SESSION_TIMEOUT_MS);

		return new Response(null, { status: 101, webSocket: client });
	}

	async alarm(): Promise<void> {
		this.clientWs?.close();
		this.openaiWs?.close();
	}
}
