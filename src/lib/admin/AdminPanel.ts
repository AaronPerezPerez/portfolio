/**
 * AdminPanel
 * Main orchestrator for the admin panel
 */

import {
  createInitialState,
  type AdminState,
  type AdminTab,
  type GlobalStats,
  type Conversation,
  type LiveUser,
} from './state';
import { AuthManager } from './AuthManager';
import { ConversationsManager } from './ConversationsManager';
import { AnalyticsManager } from './AnalyticsManager';
import { LiveManager } from './LiveManager';
import { SearchManager } from './SearchManager';

export class AdminPanel {
  private state: AdminState;
  private authManager: AuthManager;
  private conversationsManager: ConversationsManager;
  private analyticsManager: AnalyticsManager;
  private liveManager: LiveManager;
  private searchManager: SearchManager;

  // DOM elements
  private loginView: HTMLElement | null;
  private adminView: HTMLElement | null;
  private passwordInput: HTMLInputElement | null;
  private loginError: HTMLElement | null;
  private loginForm: HTMLFormElement | null;
  private logoutBtn: HTMLElement | null;

  constructor(initialTab: AdminTab) {
    this.state = createInitialState(initialTab);

    // Initialize DOM references
    this.loginView = document.getElementById('login-view');
    this.adminView = document.getElementById('admin-view');
    this.passwordInput = document.getElementById('password-input') as HTMLInputElement;
    this.loginError = document.getElementById('login-error');
    this.loginForm = document.getElementById('login-form') as HTMLFormElement;
    this.logoutBtn = document.getElementById('logout-btn');

    // Initialize managers
    this.authManager = new AuthManager({
      onAuthenticated: () => this.handleAuthenticated(),
      onUnauthenticated: () => this.handleUnauthenticated(),
      onError: (message) => this.showLoginError(message),
    });

    this.conversationsManager = new ConversationsManager({
      onStatsUpdated: (stats) => this.updateStats(stats),
      onConversationsLoaded: (convs) => this.handleConversationsLoaded(convs),
      onConversationSelected: (id) => this.handleConversationSelected(id),
      onUnauthorized: () => this.authManager.logout(),
    });

    this.analyticsManager = new AnalyticsManager({
      onStatsUpdated: (stats) => this.updateStats(stats),
      onUnauthorized: () => this.authManager.logout(),
    });

    this.liveManager = new LiveManager({
      onUpdate: (count, users) => this.updateLiveIndicator(count, users),
      onDisconnect: () => this.hideLiveIndicator(),
    });

    this.searchManager = new SearchManager({
      onResultClick: (id) => this.handleSearchResultClick(id),
      onUnauthorized: () => this.authManager.logout(),
    });
  }

  /**
   * Initialize the admin panel
   */
  async init(): Promise<void> {
    this.setupEventListeners();
    await this.authManager.checkAuth();
  }

  /**
   * Setup DOM event listeners
   */
  private setupEventListeners(): void {
    this.loginForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleLogin();
    });

    this.logoutBtn?.addEventListener('click', () => {
      this.handleLogout();
    });
  }

  /**
   * Handle login form submission
   */
  private async handleLogin(): Promise<void> {
    const password = this.passwordInput?.value || '';
    await this.authManager.login(password);
  }

  /**
   * Handle logout
   */
  private async handleLogout(): Promise<void> {
    this.liveManager.stop();
    this.analyticsManager.destroy();
    this.searchManager.clear();
    await this.authManager.logout();
  }

  /**
   * Called when user is authenticated
   */
  private async handleAuthenticated(): Promise<void> {
    this.state.authenticated = true;
    this.showAdminView();
    this.liveManager.start();

    // Load tab-specific data
    if (this.state.currentTab === 'conversations') {
      await this.conversationsManager.load();
    } else if (this.state.currentTab === 'analytics') {
      await this.analyticsManager.load();
    }
  }

  /**
   * Called when user is not authenticated
   */
  private handleUnauthenticated(): void {
    this.state.authenticated = false;
    this.liveManager.stop();
    this.showLoginView();
  }

  /**
   * Show login view
   */
  private showLoginView(): void {
    this.loginView?.classList.remove('hidden');
    this.adminView?.classList.add('hidden');
    this.loginError?.classList.add('hidden');
    this.passwordInput?.focus();
  }

  /**
   * Show admin view
   */
  private showAdminView(): void {
    this.loginView?.classList.add('hidden');
    this.adminView?.classList.remove('hidden');
  }

  /**
   * Show login error
   */
  private showLoginError(_message: string): void {
    this.loginError?.classList.remove('hidden');
    if (this.passwordInput) {
      this.passwordInput.value = '';
      this.passwordInput.focus();
    }
  }

  /**
   * Update stats in the header
   */
  private updateStats(stats: GlobalStats): void {
    this.state.stats = stats;

    const convEl = document.getElementById('stat-conversations');
    const msgEl = document.getElementById('stat-messages');
    const todayEl = document.getElementById('stat-today');

    if (convEl) convEl.textContent = stats.total_conversations.toString();
    if (msgEl) msgEl.textContent = stats.total_messages.toString();
    if (todayEl) todayEl.textContent = stats.messages_today.toString();
  }

  /**
   * Handle conversations loaded
   */
  private handleConversationsLoaded(conversations: Conversation[]): void {
    this.state.conversations = conversations;
    this.conversationsManager.renderList(
      conversations,
      this.state.selectedConversationId
    );
  }

  /**
   * Handle conversation selection
   */
  private async handleConversationSelected(id: number): Promise<void> {
    this.state.selectedConversationId = id;

    // Re-render list to show selection
    this.conversationsManager.renderList(
      this.state.conversations,
      id
    );

    // Load conversation detail
    await this.conversationsManager.loadDetail(id);
  }

  /**
   * Update live indicator
   */
  private updateLiveIndicator(count: number, users: LiveUser[]): void {
    this.state.liveCount = count;
    this.state.liveUsers = users;

    const indicator = document.getElementById('live-indicator');
    const countEl = document.getElementById('live-count');

    if (count > 0) {
      indicator?.classList.remove('hidden');
      indicator?.classList.add('flex');
      if (countEl) countEl.textContent = count.toString();
    } else {
      this.hideLiveIndicator();
    }
  }

  /**
   * Hide live indicator
   */
  private hideLiveIndicator(): void {
    const indicator = document.getElementById('live-indicator');
    indicator?.classList.add('hidden');
    indicator?.classList.remove('flex');
  }

  /**
   * Handle search result click - navigate to conversation
   */
  private async handleSearchResultClick(conversationId: number): Promise<void> {
    // If we're not on conversations tab, navigate there
    if (this.state.currentTab !== 'conversations') {
      window.location.href = `/admin/conversations`;
      return;
    }

    // Load conversations if not already loaded
    if (this.state.conversations.length === 0) {
      await this.conversationsManager.load();
    }

    // Select the conversation
    await this.handleConversationSelected(conversationId);
  }
}
