/**
 * ConversationDetailRenderer
 *
 * Renders conversation detail view with message bubbles.
 */

export interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string | null;
}

export interface ConversationInfo {
  id: number;
  user_id: string;
  created_at: string | null;
}

export interface DetailRendererOptions {
  onDelete: (conversationId: number) => void;
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
 * Formats date for display
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  return date.toLocaleString();
}

/**
 * Formats time for message bubbles
 */
function formatTime(dateString: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Renders the conversation detail header
 */
function renderDetailHeader(conversation: ConversationInfo): string {
  return `
    <div class="detail-header">
      <div class="detail-header-row">
        <div class="detail-user">
          <span class="prompt">&gt;</span>
          <span class="user-id">User: ${escapeHtml(conversation.user_id)}</span>
        </div>
        <button class="delete-btn" data-conversation-id="${conversation.id}">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
          DELETE
        </button>
      </div>
      <div class="detail-date">Started: ${formatDate(conversation.created_at)}</div>
    </div>
  `;
}

/**
 * Renders a single message bubble
 */
function renderMessage(message: Message): string {
  const roleLabel = message.role === 'user' ? 'USER' : 'AARON.AI';
  const time = formatTime(message.created_at);

  return `
    <div class="admin-message ${message.role}">
      <div class="admin-message-meta">
        ${roleLabel}${time ? ` · ${time}` : ''}
      </div>
      <div class="admin-message-content">${escapeHtml(message.content)}</div>
    </div>
  `;
}

/**
 * Renders loading state
 */
export function renderLoadingState(container: HTMLElement): void {
  container.innerHTML = `
    <div class="loading-state">
      <div>Loading messages...</div>
    </div>
  `;
}

/**
 * Renders error state
 */
export function renderErrorState(container: HTMLElement, message = 'Failed to load conversation'): void {
  container.innerHTML = `
    <div class="error-state">
      <div>${escapeHtml(message)}</div>
    </div>
  `;
}

/**
 * Renders empty state (no conversation selected)
 */
export function renderEmptyState(container: HTMLElement): void {
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">&gt;_</div>
      <div class="empty-text">Select a conversation</div>
    </div>
  `;
}

/**
 * Renders success state (e.g., after bulk export)
 */
export function renderSuccessState(
  container: HTMLElement,
  icon: string,
  title: string,
  subtitle?: string
): void {
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon" style="color: var(--color-neon-green); opacity: 1;">
        ${icon}
      </div>
      <div style="color: var(--color-neon-green);">${escapeHtml(title)}</div>
      ${subtitle ? `<div class="empty-text" style="margin-top: 0.5rem; font-size: 0.75rem;">${escapeHtml(subtitle)}</div>` : ''}
    </div>
  `;
}

/**
 * Renders full conversation detail
 */
export function renderConversationDetail(
  container: HTMLElement,
  conversation: ConversationInfo,
  messages: Message[],
  options: DetailRendererOptions
): void {
  const header = renderDetailHeader(conversation);
  const messagesHtml = messages.map(renderMessage).join('');

  container.innerHTML = header + `<div class="messages-list">${messagesHtml}</div>`;

  // Scroll to bottom
  container.scrollTop = container.scrollHeight;

  // Add delete button handler
  const deleteBtn = container.querySelector('.delete-btn');
  deleteBtn?.addEventListener('click', () => {
    const id = parseInt(deleteBtn.getAttribute('data-conversation-id') || '0', 10);
    if (id) {
      options.onDelete(id);
    }
  });
}
