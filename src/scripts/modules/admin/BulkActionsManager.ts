/**
 * BulkActionsManager
 *
 * Manages bulk selection and actions for conversations.
 */

export interface BulkElements {
  bar: HTMLElement;
  selectAllCheckbox: HTMLInputElement;
  selectedCount: HTMLElement;
  deleteBtn: HTMLElement;
  tagBtn: HTMLElement;
  exportBtn: HTMLElement;
  tagDropdown: HTMLElement;
  tagOptions: HTMLElement;
}

export interface BulkActionsOptions {
  onDelete: (ids: number[]) => Promise<void>;
  onTag: (ids: number[], tag: string) => Promise<void>;
  onExport: (ids: number[]) => Promise<void>;
  getAvailableTags: () => string[];
}

/**
 * Updates the bulk action bar UI
 */
export function updateBulkUI(
  selectedIds: Set<number>,
  totalCount: number,
  elements: BulkElements
): void {
  const count = selectedIds.size;

  if (count > 0) {
    elements.bar.classList.remove('hidden');
    elements.selectedCount.textContent = count.toString();
    elements.selectAllCheckbox.checked = count === totalCount && totalCount > 0;
    elements.selectAllCheckbox.indeterminate = count > 0 && count < totalCount;
  } else {
    elements.bar.classList.add('hidden');
  }
}

/**
 * Renders tag options in the dropdown
 */
export function renderTagOptions(
  tags: string[],
  container: HTMLElement,
  onSelect: (tag: string) => void
): void {
  if (tags.length === 0) {
    container.innerHTML = `
      <div class="tag-option empty">No tags available</div>
    `;
    return;
  }

  container.innerHTML = tags
    .map(
      (tag) => `
      <button class="tag-option" data-tag="${tag}">
        <span class="tag-color" style="background: var(--primary);"></span>
        ${tag}
      </button>
    `
    )
    .join('');

  // Add click handlers
  container.querySelectorAll('.tag-option[data-tag]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tag = (btn as HTMLElement).dataset.tag;
      if (tag) {
        onSelect(tag);
      }
    });
  });
}

/**
 * Sets up bulk action event listeners
 */
export function setupBulkActions(
  elements: BulkElements,
  selectedIds: Set<number>,
  conversations: { id: number }[],
  options: BulkActionsOptions,
  onSelectionChange: () => void
): () => void {
  const cleanupFns: (() => void)[] = [];

  // Select all checkbox
  const handleSelectAll = () => {
    if (elements.selectAllCheckbox.checked) {
      conversations.forEach((c) => selectedIds.add(c.id));
    } else {
      selectedIds.clear();
    }
    onSelectionChange();
  };

  elements.selectAllCheckbox.addEventListener('change', handleSelectAll);
  cleanupFns.push(() => elements.selectAllCheckbox.removeEventListener('change', handleSelectAll));

  // Delete button
  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    await options.onDelete(Array.from(selectedIds));
  };

  elements.deleteBtn.addEventListener('click', handleDelete);
  cleanupFns.push(() => elements.deleteBtn.removeEventListener('click', handleDelete));

  // Tag button - toggle dropdown
  const handleTagToggle = () => {
    if (selectedIds.size === 0) return;
    elements.tagDropdown.classList.toggle('hidden');

    if (!elements.tagDropdown.classList.contains('hidden')) {
      const tags = options.getAvailableTags();
      renderTagOptions(tags, elements.tagOptions, async (tag) => {
        elements.tagDropdown.classList.add('hidden');
        await options.onTag(Array.from(selectedIds), tag);
      });
    }
  };

  elements.tagBtn.addEventListener('click', handleTagToggle);
  cleanupFns.push(() => elements.tagBtn.removeEventListener('click', handleTagToggle));

  // Export button
  const handleExport = async () => {
    if (selectedIds.size === 0) return;
    await options.onExport(Array.from(selectedIds));
  };

  elements.exportBtn.addEventListener('click', handleExport);
  cleanupFns.push(() => elements.exportBtn.removeEventListener('click', handleExport));

  // Close tag dropdown when clicking outside
  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as Node;
    if (
      !elements.tagBtn.contains(target) &&
      !elements.tagDropdown.contains(target)
    ) {
      elements.tagDropdown.classList.add('hidden');
    }
  };

  document.addEventListener('click', handleClickOutside);
  cleanupFns.push(() => document.removeEventListener('click', handleClickOutside));

  return () => {
    cleanupFns.forEach((fn) => fn());
  };
}

/**
 * Clears all selections
 */
export function clearSelections(
  selectedIds: Set<number>,
  elements: BulkElements
): void {
  selectedIds.clear();
  elements.selectAllCheckbox.checked = false;
  elements.selectAllCheckbox.indeterminate = false;
  elements.bar.classList.add('hidden');
  elements.tagDropdown.classList.add('hidden');
}
