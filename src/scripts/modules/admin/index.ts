/**
 * Admin Module - Public API
 */

// Conversation List
export {
  renderConversationItem,
  renderConversationList,
  setupConversationListEvents,
  type Conversation,
  type ConversationListOptions,
} from './ConversationListRenderer';

// Conversation Detail
export {
  renderConversationDetail,
  renderLoadingState,
  renderErrorState,
  renderEmptyState,
  renderSuccessState,
  type Message,
  type ConversationInfo,
  type DetailRendererOptions,
} from './ConversationDetailRenderer';

// Search
export {
  setupSearch,
  clearSearch,
  type SearchResult,
  type SearchRendererOptions,
} from './SearchRenderer';

// Filters
export {
  createEmptyFilters,
  countActiveFilters,
  hasActiveFilters,
  readFiltersFromForm,
  writeFiltersToForm,
  clearFilterForm,
  updateFilterBadge,
  renderFilterChips,
  filtersToUrlParams,
  filtersFromUrlParams,
  setupFiltersManager,
  type Filters,
  type FilterElements,
  type FiltersManagerOptions,
} from './FiltersManager';

// Bulk Actions
export {
  updateBulkUI,
  renderTagOptions,
  setupBulkActions,
  clearSelections,
  type BulkElements,
  type BulkActionsOptions,
} from './BulkActionsManager';
