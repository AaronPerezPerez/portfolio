/**
 * Chat Module - Public API
 */

export { AIChatWidget, initChatWidgets } from './AIChatWidget';
export { sendChatMessage, loadChatHistory, clearChatHistory } from './api';
export type { Message, ChatApiResponse, HistoryResponse } from './types';
