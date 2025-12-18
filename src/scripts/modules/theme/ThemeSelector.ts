/**
 * Theme Selector
 * Terminal-style theme picker with keyboard navigation
 */

import { getThemeBackgroundColor, isGamingTheme, DEFAULT_THEME } from './theme-config';

type TabCategory = 'general' | 'gaming';

/**
 * DOM elements for the theme selector
 */
interface ThemeSelectorElements {
  selector: HTMLElement;
  toggle: HTMLButtonElement;
  dropdown: HTMLElement;
  tabButtons: NodeListOf<HTMLButtonElement>;
  tabPanels: NodeListOf<HTMLElement>;
}

export class ThemeSelector {
  private elements: ThemeSelectorElements;
  private isOpen = false;
  private focusedIndex = -1;
  private currentTab: TabCategory = 'general';

  constructor(element: HTMLElement) {
    this.elements = {
      selector: element,
      toggle: element.querySelector('.theme-toggle')!,
      dropdown: element.querySelector('.theme-dropdown')!,
      tabButtons: element.querySelectorAll('.tab-button'),
      tabPanels: element.querySelectorAll('.tab-panel'),
    };

    this.init();
  }

  private init(): void {
    const currentTheme = this.getCurrentTheme();
    this.setActiveOption(currentTheme);
    this.setInitialTab(currentTheme);

    this.bindEvents();
  }

  private bindEvents(): void {
    const { selector, toggle, tabButtons } = this.elements;

    // Toggle dropdown
    toggle.addEventListener('click', () => this.toggleDropdown());

    // Tab clicks
    tabButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const tab = button.dataset.tab as TabCategory;
        this.switchTab(tab);
      });
    });

    // Theme option clicks
    this.getAllOptions().forEach((option) => {
      option.addEventListener('click', () => {
        const themeId = option.dataset.themeId;
        if (themeId) {
          this.setTheme(themeId);
          this.closeDropdown();
        }
      });
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!selector.contains(e.target as Node)) {
        this.closeDropdown();
      }
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => this.handleKeydown(e));
  }

  private handleKeydown(e: KeyboardEvent): void {
    // Global shortcut "T" to toggle theme selector
    if (e.key.toLowerCase() === 't' && !this.isTyping(e)) {
      e.preventDefault();
      this.toggleDropdown();
      return;
    }

    if (!this.isOpen) return;

    switch (e.key) {
      case 'Escape':
        this.closeDropdown();
        this.elements.toggle.focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.navigateOptions(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.navigateOptions(-1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this.switchTab('general');
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.switchTab('gaming');
        break;
      case 'Enter':
        e.preventDefault();
        this.closeDropdown();
        this.elements.toggle.focus();
        break;
    }
  }

  private isTyping(e: KeyboardEvent): boolean {
    const target = e.target as HTMLElement;
    const tagName = target.tagName.toLowerCase();
    return tagName === 'input' || tagName === 'textarea' || target.isContentEditable;
  }

  private getAllOptions(): NodeListOf<HTMLButtonElement> {
    return this.elements.selector.querySelectorAll('.theme-option');
  }

  private getCurrentTabOptions(): HTMLButtonElement[] {
    const panel = this.elements.selector.querySelector(
      `.tab-panel[data-panel="${this.currentTab}"]`
    );
    return Array.from(panel?.querySelectorAll('.theme-option') || []);
  }

  private setInitialTab(themeId: string): void {
    const tab = isGamingTheme(themeId) ? 'gaming' : 'general';
    this.switchTab(tab, false);
  }

  private switchTab(tab: TabCategory, resetFocus = true): void {
    if (this.currentTab === tab) return;

    this.currentTab = tab;

    // Update tab buttons
    this.elements.tabButtons.forEach((button) => {
      const isActive = button.dataset.tab === tab;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-selected', String(isActive));
    });

    // Update panels
    this.elements.tabPanels.forEach((panel) => {
      const isActive = panel.dataset.panel === tab;
      panel.classList.toggle('active', isActive);
    });

    // Reset focus index when switching tabs
    if (resetFocus) {
      this.focusedIndex = -1;
      this.clearFocusedState();
    }
  }

  private navigateOptions(direction: number): void {
    const options = this.getCurrentTabOptions();
    const totalOptions = options.length;

    if (totalOptions === 0) return;

    this.clearFocusedState();

    // If no option is focused, find current active and move from there
    if (this.focusedIndex === -1) {
      const currentTheme = this.getCurrentTheme();
      const activeIndex = options.findIndex((opt) => opt.dataset.themeId === currentTheme);

      if (activeIndex !== -1) {
        this.focusedIndex = (activeIndex + direction + totalOptions) % totalOptions;
      } else {
        this.focusedIndex = direction === 1 ? 0 : totalOptions - 1;
      }
    } else {
      this.focusedIndex = (this.focusedIndex + direction + totalOptions) % totalOptions;
    }

    const option = options[this.focusedIndex];
    const themeId = option.dataset.themeId;

    if (themeId) {
      this.setTheme(themeId);
      option.classList.add('focused');
      option.scrollIntoView({ block: 'nearest' });
    }
  }

  private clearFocusedState(): void {
    this.getAllOptions().forEach((opt) => opt.classList.remove('focused'));
  }

  private getCurrentTheme(): string {
    return document.documentElement.dataset.theme || DEFAULT_THEME;
  }

  private setTheme(themeId: string): void {
    document.documentElement.classList.remove('no-transitions');
    document.documentElement.dataset.theme = themeId;
    localStorage.setItem('theme', themeId);

    // Update meta theme-color
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', getThemeBackgroundColor(themeId));
    }

    this.setActiveOption(themeId);
  }

  private setActiveOption(themeId: string): void {
    this.getAllOptions().forEach((option) => {
      option.classList.toggle('active', option.dataset.themeId === themeId);
    });
  }

  private toggleDropdown(): void {
    this.isOpen ? this.closeDropdown() : this.openDropdown();
  }

  openDropdown(): void {
    this.isOpen = true;
    this.focusedIndex = -1;
    this.clearFocusedState();

    const currentTheme = this.getCurrentTheme();
    this.setInitialTab(currentTheme);

    this.elements.selector.classList.add('open');
    this.elements.toggle.setAttribute('aria-expanded', 'true');
    this.elements.dropdown.setAttribute('aria-hidden', 'false');
  }

  closeDropdown(): void {
    this.isOpen = false;
    this.clearFocusedState();
    this.elements.selector.classList.remove('open');
    this.elements.toggle.setAttribute('aria-expanded', 'false');
    this.elements.dropdown.setAttribute('aria-hidden', 'true');
  }
}

/**
 * Initialize all theme selectors on the page
 */
export function initThemeSelectors(): void {
  document.querySelectorAll<HTMLElement>('[data-theme-selector]').forEach((el) => {
    new ThemeSelector(el);
  });
}
