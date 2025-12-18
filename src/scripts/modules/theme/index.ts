/**
 * Theme Module - Public API
 */

export { ThemeSelector, initThemeSelectors } from './ThemeSelector';
export {
  baseThemes,
  gamingThemes,
  allThemes,
  gamingThemeIds,
  customTheme,
  getThemeBackgroundColor,
  getThemeById,
  isGamingTheme,
  isCustomTheme,
  DEFAULT_THEME,
} from './theme-config';
export type { ThemeDefinition, ThemeCategory } from './theme-config';

// Color utilities
export {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  getLuminance,
  lighten,
  darken,
  saturate,
  withAlpha,
  blend,
  isValidHex,
  normalizeHex,
  getContrastingTextColor,
} from './color-utils';
export type { RGB, HSL } from './color-utils';

// Custom theme
export {
  generateThemeVariables,
  applyCustomTheme,
  clearCustomThemeVariables,
  saveCustomTheme,
  loadCustomTheme,
  hasCustomTheme,
  getDefaultCustomColors,
  generateInlineStyles,
} from './custom-theme';
export type { CustomThemeColors, GeneratedCSSVariables } from './custom-theme';
