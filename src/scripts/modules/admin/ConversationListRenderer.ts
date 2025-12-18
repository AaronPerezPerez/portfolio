/**
 * ConversationListRenderer
 *
 * Renders conversation list items with event delegation.
 * Instead of N listeners for N items, uses 1 listener on the container.
 */

import { delegateEvent } from '../shared/dom-helpers';

export interface Conversation {
  id: number;
  userId: string;
  lastMessageAt: string | null;
  lastMessage: string | null;
  messageCount: number;
}

export interface ConversationListOptions {
  onSelect: (id: number) => void;
  onCheckboxChange: (id: number, checked: boolean) => void;
}

/**
 * Escapes HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Truncates text to specified length
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Formats relative time (e.g., "5m ago", "2h ago")
 */
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * Renders a single conversation item HTML
 */
export function renderConversationItem(
  conv: Conversation,
  isActive: boolean,
  isSelected: boolean
): string {
  const lastMessageAt = conv.lastMessageAt
    ? formatTimeAgo(conv.lastMessageAt)
    : 'No messages';
  const preview = conv.lastMessage
    ? truncate(conv.lastMessage, 50)
    : 'Empty conversation';
  const shortId = conv.userId ? conv.userId.substring(0, 8) : 'unknown';

  return `
    <div
      class="conversation-item ${isActive ? 'active' : ''} ${isSelected ? 'selected' : ''}"
      data-id="${conv.id}"
      role="button"
      tabindex="0"
    >
      <input
        type="checkbox"
        class="conversation-checkbox"
        data-id="${conv.id}"
        ${isSelected ? 'checked' : ''}
        aria-label="Select conversation ${shortId}"
      />
      <div class="conversation-header">
        <span class="conversation-user">${shortId}...</span>
        <span class="conversation-time">${lastMessageAt}</span>
      </div>
      <div class="conversation-preview">${escapeHtml(preview)}</div>
      <div class="conversation-meta">
        <span class="message-count">${conv.messageCount || 0}</span>
        <span>messages</span>
      </div>
    </div>
  `;
}

/**
 * Sets up event delegation for conversation list interactions.
 * Returns cleanup function to remove listeners.
 */
export function setupConversationListEvents(
  container: HTMLElement,
  options: ConversationListOptions
): () => void {
  const cleanupFns: (() => void)[] = [];

  // Delegate click on conversation items
  const cleanupClick = delegateEvent<HTMLElement>(
    container,
    'click',
    '.conversation-item',
    (e, item) => {
      // If clicking on checkbox, handle separately
      const target = e.target as HTMLElement;
      if (target.classList.contains('conversation-checkbox')) {
        return;
      }

      const id = parseInt(item.dataset.id || '0', 10);
      if (id) {
        options.onSelect(id);
      }
    }
  );
  cleanupFns.push(cleanupClick);

  // Delegate checkbox changes
  const cleanupCheckbox = delegateEvent<HTMLInputElement>(
    container,
    'change',
    '.conversation-checkbox',
    (e, checkbox) => {
      e.stopPropagation();
      const id = parseInt(checkbox.dataset.id || '0', 10);
      if (id) {
        options.onCheckboxChange(id, checkbox.checked);
        // Update visual state without full re-render
        const item = checkbox.closest('.conversation-item');
        item?.classList.toggle('selected', checkbox.checked);
      }
    }
  );
  cleanupFns.push(cleanupCheckbox);

  // Keyboard navigation (Enter/Space to select)
  const cleanupKeyboard = delegateEvent<HTMLElement>(
    container,
    'keydown',
    '.conversation-item',
    (e, item) => {
      const key = (e as KeyboardEvent).key;
      if (key === 'Enter' || key === ' ') {
        e.preventDefault();
        const id = parseInt(item.dataset.id || '0', 10);
        if (id) {
          options.onSelect(id);
        }
      }
    }
  );
  cleanupFns.push(cleanupKeyboard);

  // Return cleanup function
  return () => {
    cleanupFns.forEach((fn) => fn());
  };
}

/**
 * Renders the full conversation list
 */
export function renderConversationList(
  container: HTMLElement,
  conversations: Conversation[],
  selectedId: number | null,
  selectedIds: Set<number>,
  hasFilters: boolean
): void {
  if (conversations.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        ${hasFilters ? 'No conversations match filters' : 'No conversations yet'}
      </div>
    `;
    return;
  }

  // Toggle bulk-mode class based on selections
  container.classList.toggle('bulk-mode', selectedIds.size > 0);

  container.innerHTML = conversations
    .map((conv) =>
      renderConversationItem(
        conv,
        conv.id === selectedId,
        selectedIds.has(conv.id)
      )
    )
    .join('');
}
