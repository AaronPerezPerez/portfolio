/**
 * Theme Selector
 * Terminal-style theme picker with keyboard navigation
 */

import Pickr from '@simonwep/pickr';
import '../../../styles/pickr-terminal.css';

import {
  getThemeBackgroundColor,
  isGamingTheme,
  isCustomTheme,
  DEFAULT_THEME,
} from './theme-config';
import {
  applyCustomTheme,
  clearCustomThemeVariables,
  saveCustomTheme,
  loadCustomTheme,
  getDefaultCustomColors,
  type CustomThemeColors,
} from './custom-theme';
import { isValidHex, normalizeHex } from './color-utils';

type TabCategory = 'general' | 'gaming' | 'custom';

const TAB_ORDER: TabCategory[] = ['general', 'gaming', 'custom'];

/**
 * DOM elements for the theme selector
 */
interface ThemeSelectorElements {
  selector: HTMLElement;
  toggle: HTMLButtonElement;
  dropdown: HTMLElement;
  tabButtons: NodeListOf<HTMLButtonElement>;
  tabPanels: NodeListOf<HTMLElement>;
  // Custom theme editor elements
  pickrContainers: NodeListOf<HTMLElement>;
  hexInputs: NodeListOf<HTMLInputElement>;
  previewSwatches: NodeListOf<HTMLElement>;
  applyButton: HTMLButtonElement | null;
}

export class ThemeSelector {
  private elements: ThemeSelectorElements;
  private isOpen = false;
  private focusedIndex = -1;
  private currentTab: TabCategory = 'general';
  private customColors: CustomThemeColors;
  private previewDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pickrInstances: Map<keyof CustomThemeColors, Pickr> = new Map();

  constructor(element: HTMLElement) {
    this.elements = {
      selector: element,
      toggle: element.querySelector('.theme-toggle')!,
      dropdown: element.querySelector('.theme-dropdown')!,
      tabButtons: element.querySelectorAll('.tab-button'),
      tabPanels: element.querySelectorAll('.tab-panel'),
      // Custom theme editor elements
      pickrContainers: element.querySelectorAll('.pickr-container'),
      hexInputs: element.querySelectorAll('.hex-input'),
      previewSwatches: element.querySelectorAll('.preview-swatch'),
      applyButton: element.querySelector('[data-apply-custom]'),
    };

    // Initialize custom colors from localStorage or defaults
    this.customColors = loadCustomTheme() || getDefaultCustomColors();

    this.init();
  }

  private init(): void {
    const currentTheme = this.getCurrentTheme();
    this.setActiveOption(currentTheme);
    this.setInitialTab(currentTheme);

    // Initialize custom theme editor with saved or default colors
    this.initCustomThemeEditor();

    this.bindEvents();
  }

  private initCustomThemeEditor(): void {
    const { pickrContainers, hexInputs, previewSwatches } = this.elements;

    // Initialize Pickr instances for each color
    pickrContainers.forEach((container) => {
      const colorKey = container.dataset.pickr as keyof CustomThemeColors;
      if (!colorKey) return;

      // Destroy existing instance if any
      const existingInstance = this.pickrInstances.get(colorKey);
      if (existingInstance) {
        existingInstance.destroyAndRemove();
        this.pickrInstances.delete(colorKey);
      }

      // Create new Pickr instance
      const pickr = Pickr.create({
        el: container,
        theme: 'nano',
        default: this.customColors[colorKey] || container.dataset.default || '#ffffff',
        position: 'bottom-start',
        adjustableNumbers: true,
        lockOpacity: true,
        comparison: false,
        components: {
          preview: true,
          opacity: false,
          hue: true,
          interaction: {
            hex: true,
            input: true,
            save: true,
            cancel: true,
          },
        },
        i18n: {
          'btn:save': 'OK',
          'btn:cancel': 'X',
        },
      });

      // Handle color change (live preview)
      pickr.on('change', (color: Pickr.HSVaColor) => {
        const hex = color.toHEXA().toString();
        this.handlePickrChange(colorKey, hex);
      });

      // Handle save (close picker)
      pickr.on('save', (color: Pickr.HSVaColor | null) => {
        if (color) {
          const hex = color.toHEXA().toString();
          this.handlePickrChange(colorKey, hex);
        }
        pickr.hide();
      });

      // Handle cancel
      pickr.on('cancel', () => {
        // Restore previous color
        pickr.setColor(this.customColors[colorKey]);
        pickr.hide();
      });

      this.pickrInstances.set(colorKey, pickr);
    });

    // Set initial hex input values
    hexInputs.forEach((input) => {
      const colorKey = input.dataset.hex as keyof CustomThemeColors;
      if (colorKey && this.customColors[colorKey]) {
        input.value = this.customColors[colorKey];
      }
    });

    // Set initial preview swatches
    previewSwatches.forEach((swatch) => {
      const colorKey = swatch.dataset.preview as keyof CustomThemeColors;
      if (colorKey && this.customColors[colorKey]) {
        (swatch as HTMLElement).style.backgroundColor = this.customColors[colorKey];
      }
    });
  }

  private handlePickrChange(colorKey: keyof CustomThemeColors, value: string): void {
    const normalized = normalizeHex(value);
    this.customColors[colorKey] = normalized;

    // Sync with hex input
    const hexInput = this.elements.selector.querySelector(
      `.hex-input[data-hex="${colorKey}"]`
    ) as HTMLInputElement;
    if (hexInput) {
      hexInput.value = normalized;
      hexInput.classList.remove('invalid');
    }

    // Update preview swatch
    this.updatePreviewSwatch(colorKey, normalized);

    // Apply real-time preview (debounced)
    this.schedulePreviewUpdate();
  }

