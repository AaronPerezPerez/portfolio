/**
 * FiltersManager
 *
 * Manages conversation filters state and UI.
 */

export interface Filters {
  dateFrom: string | null;
  dateTo: string | null;
  language: string | null;
  minMessages: number | null;
  maxMessages: number | null;
  hasTag: string | null;
}

export interface FilterElements {
  toggle: HTMLElement;
  panel: HTMLElement;
  chevron: HTMLElement;
  dateFrom: HTMLInputElement;
  dateTo: HTMLInputElement;
  language: HTMLSelectElement;
  minMessages: HTMLInputElement;
  maxMessages: HTMLInputElement;
  tagSelect: HTMLSelectElement;
  applyBtn: HTMLElement;
  clearBtn: HTMLElement;
  chipsContainer: HTMLElement;
  countBadge: HTMLElement;
}

export interface FiltersManagerOptions {
  onApply: (filters: Filters) => void;
  onClear: () => void;
}

/**
 * Creates initial empty filters state
 */
export function createEmptyFilters(): Filters {
  return {
    dateFrom: null,
    dateTo: null,
    language: null,
    minMessages: null,
    maxMessages: null,
    hasTag: null,
  };
}

/**
 * Counts active filters
 */
export function countActiveFilters(filters: Filters): number {
  return Object.values(filters).filter((v) => v !== null && v !== '').length;
}

/**
 * Checks if any filters are active
 */
export function hasActiveFilters(filters: Filters): boolean {
  return countActiveFilters(filters) > 0;
}

/**
 * Reads filters from form elements
 */
export function readFiltersFromForm(elements: FilterElements): Filters {
  return {
    dateFrom: elements.dateFrom.value || null,
    dateTo: elements.dateTo.value || null,
    language: elements.language.value || null,
    minMessages: elements.minMessages.value ? parseInt(elements.minMessages.value, 10) : null,
    maxMessages: elements.maxMessages.value ? parseInt(elements.maxMessages.value, 10) : null,
    hasTag: elements.tagSelect.value || null,
  };
}

/**
 * Writes filters to form elements
 */
export function writeFiltersToForm(filters: Filters, elements: FilterElements): void {
  elements.dateFrom.value = filters.dateFrom || '';
  elements.dateTo.value = filters.dateTo || '';
  elements.language.value = filters.language || '';
  elements.minMessages.value = filters.minMessages?.toString() || '';
  elements.maxMessages.value = filters.maxMessages?.toString() || '';
  elements.tagSelect.value = filters.hasTag || '';
}

/**
 * Clears all form elements
 */
export function clearFilterForm(elements: FilterElements): void {
  elements.dateFrom.value = '';
  elements.dateTo.value = '';
  elements.language.value = '';
  elements.minMessages.value = '';
  elements.maxMessages.value = '';
  elements.tagSelect.value = '';
}

/**
 * Updates the filter count badge
 */
export function updateFilterBadge(count: number, badgeElement: HTMLElement): void {
  if (count > 0) {
    badgeElement.textContent = count.toString();
    badgeElement.classList.remove('hidden');
  } else {
    badgeElement.classList.add('hidden');
  }
}

/**
 * Renders filter chips for active filters
 */
