/**
 * Chat history persistence using localStorage
 * - 7 day expiration
 * - Max 50 messages
 */

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface StoredChat {
  messages: ChatMessage[];
  timestamp: number;
}

const STORAGE_KEY = 'aaron-chat-history';
const MAX_MESSAGES = 50;
const EXPIRATION_DAYS = 7;

export function saveChatHistory(messages: ChatMessage[]): void {
  if (typeof window === 'undefined') return;

  const data: StoredChat = {
    messages: messages.slice(-MAX_MESSAGES),
    timestamp: Date.now(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable
  }
}

export function loadChatHistory(): ChatMessage[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const data: StoredChat = JSON.parse(stored);
    const expirationMs = EXPIRATION_DAYS * 24 * 60 * 60 * 1000;

    if (Date.now() - data.timestamp > expirationMs) {
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }

    return data.messages;
  } catch {
    return [];
  }
}

export function clearChatHistory(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
