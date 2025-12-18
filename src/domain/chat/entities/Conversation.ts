/**
 * Conversation Aggregate Root
 * Represents a chat conversation with its messages
 */

import { UserId } from '../value-objects/UserId';
import { MessageContent } from '../value-objects/MessageContent';
import { ChatRole } from '../value-objects/ChatRole';
import { Message } from './Message';

export interface ConversationProps {
  id?: number;
  userId: UserId;
  messages?: Message[];
  createdAt?: Date;
  updatedAt?: Date;
}

export class Conversation {
  private readonly _id: number | undefined;
  private readonly _userId: UserId;
  private _messages: Message[];
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: ConversationProps) {
    this._id = props.id;
    this._userId = props.userId;
    this._messages = props.messages ?? [];
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  // Getters
  get id(): number | undefined {
    return this._id;
  }

  get userId(): UserId {
    return this._userId;
  }

  get messages(): readonly Message[] {
    return this._messages.filter(m => !m.isDeleted);
  }

  get allMessages(): readonly Message[] {
    return this._messages;
  }

  get messageCount(): number {
    return this.messages.length;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get lastMessage(): Message | undefined {
    const msgs = this.messages;
    return msgs[msgs.length - 1];
  }

  get lastUserMessage(): Message | undefined {
    return [...this.messages].reverse().find(m => m.isFromUser);
  }

  /**
   * Creates a new Conversation
   */
  static create(props: ConversationProps): Conversation {
    return new Conversation(props);
  }

  /**
   * Reconstructs a Conversation from persistence
   */
  static fromPersistence(data: {
    id: number;
    userId: string;
    createdAt: string;
    updatedAt: string;
  }): Conversation {
    return new Conversation({
      id: data.id,
      userId: UserId.fromTrusted(data.userId),
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    });
  }

  /**
   * Adds a user message to the conversation
   */
  addUserMessage(content: MessageContent): Message {
    if (!this._id) {
      throw new Error('Cannot add message to unsaved conversation');
    }

    const message = Message.createUserMessage(this._id, content);
    this._messages.push(message);
    this._updatedAt = new Date();
    return message;
  }

  /**
   * Adds an assistant message to the conversation
   */
  addAssistantMessage(content: MessageContent): Message {
    if (!this._id) {
      throw new Error('Cannot add message to unsaved conversation');
    }

    const message = Message.createAssistantMessage(this._id, content);
    this._messages.push(message);
    this._updatedAt = new Date();
    return message;
  }

  /**
   * Sets messages (typically after loading from DB)
   */
  setMessages(messages: Message[]): void {
    this._messages = messages;
  }

  /**
   * Clears all messages (soft delete)
   */
  clearMessages(): void {
    this._messages = this._messages.map(m => m.softDelete());
    this._updatedAt = new Date();
  }

  /**
   * Gets the last N messages for context
   */
  getRecentMessages(count: number): readonly Message[] {
    const msgs = this.messages;
    return msgs.slice(-count);
  }

  /**
   * Formats messages for AI context
   */
  toAIContext(maxMessages = 10): Array<{ role: ChatRole; content: string }> {
    return this.getRecentMessages(maxMessages).map(m => m.toAIFormat());
  }

  /**
   * Converts to DTO for API responses
   */
  toDTO(): {
    id?: number;
    userId: string;
    messageCount: number;
    createdAt: string;
    updatedAt: string;
    lastMessage?: string;
  } {
    return {
      id: this._id,
      userId: this._userId.toShort(),
      messageCount: this.messageCount,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
      lastMessage: this.lastMessage?.content.value,
    };
  }
}
