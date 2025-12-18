/**
 * Message Entity
 * Represents a single message in a conversation
 */

import { ChatRole } from '../value-objects/ChatRole';
import { MessageContent } from '../value-objects/MessageContent';

export interface MessageProps {
  id?: number;
  conversationId: number;
  role: ChatRole;
  content: MessageContent;
  createdAt?: Date;
  deletedAt?: Date | null;
}

export class Message {
  private constructor(
    private readonly _id: number | undefined,
    private readonly _conversationId: number,
    private readonly _role: ChatRole,
    private readonly _content: MessageContent,
    private readonly _createdAt: Date,
    private _deletedAt: Date | null
  ) {}

  // Getters
  get id(): number | undefined {
    return this._id;
  }

  get conversationId(): number {
    return this._conversationId;
  }

  get role(): ChatRole {
    return this._role;
  }

  get content(): MessageContent {
    return this._content;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get deletedAt(): Date | null {
    return this._deletedAt;
  }

  get isDeleted(): boolean {
    return this._deletedAt !== null;
  }

  get isFromUser(): boolean {
    return this._role === ChatRole.USER;
  }

  get isFromAssistant(): boolean {
    return this._role === ChatRole.ASSISTANT;
  }

  /**
   * Creates a new Message entity
   */
  static create(props: MessageProps): Message {
    return new Message(
      props.id,
      props.conversationId,
      props.role,
      props.content,
      props.createdAt ?? new Date(),
      props.deletedAt ?? null
    );
  }

  /**
   * Creates a user message
   */
  static createUserMessage(conversationId: number, content: MessageContent): Message {
    return Message.create({
      conversationId,
      role: ChatRole.USER,
      content,
    });
  }

  /**
   * Creates an assistant message
   */
  static createAssistantMessage(conversationId: number, content: MessageContent): Message {
    return Message.create({
      conversationId,
      role: ChatRole.ASSISTANT,
      content,
    });
  }

  /**
   * Reconstructs a Message from persistence
   */
  static fromPersistence(data: {
    id: number;
    conversationId: number;
    role: string;
    content: string;
    createdAt: string;
    deletedAt: string | null;
  }): Message {
    return new Message(
      data.id,
      data.conversationId,
      data.role as ChatRole,
      MessageContent.fromTrusted(data.content),
      new Date(data.createdAt),
      data.deletedAt ? new Date(data.deletedAt) : null
    );
  }

  /**
   * Soft deletes the message
   */
  softDelete(): Message {
    return new Message(
      this._id,
      this._conversationId,
      this._role,
      this._content,
      this._createdAt,
      new Date()
    );
  }

  /**
   * Converts to a simple object for API responses
   */
  toDTO(): {
    id?: number;
    role: ChatRole;
    content: string;
    createdAt: string;
  } {
    return {
      id: this._id,
      role: this._role,
      content: this._content.value,
      createdAt: this._createdAt.toISOString(),
    };
  }

  /**
   * Converts to format suitable for AI context
   */
  toAIFormat(): { role: ChatRole; content: string } {
    return {
      role: this._role,
      content: this._content.value,
    };
  }
}
