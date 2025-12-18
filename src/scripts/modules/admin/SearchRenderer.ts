/**
 * SearchRenderer
 *
 * Renders search results dropdown with event delegation.
 */

import { delegateEvent } from '../shared/dom-helpers';

/**
 * Simple debounce for string argument functions
 */
function debounceSearch(
  fn: (query: string) => void,
  delay: number
): (query: string) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (query: string) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(query), delay);
  };
}

export interface SearchResult {
  conversationId: number;
  userId: string;
  snippet: string;
  matchCount: number;
  createdAt: string;
}

export interface SearchRendererOptions {
  onResultClick: (conversationId: number) => void;
  onSearch: (query: string) => Promise<SearchResult[]>;
  minQueryLength?: number;
  debounceMs?: number;
}

/**
 * Escapes HTML
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Highlights search terms in text
 */
function highlightTerms(text: string, query: string): string {
  if (!query.trim()) return escapeHtml(text);

  const escaped = escapeHtml(text);
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

  let result = escaped;
  terms.forEach((term) => {
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    result = result.replace(regex, '<mark class="search-highlight">$1</mark>');
  });

  return result;
}

/**
 * Formats relative time
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
 * Renders a single search result item
 */
function renderSearchResultItem(result: SearchResult, query: string): string {
  const shortId = result.userId.substring(0, 8);
  const highlightedSnippet = highlightTerms(result.snippet, query);

  return `
    <div class="search-result-item" data-conversation-id="${result.conversationId}">
      <div class="search-result-header">
        <span class="search-result-user">${shortId}...</span>
        <span class="search-result-time">${formatTimeAgo(result.createdAt)}</span>
      </div>
      <div class="search-result-snippet">${highlightedSnippet}</div>
      <div class="search-result-meta">
        <span class="match-count">${result.matchCount}</span> matches
      </div>
    </div>
  `;
}

/**
 * Renders loading state
 */
function renderSearchLoading(): string {
  return `
    <div class="search-loading">
      <span class="loading-spinner"></span>
      Searching...
    </div>
  `;
}

/**
 * Renders no results state
 */
function renderNoResults(query: string): string {
  return `
    <div class="search-no-results">
      No results for "${escapeHtml(query)}"
    </div>
  `;
}

/**
 * Sets up search functionality with debouncing and event delegation
 */
export function setupSearch(
  inputElement: HTMLInputElement,
  resultsContainer: HTMLElement,
  options: SearchRendererOptions
): () => void {
  const {
    onResultClick,
    onSearch,
    minQueryLength = 2,
    debounceMs = 300,
  } = options;

  const cleanupFns: (() => void)[] = [];
  let currentQuery = '';
  let isSearching = false;

  const showResults = () => {
    resultsContainer.classList.remove('hidden');
  };

  const hideResults = () => {
    resultsContainer.classList.add('hidden');
  };

  const performSearch = async (query: string) => {
    if (query.length < minQueryLength) {
      hideResults();
      return;
    }

    currentQuery = query;
    isSearching = true;

    // Show loading
    resultsContainer.innerHTML = renderSearchLoading();
    showResults();

    try {
      const results = await onSearch(query);

      // Check if query changed while searching
      if (query !== currentQuery) return;

      if (results.length === 0) {
        resultsContainer.innerHTML = renderNoResults(query);
      } else {
        resultsContainer.innerHTML = results
          .map((r) => renderSearchResultItem(r, query))
          .join('');
      }
    } catch (error) {
      console.error('Search failed:', error);
      resultsContainer.innerHTML = `
        <div class="search-error">Search failed</div>
      `;
    } finally {
      isSearching = false;
    }
  };

  // Debounced search
  const debouncedSearch = debounceSearch(performSearch, debounceMs);

  // Input handler
  const handleInput = () => {
    const query = inputElement.value.trim();
    if (query.length < minQueryLength) {
      hideResults();
      return;
    }
    debouncedSearch(query);
  };

  inputElement.addEventListener('input', handleInput);
  cleanupFns.push(() => inputElement.removeEventListener('input', handleInput));

  // Focus handler - show results if there's a query
  const handleFocus = () => {
    if (inputElement.value.trim().length >= minQueryLength && resultsContainer.innerHTML) {
      showResults();
    }
  };

  inputElement.addEventListener('focus', handleFocus);
  cleanupFns.push(() => inputElement.removeEventListener('focus', handleFocus));

  // Click outside to close
  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as Node;
    if (!inputElement.contains(target) && !resultsContainer.contains(target)) {
      hideResults();
    }
  };

  document.addEventListener('click', handleClickOutside);
  cleanupFns.push(() => document.removeEventListener('click', handleClickOutside));

  // Keyboard shortcut (/) to focus search
  const handleKeyboardShortcut = (e: KeyboardEvent) => {
    if (e.key === '/' && document.activeElement !== inputElement) {
      e.preventDefault();
      inputElement.focus();
    }
    if (e.key === 'Escape') {
      hideResults();
      inputElement.blur();
    }
  };

  document.addEventListener('keydown', handleKeyboardShortcut);
  cleanupFns.push(() => document.removeEventListener('keydown', handleKeyboardShortcut));

  // Event delegation for result clicks
  const cleanupResultClick = delegateEvent<HTMLElement>(
    resultsContainer,
    'click',
    '.search-result-item',
    (_, item) => {
      const conversationId = parseInt(item.dataset.conversationId || '0', 10);
      if (conversationId) {
        onResultClick(conversationId);
        hideResults();
        inputElement.value = '';
      }
    }
  );
  cleanupFns.push(cleanupResultClick);

  // Return cleanup function
  return () => {
    cleanupFns.forEach((fn) => fn());
  };
}

/**
 * Clears search state
 */
export function clearSearch(
  inputElement: HTMLInputElement,
  resultsContainer: HTMLElement
): void {
  inputElement.value = '';
  resultsContainer.innerHTML = '';
  resultsContainer.classList.add('hidden');
}
