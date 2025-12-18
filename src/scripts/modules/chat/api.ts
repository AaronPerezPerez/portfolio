/**
 * Chat API Helpers
 * Centralized fetch calls for chat functionality
 */

import type { Message, ChatApiResponse, HistoryResponse } from './types';

const API_ENDPOINTS = {
  chat: '/api/chat',
  history: '/api/history',
  clear: '/api/clear',
} as const;

/**
 * Send messages to the chat API
 */
export async function sendChatMessage(
  messages: Message[],
  userId: string
): Promise<ChatApiResponse> {
  const response = await fetch(API_ENDPOINTS.chat, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, userId }),
  });

  if (!response.ok) {
    throw new Error(`Chat API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Load chat history for a user
 */
export async function loadChatHistory(userId: string): Promise<Message[]> {
  const response = await fetch(`${API_ENDPOINTS.history}?userId=${userId}`);

  if (!response.ok) {
    throw new Error(`History API error: ${response.status}`);
  }

  const data: HistoryResponse = await response.json();
  return data.messages || [];
}

/**
 * Clear chat history (soft delete)
 */
export async function clearChatHistory(userId: string): Promise<void> {
  const response = await fetch(API_ENDPOINTS.clear, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    throw new Error(`Clear API error: ${response.status}`);
  }
}
