/**
 * AI Chat Widget
 * Terminal-style chat interface for interacting with Aaron's AI
 */

import type { Message } from './types';
import { sendChatMessage, loadChatHistory, clearChatHistory } from './api';

const USER_ID_KEY = 'aaron-chat-user-id';

/**
 * Get or generate a persistent user ID
 */
function getUserId(): string {
  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}

/**
 * DOM element references for the chat widget
 */
interface ChatElements {
  widget: HTMLElement;
  toggle: HTMLButtonElement;
  window: HTMLElement;
  messagesContainer: HTMLElement;
  input: HTMLInputElement;
  sendBtn: HTMLButtonElement;
  clearBtn: HTMLButtonElement;
  typingIndicator: HTMLElement;
  presetBtns: NodeListOf<HTMLButtonElement>;
  dotRed: HTMLElement;
  dotYellow: HTMLElement;
  dotGreen: HTMLElement;
}

export class AIChatWidget {
  private elements: ChatElements;
  private messages: Message[] = [];
  private isOpen = false;
  private isLoading = false;
  private userId = '';
  private historyLoaded = false;

  constructor(element: HTMLElement) {
    this.elements = {
      widget: element,
      toggle: element.querySelector('.chat-toggle')!,
      window: element.querySelector('.chat-window')!,
      messagesContainer: element.querySelector('.messages-container')!,
      input: element.querySelector('.chat-input')!,
      sendBtn: element.querySelector('.send-btn')!,
      clearBtn: element.querySelector('.clear-btn')!,
      typingIndicator: element.querySelector('.typing-indicator')!,
      presetBtns: element.querySelectorAll('.preset-btn'),
      dotRed: element.querySelector('.dot-red')!,
      dotYellow: element.querySelector('.dot-yellow')!,
      dotGreen: element.querySelector('.dot-green')!,
    };

    this.init();
  }

  private init(): void {
    this.userId = getUserId();
    this.loadHistory();
    this.bindEvents();
  }

