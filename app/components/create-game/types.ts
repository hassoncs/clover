export type ChatMessageRole = 'user' | 'agent' | 'system';
export type ChatMessageType = 
  | 'text'           // plain text message
  | 'user_question'  // structured question batch
  | 'clarification'  // clarification request
  | 'status'         // system status (step started, completed, etc.)
  | 'error'          // error message
  | 'completion'     // run completed successfully
  | 'asset_preview'; // generated asset image preview

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
