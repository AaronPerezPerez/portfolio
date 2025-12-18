/**
 * SearchManager
 * Handles global search functionality
 */

import { escapeHtml, formatRelativeTime } from './formatters';

export interface SearchResult {
  conversationId: number;
  messageId: number;
  userId: string;
  role: string;
  content: string;
  createdAt: string | null;
  highlight: string;
}

export interface SearchResponse {
  results: SearchResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  query: string;
}

export interface SearchCallbacks {
  onResultClick: (conversationId: number) => void;
  onUnauthorized: () => void;
}

export class SearchManager {
  private callbacks: SearchCallbacks;
  private container: HTMLElement | null;
  private inputEl: HTMLInputElement | null;
  private resultsEl: HTMLElement | null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private currentQuery = '';
  private isLoading = false;

  constructor(
    callbacks: SearchCallbacks,
    inputId = 'search-input',
    resultsId = 'search-results'
  ) {
    this.callbacks = callbacks;
    this.inputEl = document.getElementById(inputId) as HTMLInputElement;
    this.resultsEl = document.getElementById(resultsId);
    this.container = this.inputEl?.parentElement ?? null;

    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    if (!this.inputEl) return;

    // Input with debounce
    this.inputEl.addEventListener('input', () => {
      this.handleInput();
    });

    // Focus/blur for showing/hiding results
    this.inputEl.addEventListener('focus', () => {
      if (this.currentQuery.length >= 2) {
        this.showResults();
      }
    });

    // Click outside to close
    document.addEventListener('click', (e) => {
      if (!this.container?.contains(e.target as Node)) {
        this.hideResults();
      }
    });

    // Keyboard shortcuts
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideResults();
        this.inputEl?.blur();
      }
    });

    // Global keyboard shortcut: "/" to focus search
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== this.inputEl) {
        e.preventDefault();
        this.inputEl?.focus();
      }
    });
  }

  /**
   * Handle input changes with debounce
   */
  private handleInput(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    const query = this.inputEl?.value.trim() || '';
    this.currentQuery = query;

    if (query.length < 2) {
      this.hideResults();
      return;
    }

    this.debounceTimer = setTimeout(() => {
      this.search(query);
    }, 300);
  }

  /**
   * Perform search
   */
  async search(query: string): Promise<void> {
    if (this.isLoading) return;
    this.isLoading = true;

    this.showLoading();

    try {
      const response = await fetch(
        `/api/admin/search?q=${encodeURIComponent(query)}&limit=10`
      );

      if (!response.ok) {
        if (response.status === 401) {
          this.callbacks.onUnauthorized();
          return;
        }
        throw new Error('Search failed');
      }

      const data = (await response.json()) as SearchResponse;
      this.renderResults(data);
    } catch (error) {
      console.error('Search error:', error);
      this.renderError();
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Show loading state
   */
  private showLoading(): void {
    if (!this.resultsEl) return;

    this.resultsEl.innerHTML = `
      <div class="p-4 text-center text-[var(--text-muted)] font-mono text-sm">
        Searching...
      </div>
    `;
    this.showResults();
  }

  /**
   * Render search results
   */
  private renderResults(data: SearchResponse): void {
    if (!this.resultsEl) return;

    if (data.results.length === 0) {
      this.resultsEl.innerHTML = `
        <div class="p-4 text-center text-[var(--text-muted)] font-mono text-sm">
          No results found for "${escapeHtml(data.query)}"
        </div>
      `;
      this.showResults();
      return;
    }

    const resultsHtml = data.results
      .map((result) => this.renderResultItem(result))
      .join('');

    const footer =
      data.pagination.total > data.results.length
        ? `
        <div class="p-3 text-center text-xs text-[var(--text-muted)] border-t border-[var(--border-color)]">
          Showing ${data.results.length} of ${data.pagination.total} results
        </div>
      `
        : '';

    this.resultsEl.innerHTML = resultsHtml + footer;

    // Add click handlers
    this.resultsEl.querySelectorAll('[data-conversation-id]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = parseInt(
          el.getAttribute('data-conversation-id') || '0',
          10
        );
        if (id) {
          this.callbacks.onResultClick(id);
          this.hideResults();
          if (this.inputEl) this.inputEl.value = '';
        }
      });
    });

    this.showResults();
  }

  /**
   * Render a single result item
   */
  private renderResultItem(result: SearchResult): string {
    const timeAgo = result.createdAt
      ? formatRelativeTime(result.createdAt)
      : '';

    // Convert highlight markers to HTML
    const highlightedContent = escapeHtml(result.highlight)
      .replace(/\[\[MATCH\]\]/g, '<mark class="search-highlight">')
      .replace(/\[\[\/MATCH\]\]/g, '</mark>');

    return `
      <div
        data-conversation-id="${result.conversationId}"
        class="search-result p-3 cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors border-b border-[var(--border-color)] last:border-b-0"
      >
        <div class="flex items-center justify-between mb-1">
          <span class="font-mono text-xs text-[var(--primary)]">
            ${result.userId.substring(0, 8)}...
          </span>
          <span class="text-xs text-[var(--text-muted)]">${timeAgo}</span>
        </div>
        <div class="text-sm text-[var(--text-primary)]">
          ${highlightedContent}
        </div>
        <div class="text-xs text-[var(--text-muted)] mt-1">
          ${result.role === 'user' ? 'User message' : 'AI response'}
        </div>
      </div>
    `;
  }

  /**
   * Render error state
   */
  private renderError(): void {
    if (!this.resultsEl) return;

    this.resultsEl.innerHTML = `
      <div class="p-4 text-center text-red-400 font-mono text-sm">
        Search failed. Please try again.
      </div>
    `;
    this.showResults();
  }

  /**
   * Show results dropdown
   */
  private showResults(): void {
    this.resultsEl?.classList.remove('hidden');
  }

  /**
   * Hide results dropdown
   */
  private hideResults(): void {
    this.resultsEl?.classList.add('hidden');
  }

  /**
   * Clear search
   */
  clear(): void {
    if (this.inputEl) this.inputEl.value = '';
    this.currentQuery = '';
    this.hideResults();
  }
}
