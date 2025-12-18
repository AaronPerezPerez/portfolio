/**
 * Theme Module - Public API
 */

export { ThemeSelector, initThemeSelectors } from './ThemeSelector';
export {
  baseThemes,
  gamingThemes,
  allThemes,
  gamingThemeIds,
  getThemeBackgroundColor,
  getThemeById,
  isGamingTheme,
  DEFAULT_THEME,
} from './theme-config';
export type { ThemeDefinition } from './theme-config';
