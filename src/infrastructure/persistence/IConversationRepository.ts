/**
 * IConversationRepository
 * Interface for conversation persistence operations
 */

import type { Conversation, Message } from '../../domain/chat';

export interface ConversationWithStats {
  id: number;
  userId: string;
  createdAt: string | null;
  updatedAt: string | null;
  messageCount: number;
  lastMessageAt: string | null;
  lastMessage: string | null;
}

export interface GlobalStats {
  totalConversations: number;
  totalMessages: number;
  messagesToday: number;
}

export interface ConversationListResult {
  conversations: ConversationWithStats[];
  stats: GlobalStats;
}

export interface ConversationFilters {
  dateFrom?: string;
  dateTo?: string;
  language?: 'es' | 'en' | 'other';
  minMessages?: number;
  maxMessages?: number;
  hasTag?: number;
  limit?: number;
}

export interface IConversationRepository {
  /**
   * Find conversation by user ID
   */
  findByUserId(userId: string): Promise<Conversation | null>;

  /**
   * Find conversation by ID
   */
  findById(id: number): Promise<Conversation | null>;

  /**
   * Get or create a conversation for a user
   */
  getOrCreate(userId: string): Promise<number>;

  /**
   * Save a conversation (create or update)
   */
  save(conversation: Conversation): Promise<void>;

  /**
   * List conversations with stats (for admin)
   */
  listWithStats(limit?: number): Promise<ConversationListResult>;

  /**
   * List conversations with filters (for admin)
   */
  listWithFilters(filters: ConversationFilters): Promise<ConversationListResult>;

  /**
   * Get conversation detail with messages (for admin)
   */
  getDetail(id: number): Promise<{
    conversation: ConversationWithStats;
    messages: Array<{
      id: number;
      role: string;
      content: string;
      createdAt: string | null;
    }>;
  } | null>;

  /**
   * Soft delete a conversation
   */
  softDelete(id: number): Promise<void>;

  /**
   * Restore a soft-deleted conversation
   */
  restore(id: number): Promise<void>;

  /**
   * Permanently delete a conversation
   */
  permanentDelete(id: number): Promise<void>;

  /**
   * List soft-deleted conversations (trash)
   */
  listDeleted(limit?: number): Promise<ConversationWithStats[]>;
}