  private updatePickrColors(): void {
    // Update all Pickr instances with current custom colors
    this.pickrInstances.forEach((pickr, colorKey) => {
      pickr.setColor(this.customColors[colorKey], true); // silent update
    });
  }

  private bindEvents(): void {
    const { selector, toggle, tabButtons, hexInputs, applyButton } = this.elements;

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

    // Custom theme hex inputs (sync with Pickr)
    hexInputs.forEach((input) => {
      // Handle typing/pasting hex codes
      input.addEventListener('input', (e) => {
        const colorKey = input.dataset.hex as keyof CustomThemeColors;
        if (colorKey) {
          this.handleHexInputChange(colorKey, (e.target as HTMLInputElement).value, input);
        }
      });

      // Handle blur to normalize value
      input.addEventListener('blur', () => {
        const colorKey = input.dataset.hex as keyof CustomThemeColors;
        if (colorKey && isValidHex(input.value)) {
          input.value = normalizeHex(input.value);
        }
      });
    });

    // Apply custom theme button
    if (applyButton) {
      applyButton.addEventListener('click', () => this.applyAndSaveCustomTheme());
    }

    // Close on outside click (but not when clicking Pickr popup)
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const isInsideSelector = selector.contains(target);
      // Pickr renders popup as portal to document.body with class .pcr-app
      const isInsidePickr = target.closest?.('.pcr-app') !== null;

      if (!isInsideSelector && !isInsidePickr) {
        this.closeDropdown();
      }
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => this.handleKeydown(e));
  }

  private handleHexInputChange(
    colorKey: keyof CustomThemeColors,
    value: string,
    input: HTMLInputElement
  ): void {
    // Add # prefix if missing and user is typing
    let hex = value.trim();
    if (hex && !hex.startsWith('#')) {
      hex = '#' + hex;
    }

    // Validate hex
    if (isValidHex(hex)) {
      const normalized = normalizeHex(hex);
      this.customColors[colorKey] = normalized;
      input.classList.remove('invalid');

      // Sync with Pickr instance
      const pickr = this.pickrInstances.get(colorKey);
      if (pickr) {
        pickr.setColor(normalized);
      }

      // Update preview swatch
      this.updatePreviewSwatch(colorKey, normalized);

      // Apply real-time preview (debounced)
      this.schedulePreviewUpdate();
    } else if (hex.length >= 4) {
      // Mark as invalid only after user has typed enough characters
      input.classList.add('invalid');
    }
  }

  private updatePreviewSwatch(colorKey: keyof CustomThemeColors, value: string): void {
    const swatch = this.elements.selector.querySelector(
      `.preview-swatch[data-preview="${colorKey}"]`
    ) as HTMLElement;
    if (swatch) {
      swatch.style.backgroundColor = value;
    }
  }

  private schedulePreviewUpdate(): void {
    // Debounce preview updates for better performance
    if (this.previewDebounceTimer) {
      clearTimeout(this.previewDebounceTimer);
    }

    this.previewDebounceTimer = setTimeout(() => {
      // Only apply preview if we're on custom tab and dropdown is open
      if (this.isOpen && this.currentTab === 'custom') {
        // Set theme to custom and apply colors
        document.documentElement.dataset.theme = 'custom';
        applyCustomTheme(this.customColors);
      }
    }, 150); // 150ms debounce para reducir lag durante arrastre
  }

  private applyAndSaveCustomTheme(): void {
    // Save to localStorage
    saveCustomTheme(this.customColors);
    localStorage.setItem('theme', 'custom');

    // Apply the theme
    document.documentElement.dataset.theme = 'custom';
    applyCustomTheme(this.customColors);

    // Update meta theme-color
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', this.customColors.background);
    }

    // Visual feedback on button
    const { applyButton } = this.elements;
    if (applyButton) {
      applyButton.classList.add('applied');
      const originalText = applyButton.querySelector('.apply-text')?.textContent;
      const textEl = applyButton.querySelector('.apply-text');
      if (textEl) textEl.textContent = 'APPLIED!';

      setTimeout(() => {
        applyButton.classList.remove('applied');
        if (textEl && originalText) textEl.textContent = originalText;
      }, 1500);
    }

    // Close dropdown after applying
    setTimeout(() => this.closeDropdown(), 800);
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
        this.navigateTabs(-1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.navigateTabs(1);
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
    let tab: TabCategory = 'general';
    if (isCustomTheme(themeId)) {
      tab = 'custom';
    } else if (isGamingTheme(themeId)) {
      tab = 'gaming';
    }
    this.switchTab(tab, false);
  }

  private navigateTabs(direction: number): void {
    const currentIndex = TAB_ORDER.indexOf(this.currentTab);
    const newIndex = (currentIndex + direction + TAB_ORDER.length) % TAB_ORDER.length;
    this.switchTab(TAB_ORDER[newIndex]);
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
    const previousTheme = this.getCurrentTheme();

    document.documentElement.classList.remove('no-transitions');
    document.documentElement.dataset.theme = themeId;
    localStorage.setItem('theme', themeId);

    // If switching FROM custom theme TO a preset, clear custom CSS vars
    if (isCustomTheme(previousTheme) && !isCustomTheme(themeId)) {
      clearCustomThemeVariables();
    }

    // If switching TO custom theme, apply saved custom colors
    if (isCustomTheme(themeId)) {
      const savedColors = loadCustomTheme();
      if (savedColors) {
        this.customColors = savedColors;
        applyCustomTheme(savedColors);
        this.initCustomThemeEditor(); // Refresh editor with saved values
      }
    }

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
