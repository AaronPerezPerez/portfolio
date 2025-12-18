/**
 * Chat Widget Types
 */

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatApiResponse {
  response: string;
  steamUnlocked?: boolean;
}

export interface HistoryResponse {
  messages: Message[];
}
