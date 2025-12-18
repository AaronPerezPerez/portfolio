/**
 * Admin Module - Public API
 */

// Main orchestrator
export { AdminPanel } from './AdminPanel';

// State management
export {
  createInitialState,
  type AdminState,
  type AdminTab,
  type Conversation,
  type Message,
  type GlobalStats,
  type LiveUser,
  type StateUpdater,
} from './state';

// Managers
export { AuthManager, type AuthCallbacks } from './AuthManager';
export { ConversationsManager, type ConversationsCallbacks } from './ConversationsManager';
export { AnalyticsManager, type AnalyticsCallbacks } from './AnalyticsManager';
export { LiveManager, type LiveCallbacks } from './LiveManager';
export { SearchManager, type SearchCallbacks, type SearchResult, type SearchResponse } from './SearchManager';

// Utilities
export * from './formatters';
