/**
 * ConversationsManager
 * Handles loading and rendering conversations
 */

import type { Conversation, Message, GlobalStats } from './state';
import { formatRelativeTime, formatDateTime, escapeHtml } from './formatters';

export interface ConversationsCallbacks {
  onStatsUpdated: (stats: GlobalStats) => void;
  onConversationsLoaded: (conversations: Conversation[]) => void;
  onConversationSelected: (id: number) => void;
  onUnauthorized: () => void;
}

export class ConversationsManager {
  private callbacks: ConversationsCallbacks;
  private listContainer: HTMLElement | null;
  private detailContainer: HTMLElement | null;

  constructor(
    callbacks: ConversationsCallbacks,
    listContainerId = 'conversations-list',
    detailContainerId = 'conversation-detail'
  ) {
    this.callbacks = callbacks;
    this.listContainer = document.getElementById(listContainerId);
    this.detailContainer = document.getElementById(detailContainerId);
  }

  /**
   * Load all conversations
   */
  async load(): Promise<Conversation[]> {
    try {
      const response = await fetch('/api/admin/conversations');

      if (!response.ok) {
        if (response.status === 401) {
          this.callbacks.onUnauthorized();
        }
        return [];
      }

      const data = (await response.json()) as {
        stats: GlobalStats;
        conversations: Conversation[];
      };
      this.callbacks.onStatsUpdated(data.stats);
      this.callbacks.onConversationsLoaded(data.conversations);
      return data.conversations;
    } catch (error) {
      console.error('Failed to load conversations:', error);
      return [];
    }
  }

  /**
   * Render the conversations list
   */
  renderList(conversations: Conversation[], selectedId: number | null): void {
    if (!this.listContainer) return;

    if (conversations.length === 0) {
      this.listContainer.innerHTML = `
        <div class="p-4 text-center text-[var(--text-muted)] font-mono text-sm">
          No conversations yet
        </div>
      `;
      return;
    }

    this.listContainer.innerHTML = conversations
      .map((conv) => this.renderConversationItem(conv, conv.id === selectedId))
      .join('');

    // Add click handlers
    this.listContainer.querySelectorAll('[data-conversation-id]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = parseInt(el.getAttribute('data-conversation-id') || '0', 10);
        if (id) {
          this.callbacks.onConversationSelected(id);
        }
      });
    });
  }

  /**
   * Render a single conversation item
   */
  private renderConversationItem(conv: Conversation, isSelected: boolean): string {
    const timeAgo = conv.last_message_at
      ? formatRelativeTime(conv.last_message_at)
      : 'No messages';
    const preview = conv.last_message
      ? escapeHtml(conv.last_message.substring(0, 50)) + (conv.last_message.length > 50 ? '...' : '')
      : 'Empty conversation';

    return `
      <div
        data-conversation-id="${conv.id}"
        class="conversation-item p-4 cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors ${isSelected ? 'bg-[var(--bg-secondary)] border-l-2 border-[var(--primary)]' : ''}"
      >
        <div class="flex items-center justify-between mb-1">
          <span class="font-mono text-sm text-[var(--primary)]">
            ${conv.user_id.substring(0, 8)}...
          </span>
          <span class="text-xs text-[var(--text-muted)]">${timeAgo}</span>
        </div>
        <div class="text-sm text-[var(--text-muted)] truncate">${preview}</div>
        <div class="text-xs text-[var(--text-muted)] mt-1">
          ${conv.message_count} messages
        </div>
      </div>
    `;
  }

  /**
   * Load and render conversation detail
   */
  async loadDetail(conversationId: number): Promise<void> {
    if (!this.detailContainer) return;

    // Show loading state
    this.detailContainer.innerHTML = `
      <div class="h-full flex items-center justify-center text-[var(--text-muted)] font-mono">
        Loading...
      </div>
    `;

    try {
      const response = await fetch(`/api/admin/conversation/${conversationId}`);

      if (!response.ok) {
        if (response.status === 401) {
          this.callbacks.onUnauthorized();
          return;
        }
        throw new Error('Failed to load conversation');
      }

      const data = (await response.json()) as {
        conversation: { id: number; user_id: string; created_at: string | null };
        messages: Message[];
      };
      this.renderDetail(data.conversation, data.messages);
    } catch (error) {
      console.error('Failed to load conversation detail:', error);
      this.detailContainer.innerHTML = `
        <div class="h-full flex items-center justify-center text-red-400 font-mono">
          Failed to load conversation
        </div>
      `;
    }
  }

  /**
   * Render conversation detail
   */
  private renderDetail(
    conversation: { id: number; user_id: string; created_at: string | null },
    messages: Message[]
  ): void {
    if (!this.detailContainer) return;

    const header = `
      <div class="sticky top-0 bg-[var(--bg-primary)] border-b border-[var(--border-color)] p-4 mb-4">
        <div class="flex items-center justify-between">
          <div>
            <span class="font-mono text-[var(--primary)]">USER:</span>
            <span class="font-mono ml-2">${conversation.user_id}</span>
          </div>
          <div class="text-sm text-[var(--text-muted)]">
            Started: ${conversation.created_at ? formatDateTime(conversation.created_at) : 'Unknown'}
          </div>
        </div>
      </div>
    `;

    const messagesHtml = messages
      .map(
        (msg) => `
        <div class="admin-message ${msg.role === 'user' ? 'user' : 'assistant'} mb-4">
          <div class="admin-message-meta text-xs text-[var(--text-muted)] mb-1">
            ${msg.role === 'user' ? 'USER' : 'AARON.AI'} · ${msg.created_at ? formatDateTime(msg.created_at) : ''}
          </div>
          <div class="admin-message-content p-3 rounded bg-[var(--bg-secondary)] max-w-[80%] ${msg.role === 'user' ? '' : 'ml-auto'}">
            ${escapeHtml(msg.content)}
          </div>
        </div>
      `
      )
      .join('');

    this.detailContainer.innerHTML = header + `<div class="px-4 pb-4">${messagesHtml}</div>`;
    this.detailContainer.scrollTop = this.detailContainer.scrollHeight;
  }

  /**
   * Show empty state
   */
  showEmptyState(): void {
    if (!this.detailContainer) return;

    this.detailContainer.innerHTML = `
      <div class="h-full flex items-center justify-center text-[var(--text-muted)] font-mono">
        <div class="text-center">
          <div class="text-4xl mb-4 opacity-20">&gt;_</div>
          <div>Select a conversation</div>
        </div>
      </div>
    `;
  }
}
