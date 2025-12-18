/**
 * Chat Domain - Public API
 */

// Entities
export { Conversation, type ConversationProps } from './entities/Conversation';
export { Message, type MessageProps } from './entities/Message';

// Value Objects
export { ChatRole, isValidChatRole, isUserRole, isAssistantRole } from './value-objects/ChatRole';
export { UserId } from './value-objects/UserId';
export { MessageContent, type SanitizationResult } from './value-objects/MessageContent';

// Domain Services
export { ContentAnalyzer, type ContentAnalysis } from './services/ContentAnalyzer';
