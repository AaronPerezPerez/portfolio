/**
 * Domain Layer - Entities Tests
 */

import { describe, it, expect } from 'vitest';
import { Message } from '../../../domain/chat/entities/Message';
import { Conversation } from '../../../domain/chat/entities/Conversation';
import { MessageContent } from '../../../domain/chat/value-objects/MessageContent';
import { UserId } from '../../../domain/chat/value-objects/UserId';
import { ChatRole } from '../../../domain/chat/value-objects/ChatRole';

describe('Message Entity', () => {
  it('should create a user message', () => {
    const content = MessageContent.fromTrusted('Hello!');
    const message = Message.createUserMessage(1, content);

    expect(message.role).toBe(ChatRole.USER);
    expect(message.conversationId).toBe(1);
    expect(message.content.value).toBe('Hello!');
    expect(message.isFromUser).toBe(true);
    expect(message.isFromAssistant).toBe(false);
    expect(message.isDeleted).toBe(false);
  });

  it('should create an assistant message', () => {
    const content = MessageContent.fromTrusted('Hi there!');
    const message = Message.createAssistantMessage(1, content);

    expect(message.role).toBe(ChatRole.ASSISTANT);
    expect(message.isFromAssistant).toBe(true);
    expect(message.isFromUser).toBe(false);
  });

  it('should soft delete message', () => {
    const content = MessageContent.fromTrusted('Test');
    const message = Message.createUserMessage(1, content);

    expect(message.isDeleted).toBe(false);

    const deleted = message.softDelete();
    expect(deleted.isDeleted).toBe(true);
    expect(deleted.deletedAt).toBeDefined();
  });

  it('should convert to DTO', () => {
    const content = MessageContent.fromTrusted('Test message');
    const message = Message.createUserMessage(1, content);
    const dto = message.toDTO();

    expect(dto.role).toBe('user');
    expect(dto.content).toBe('Test message');
    expect(dto.createdAt).toBeDefined();
  });

  it('should convert to AI format', () => {
    const content = MessageContent.fromTrusted('Hello AI');
    const message = Message.createUserMessage(1, content);
    const aiFormat = message.toAIFormat();

    expect(aiFormat.role).toBe('user');
    expect(aiFormat.content).toBe('Hello AI');
  });

  it('should reconstruct from persistence', () => {
    const message = Message.fromPersistence({
      id: 42,
      conversationId: 1,
      role: 'user',
      content: 'Persisted message',
      createdAt: '2024-01-01T00:00:00Z',
      deletedAt: null,
    });

    expect(message.id).toBe(42);
    expect(message.conversationId).toBe(1);
    expect(message.role).toBe('user');
    expect(message.content.value).toBe('Persisted message');
    expect(message.isDeleted).toBe(false);
  });
});

describe('Conversation Aggregate', () => {
  const createConversation = (id?: number) => {
    const userId = UserId.fromTrusted('test-user-12345');
    return Conversation.create({ id, userId });
  };

  it('should create a new conversation', () => {
    const userId = UserId.fromTrusted('user-12345678');
    const conversation = Conversation.create({ userId });

    expect(conversation.userId.value).toBe('user-12345678');
    expect(conversation.messageCount).toBe(0);
    expect(conversation.messages).toHaveLength(0);
  });

  it('should add user message', () => {
    const conversation = createConversation(1);
    const content = MessageContent.fromTrusted('Hello!');

    const message = conversation.addUserMessage(content);

    expect(message.isFromUser).toBe(true);
    expect(conversation.messageCount).toBe(1);
    expect(conversation.lastMessage?.content.value).toBe('Hello!');
  });

  it('should add assistant message', () => {
    const conversation = createConversation(1);
    const content = MessageContent.fromTrusted('Hello!');

    const message = conversation.addAssistantMessage(content);

    expect(message.isFromAssistant).toBe(true);
    expect(conversation.messageCount).toBe(1);
  });

  it('should throw when adding message to unsaved conversation', () => {
    const conversation = createConversation(); // no ID
    const content = MessageContent.fromTrusted('Hello!');

    expect(() => conversation.addUserMessage(content)).toThrow();
  });

  it('should get last user message', () => {
    const conversation = createConversation(1);

    conversation.addUserMessage(MessageContent.fromTrusted('First user'));
    conversation.addAssistantMessage(MessageContent.fromTrusted('First AI'));
    conversation.addUserMessage(MessageContent.fromTrusted('Second user'));
    conversation.addAssistantMessage(MessageContent.fromTrusted('Second AI'));

    const lastUser = conversation.lastUserMessage;
    expect(lastUser?.content.value).toBe('Second user');
  });

  it('should get recent messages', () => {
    const conversation = createConversation(1);

    for (let i = 0; i < 15; i++) {
      conversation.addUserMessage(MessageContent.fromTrusted(`Message ${i}`));
    }

    const recent = conversation.getRecentMessages(5);
    expect(recent).toHaveLength(5);
    expect(recent[0].content.value).toBe('Message 10');
    expect(recent[4].content.value).toBe('Message 14');
  });

  it('should format for AI context', () => {
    const conversation = createConversation(1);

    conversation.addUserMessage(MessageContent.fromTrusted('Hello'));
    conversation.addAssistantMessage(MessageContent.fromTrusted('Hi!'));

    const context = conversation.toAIContext();
    expect(context).toHaveLength(2);
    expect(context[0]).toEqual({ role: 'user', content: 'Hello' });
    expect(context[1]).toEqual({ role: 'assistant', content: 'Hi!' });
  });

  it('should clear messages (soft delete)', () => {
    const conversation = createConversation(1);

    conversation.addUserMessage(MessageContent.fromTrusted('Hello'));
    conversation.addAssistantMessage(MessageContent.fromTrusted('Hi!'));

    expect(conversation.messageCount).toBe(2);

    conversation.clearMessages();

    // messages getter filters deleted messages
    expect(conversation.messageCount).toBe(0);
    // but allMessages includes them
    expect(conversation.allMessages).toHaveLength(2);
  });

  it('should convert to DTO', () => {
    const userId = UserId.fromTrusted('user-12345678');
    const conversation = Conversation.create({ id: 1, userId });
    conversation.addUserMessage(MessageContent.fromTrusted('Test'));

    const dto = conversation.toDTO();

    expect(dto.id).toBe(1);
    expect(dto.userId).toBe('user-123'); // shortened
    expect(dto.messageCount).toBe(1);
    expect(dto.lastMessage).toBe('Test');
  });

  it('should reconstruct from persistence', () => {
    const conversation = Conversation.fromPersistence({
      id: 42,
      userId: 'persisted-user',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    });

    expect(conversation.id).toBe(42);
    expect(conversation.userId.value).toBe('persisted-user');
  });
});
