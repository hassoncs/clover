export type ChatMessageRole = 'user' | 'agent' | 'system';
export type ChatMessageType = 
  | 'text'           // plain text message
  | 'user_question'  // structured question batch (will be rendered by Task 6)
  | 'clarification'  // clarification request (will be rendered by Task 7)
  | 'status'         // system status (step started, completed, etc.)
  | 'error'          // error message
  | 'completion';    // run completed successfully

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  type: ChatMessageType;
  text: string;
  timestamp: number;
  // For user_question and clarification types, store the raw event payload
  payload?: unknown;
  // Whether this message is still "pending" (e.g., unanswered question)
  pending?: boolean;
}
