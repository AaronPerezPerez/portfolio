/**
 * Persistence Layer - Public API
 */

// Interfaces
export type {
  IConversationRepository,
  ConversationWithStats,
  GlobalStats,
  ConversationListResult,
  ConversationFilters,
} from './IConversationRepository';

export type {
  IMessageRepository,
  ChatMessage,
  MessageRecord,
} from './IMessageRepository';

// Implementations
export { D1ConversationRepository } from './D1ConversationRepository';
export { D1MessageRepository } from './D1MessageRepository';
