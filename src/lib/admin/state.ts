/**
 * AdminState
 * Centralized state management for admin panel
 */

export interface Conversation {
  id: number;
  user_id: string;
  created_at: string | null;
  message_count: number;
  last_message_at: string | null;
  last_message: string | null;
}

export interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string | null;
}

export interface GlobalStats {
  total_conversations: number;
  total_messages: number;
  messages_today: number;
}

export interface LiveUser {
  id: string;
  lastActivity: string;
}

export type AdminTab = 'conversations' | 'analytics' | 'trash' | 'settings' | 'moderation';

export interface AdminState {
  authenticated: boolean;
  currentTab: AdminTab;
  conversations: Conversation[];
  selectedConversationId: number | null;
  stats: GlobalStats | null;
  liveUsers: LiveUser[];
  liveCount: number;
}

/**
 * Creates the initial admin state
 */
export function createInitialState(tab: AdminTab): AdminState {
  return {
    authenticated: false,
    currentTab: tab,
    conversations: [],
    selectedConversationId: null,
    stats: null,
    liveUsers: [],
    liveCount: 0,
  };
}

/**
 * State updater type
 */
export type StateUpdater = (
  updater: (state: AdminState) => Partial<AdminState>
) => void;
