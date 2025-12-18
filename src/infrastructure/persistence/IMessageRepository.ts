/**
 * IMessageRepository
 * Interface for message persistence operations
 */

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  tokensUsed?: number; // AI tokens used (for assistant messages)
}

export interface MessageRecord {
  id: number;
  conversationId: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string | null;
  deletedAt: string | null;
}

export interface IMessageRepository {
  /**
   * Load messages for a conversation
   */
  loadByConversationId(
    conversationId: number,
    limit?: number
  ): Promise<ChatMessage[]>;

  /**
   * Load messages for a user (finds conversation first)
   */
  loadByUserId(userId: string, limit?: number): Promise<ChatMessage[]>;

  /**
   * Save multiple messages in batch
   */
  saveBatch(conversationId: number, messages: ChatMessage[]): Promise<void>;

  /**
   * Save a single message
   */
  save(conversationId: number, message: ChatMessage): Promise<number>;

  /**
   * Soft delete all messages in a conversation
   */
  softDeleteByConversationId(conversationId: number): Promise<void>;

  /**
   * Soft delete all messages for a user
   */
  softDeleteByUserId(userId: string): Promise<void>;

  /**
   * Get message count for a conversation
   */
  countByConversationId(conversationId: number): Promise<number>;
}
