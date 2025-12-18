/**
 * Custom Theme Generator
 * Generates all 25+ CSS variables from 3 base colors
 */

import {
  hexToRgb,
  getLuminance,
  lighten,
  darken,
  withAlpha,
  blend,
  isValidHex,
  normalizeHex,
} from './color-utils';

export interface CustomThemeColors {
  primary: string; // Neon accent (e.g., #00fff7)
  secondary: string; // Secondary accent (e.g., #ff00ff)
  background: string; // Background (e.g., #0a0a0f)
}

export interface GeneratedCSSVariables {
  [key: string]: string;
}

const STORAGE_KEY = 'custom-theme-colors';

const DEFAULT_COLORS: CustomThemeColors = {
  primary: '#00fff7',
  secondary: '#ff00ff',
  background: '#0a0a0f',
};

/**
 * Generate all CSS variables from 3 base colors
 */
export function generateThemeVariables(
  colors: CustomThemeColors
): GeneratedCSSVariables {
  const { primary, secondary, background } = colors;
  const bgLuminance = getLuminance(hexToRgb(background));
  const isDark = bgLuminance <= 0.5;

  // Text colors based on background luminance
  const textPrimary = isDark ? '#e0e0e0' : '#1a1a1a';
  const textSecondary = isDark ? '#a0a0a0' : '#4a4a4a';
  const textMuted = isDark ? '#6b7280' : '#888888';

  // Derived neon colors
  const neonGreen = blend(primary, '#39ff14', 0.6);
  const neonOrange = blend(secondary, '#ff6b35', 0.5);
  const neonYellow = lighten(primary, 30);
  const neonPurple = blend(primary, secondary, 0.5);

  return {
    // Backgrounds
    '--color-bg-primary': background,
    '--color-bg-secondary': lighten(background, 8),
    '--color-bg-terminal': darken(background, 3),
    '--color-bg-card': lighten(background, 12),

    // Neon accents
    '--color-neon-cyan': primary,
    '--color-neon-magenta': secondary,
    '--color-neon-green': neonGreen,
    '--color-neon-orange': neonOrange,
    '--color-neon-yellow': neonYellow,
    '--color-neon-purple': neonPurple,

    // Text
    '--color-text-primary': textPrimary,
    '--color-text-secondary': textSecondary,
    '--color-text-muted': textMuted,

    // Effects
    '--color-scanline': withAlpha(primary, 0.03),
    '--color-glow-cyan': withAlpha(primary, 0.5),
    '--color-glow-magenta': withAlpha(secondary, 0.5),
    '--color-glow-green': withAlpha(neonGreen, 0.5),

    // Overlay control
    '--overlay-opacity': '0.4',
    '--noise-opacity': '0.03',
    '--grid-opacity': '0.05',

    // Scrollbar
    '--scrollbar-thumb': primary,
    '--scrollbar-thumb-hover': secondary,

    // Theme meta
    '--theme-color': background,
  };
}

/**
 * Apply custom theme variables to document root
 */
export function applyCustomTheme(colors: CustomThemeColors): void {
  const variables = generateThemeVariables(colors);
  const root = document.documentElement;

  Object.entries(variables).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
}

/**
 * Clear custom theme variables from document root
 * Call this when switching away from custom theme to a preset
 */
export function clearCustomThemeVariables(): void {
  const root = document.documentElement;
  const variableKeys = Object.keys(
    generateThemeVariables(DEFAULT_COLORS)
  );

  variableKeys.forEach((property) => {
    root.style.removeProperty(property);
  });
}

/**
 * Save custom theme colors to localStorage
 */
export function saveCustomTheme(colors: CustomThemeColors): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
}

/**
 * Load custom theme colors from localStorage
 */
export function loadCustomTheme(): CustomThemeColors | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored);
    // Validate the parsed data
    if (
      isValidHex(parsed.primary) &&
      isValidHex(parsed.secondary) &&
      isValidHex(parsed.background)
    ) {
      return {
        primary: normalizeHex(parsed.primary),
        secondary: normalizeHex(parsed.secondary),
        background: normalizeHex(parsed.background),
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if custom theme exists in localStorage
 */
export function hasCustomTheme(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}

/**
 * Get default custom theme colors
 */
export function getDefaultCustomColors(): CustomThemeColors {
  return { ...DEFAULT_COLORS };
}

/**
 * Generate CSS variables as inline style string
 * Used for applying theme before JS loads (in Layout.astro)
 */
export function generateInlineStyles(colors: CustomThemeColors): string {
  const variables = generateThemeVariables(colors);
  return Object.entries(variables)
    .map(([prop, val]) => `${prop}:${val}`)
    .join(';');
}
