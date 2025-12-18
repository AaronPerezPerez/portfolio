/**
 * ChatRole Value Object
 * Represents the role of a participant in a chat conversation
 */

export const ChatRole = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
} as const;

export type ChatRole = (typeof ChatRole)[keyof typeof ChatRole];

export function isValidChatRole(role: string): role is ChatRole {
  return role === ChatRole.USER || role === ChatRole.ASSISTANT || role === ChatRole.SYSTEM;
}

export function isUserRole(role: ChatRole): boolean {
  return role === ChatRole.USER;
}

export function isAssistantRole(role: ChatRole): boolean {
  return role === ChatRole.ASSISTANT;
}