  private bindEvents(): void {
    const { toggle, sendBtn, input, presetBtns, clearBtn, dotRed, dotYellow, dotGreen, widget } =
      this.elements;

    // Toggle chat
    toggle.addEventListener('click', () => this.toggleChat());

    // Send message
    sendBtn.addEventListener('click', () => this.sendMessage());
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Preset questions
    presetBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const question = btn.dataset.question;
        if (question) {
          input.value = question;
          this.sendMessage();
        }
      });
    });

    // Clear chat
    clearBtn.addEventListener('click', () => this.clearChat());

    // Header dots functionality
    dotRed.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeChat();
    });

    dotYellow.addEventListener('click', (e) => {
      e.stopPropagation();
      this.elements.window.classList.remove('expanded');
    });

    dotGreen.addEventListener('click', (e) => {
      e.stopPropagation();
      this.elements.window.classList.add('expanded');
    });

    // Close on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closeChat();
      }
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (this.isOpen && !widget.contains(e.target as Node)) {
        this.closeChat();
      }
    });
  }

  private toggleChat(): void {
    this.isOpen ? this.closeChat() : this.openChat();
  }

  openChat(): void {
    this.isOpen = true;
    this.elements.widget.classList.add('open');
    this.elements.toggle.setAttribute('aria-expanded', 'true');
    this.elements.window.setAttribute('aria-hidden', 'false');
    setTimeout(() => this.elements.input.focus(), 100);
  }

  closeChat(): void {
    this.isOpen = false;
    this.elements.widget.classList.remove('open');
    this.elements.toggle.setAttribute('aria-expanded', 'false');
    this.elements.window.setAttribute('aria-hidden', 'true');
  }

  private async loadHistory(): Promise<void> {
    if (!this.userId) {
      this.historyLoaded = true;
      return;
    }

    try {
      this.messages = await loadChatHistory(this.userId);
      this.renderMessages();
    } catch (error) {
      console.error('Failed to load chat history:', error);
    } finally {
      this.historyLoaded = true;
    }
  }

  private async waitForHistory(): Promise<void> {
    if (this.historyLoaded) return;

    let waited = 0;
    while (!this.historyLoaded && waited < 2000) {
      await new Promise((r) => setTimeout(r, 100));
      waited += 100;
    }
  }

  private async sendMessage(): Promise<void> {
    const content = this.elements.input.value.trim();
    if (!content || this.isLoading) return;

    await this.waitForHistory();

    // Add user message
    this.messages.push({ role: 'user', content });
    this.renderMessages();
    this.elements.input.value = '';

    this.setLoading(true);

    try {
      const data = await sendChatMessage(this.messages, this.userId);
      const assistantMessage = data.response || '';

      // Check if Steam badge was unlocked via cheat code
      if (data.steamUnlocked) {
        this.unlockSteamBadge();
      }

      this.messages.push({ role: 'assistant', content: assistantMessage });
      this.renderMessages();
    } catch (error) {
      console.error('Chat error:', error);
      this.showError('Error conectando con la API. Intenta de nuevo.');

      // Remove the failed user message if assistant response failed
      if (
        this.messages[this.messages.length - 1]?.role === 'assistant' &&
        !this.messages[this.messages.length - 1]?.content
      ) {
        this.messages.pop();
      }
    } finally {
      this.setLoading(false);
    }
  }

  private renderMessages(): void {
    const { messagesContainer, widget } = this.elements;
    const currentCount = messagesContainer.children.length;
    const targetCount = this.messages.length;

    // If messages were cleared, remove all children
    if (targetCount === 0 && currentCount > 0) {
      messagesContainer.innerHTML = '';
    }
    // Only append new messages (batch DOM updates)
    else if (targetCount > currentCount) {
      const fragment = document.createDocumentFragment();
      for (let i = currentCount; i < targetCount; i++) {
        const msg = this.messages[i];
        const div = document.createElement('div');
        div.className = `message ${msg.role}`;
        const content = document.createElement('div');
        content.className = 'message-content';
        content.textContent = msg.content;
        div.appendChild(content);
        fragment.appendChild(div);
      }
      messagesContainer.appendChild(fragment);
    }

    // Update has-messages class
    widget.classList.toggle('has-messages', this.messages.length > 0);

    // Scroll to bottom
    const chatMessages = widget.querySelector('.chat-messages');
    if (chatMessages) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  private setLoading(loading: boolean): void {
    this.isLoading = loading;
    this.elements.sendBtn.disabled = loading;
    this.elements.typingIndicator.hidden = !loading;

    if (loading) {
      const chatMessages = this.elements.widget.querySelector('.chat-messages');
      if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    }
  }

  private showError(message: string): void {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    this.elements.messagesContainer.appendChild(errorDiv);

    setTimeout(() => errorDiv.remove(), 5000);
  }

  private async clearChat(): Promise<void> {
    this.messages = [];
    this.renderMessages();

    if (this.userId) {
      try {
        await clearChatHistory(this.userId);
      } catch (error) {
        console.error('Failed to clear chat on server:', error);
      }
    }
  }

  private unlockSteamBadge(): void {
    localStorage.setItem('steam_badge_unlocked', 'true');

    const steamBadge = document.getElementById('steam-badge');
    if (steamBadge) {
      steamBadge.style.display = 'inline-flex';
      steamBadge.classList.add('badge-unlocked');
    }
  }
}

/**
 * Initialize all chat widgets on the page
 * Skips elements that are already initialized to prevent duplicates
 */
export function initChatWidgets(): void {
  document.querySelectorAll<HTMLElement>('[data-chat-widget]').forEach((el) => {
    if (!el.dataset.initialized) {
      el.dataset.initialized = 'true';
      new AIChatWidget(el);
    }
  });
}