export function renderFilterChips(filters: Filters, container: HTMLElement): void {
  const chips: string[] = [];

  if (filters.dateFrom) {
    chips.push(`<span class="filter-chip" data-filter="dateFrom">From: ${filters.dateFrom} <button class="chip-remove" data-filter="dateFrom">×</button></span>`);
  }
  if (filters.dateTo) {
    chips.push(`<span class="filter-chip" data-filter="dateTo">To: ${filters.dateTo} <button class="chip-remove" data-filter="dateTo">×</button></span>`);
  }
  if (filters.language) {
    const langLabel = filters.language === 'es' ? 'Spanish' : 'English';
    chips.push(`<span class="filter-chip" data-filter="language">${langLabel} <button class="chip-remove" data-filter="language">×</button></span>`);
  }
  if (filters.minMessages) {
    chips.push(`<span class="filter-chip" data-filter="minMessages">Min: ${filters.minMessages} <button class="chip-remove" data-filter="minMessages">×</button></span>`);
  }
  if (filters.maxMessages) {
    chips.push(`<span class="filter-chip" data-filter="maxMessages">Max: ${filters.maxMessages} <button class="chip-remove" data-filter="maxMessages">×</button></span>`);
  }
  if (filters.hasTag) {
    chips.push(`<span class="filter-chip" data-filter="hasTag">Tag: ${filters.hasTag} <button class="chip-remove" data-filter="hasTag">×</button></span>`);
  }

  if (chips.length > 0) {
    container.innerHTML = chips.join('');
    container.classList.remove('hidden');
  } else {
    container.classList.add('hidden');
  }
}

/**
 * Serializes filters to URL search params
 */
export function filtersToUrlParams(filters: Filters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.language) params.set('language', filters.language);
  if (filters.minMessages) params.set('minMessages', filters.minMessages.toString());
  if (filters.maxMessages) params.set('maxMessages', filters.maxMessages.toString());
  if (filters.hasTag) params.set('hasTag', filters.hasTag);

  return params;
}

/**
 * Parses filters from URL search params
 */
export function filtersFromUrlParams(params: URLSearchParams): Filters {
  return {
    dateFrom: params.get('dateFrom'),
    dateTo: params.get('dateTo'),
    language: params.get('language'),
    minMessages: params.get('minMessages') ? parseInt(params.get('minMessages')!, 10) : null,
    maxMessages: params.get('maxMessages') ? parseInt(params.get('maxMessages')!, 10) : null,
    hasTag: params.get('hasTag'),
  };
}

/**
 * Sets up filter panel toggle
 */
export function setupFilterToggle(
  toggleBtn: HTMLElement,
  panel: HTMLElement,
  chevron: HTMLElement
): () => void {
  const handleClick = () => {
    panel.classList.toggle('hidden');
    chevron.classList.toggle('open');
  };

  toggleBtn.addEventListener('click', handleClick);
  return () => toggleBtn.removeEventListener('click', handleClick);
}

/**
 * Sets up filter form event listeners
 */
export function setupFiltersManager(
  elements: FilterElements,
  options: FiltersManagerOptions
): () => void {
  const cleanupFns: (() => void)[] = [];

  // Toggle panel
  const cleanupToggle = setupFilterToggle(
    elements.toggle,
    elements.panel,
    elements.chevron
  );
  cleanupFns.push(cleanupToggle);

  // Apply button
  const handleApply = () => {
    const filters = readFiltersFromForm(elements);
    options.onApply(filters);
  };

  elements.applyBtn.addEventListener('click', handleApply);
  cleanupFns.push(() => elements.applyBtn.removeEventListener('click', handleApply));

  // Clear button
  const handleClear = () => {
    clearFilterForm(elements);
    options.onClear();
  };

  elements.clearBtn.addEventListener('click', handleClear);
  cleanupFns.push(() => elements.clearBtn.removeEventListener('click', handleClear));

  // Chip remove buttons (event delegation)
  const handleChipClick = (e: Event) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('chip-remove')) {
      const filterKey = target.dataset.filter as keyof Filters;
      if (filterKey) {
        // Clear the specific filter
        const currentFilters = readFiltersFromForm(elements);
        currentFilters[filterKey] = null;
        writeFiltersToForm(currentFilters, elements);
        options.onApply(currentFilters);
      }
    }
  };

  elements.chipsContainer.addEventListener('click', handleChipClick);
  cleanupFns.push(() => elements.chipsContainer.removeEventListener('click', handleChipClick));

  return () => {
    cleanupFns.forEach((fn) => fn());
  };
}
