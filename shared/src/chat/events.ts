export type AgUiEvent =
	| {
			type: "RUN_STARTED";
			threadId: string;
			runId: string;
	  }
	| {
			type: "TEXT_MESSAGE_START";
			messageId: string;
			role: "assistant";
	  }
	| {
			type: "TEXT_MESSAGE_CONTENT";
			messageId: string;
			delta: string;
	  }
	| {
			type: "TEXT_MESSAGE_END";
			messageId: string;
	  }
	| {
			type: "TOOL_CALL_START";
			toolCallId: string;
			toolName: string;
			parentMessageId: string;
	  }
	| {
			type: "TOOL_CALL_ARGS";
			toolCallId: string;
			delta: string;
	  }
	| {
			type: "TOOL_CALL_END";
			toolCallId: string;
	  }
	| {
			type: "TOOL_CALL_RESULT";
			toolCallId: string;
			result: string;
			isError?: boolean;
	  }
	| {
			type: "RUN_FINISHED";
			threadId: string;
			runId: string;
	  }
	| {
			type: "RUN_ERROR";
			message: string;
			code?: string;
	  }
	| {
			type: "FILE_CHANGED";
			gameId: string;
			filename: string;
	  }
	| {
			type: "EDITOR_COMMAND";
			command: string;
			payload: Record<string, unknown>;
	  };
