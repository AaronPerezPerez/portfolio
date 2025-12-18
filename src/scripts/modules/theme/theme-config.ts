/**
 * Theme Configuration - SINGLE SOURCE OF TRUTH
 * All theme definitions are centralized here
 */

import { loadCustomTheme } from './custom-theme';

export type ThemeCategory = 'general' | 'gaming' | 'custom';

export interface ThemeDefinition {
  id: string;
  name: string;
  icon: string;
  colors: [string, string, string]; // [primary, secondary, background]
  category: ThemeCategory;
}

/**
 * Base/General themes
 */
export const baseThemes: ThemeDefinition[] = [
  { id: 'cyberpunk', name: 'CYBERPUNK', icon: '⚡', colors: ['#00fff7', '#ff00ff', '#0a0a0f'], category: 'general' },
  { id: 'synthwave', name: 'SYNTHWAVE', icon: '🌅', colors: ['#ff2a6d', '#ff7f11', '#0f0e17'], category: 'general' },
  { id: 'matrix', name: 'MATRIX', icon: '💊', colors: ['#00ff41', '#00cc33', '#000000'], category: 'general' },
  { id: 'dracula', name: 'DRACULA', icon: '🧛', colors: ['#bd93f9', '#ff79c6', '#282a36'], category: 'general' },
  { id: 'nord', name: 'NORD', icon: '🌊', colors: ['#88c0d0', '#a3be8c', '#2e3440'], category: 'general' },
  { id: 'gruvbox', name: 'GRUVBOX', icon: '🔥', colors: ['#fe8019', '#fabd2f', '#282828'], category: 'general' },
  { id: 'tokyo', name: 'TOKYO NIGHT', icon: '🌃', colors: ['#7aa2f7', '#bb9af7', '#1a1b26'], category: 'general' },
  { id: 'fallout', name: 'FALLOUT', icon: '☢️', colors: ['#ffb000', '#cc8800', '#0a0a00'], category: 'general' },
  { id: 'crimson', name: 'CRIMSON', icon: '🩸', colors: ['#ff0033', '#cc0022', '#0a0000'], category: 'general' },
  { id: 'catppuccin', name: 'CATPPUCCIN', icon: '🐱', colors: ['#cba6f7', '#f5c2e7', '#1e1e2e'], category: 'general' },
  { id: 'sepia', name: 'SEPIA', icon: '🏜️', colors: ['#d4a574', '#cd7f32', '#1a1510'], category: 'general' },
];

/**
 * Gaming/Retro themes
 */
export const gamingThemes: ThemeDefinition[] = [
  { id: 'gameboy', name: 'GAMEBOY', icon: '🎮', colors: ['#9bbc0f', '#8bac0f', '#0f380f'], category: 'gaming' },
  { id: 'nes', name: 'NES', icon: '🕹️', colors: ['#cc0000', '#a5a2a2', '#1a1a1a'], category: 'gaming' },
  { id: 'ps2', name: 'PS2', icon: '💿', colors: ['#006fcd', '#5cc9fb', '#0a0a12'], category: 'gaming' },
  { id: 'xbox', name: 'XBOX', icon: '🟢', colors: ['#107c10', '#9bc848', '#0d0d0d'], category: 'gaming' },
  { id: 'snes', name: 'SNES', icon: '🎲', colors: ['#4f43ae', '#b5b6e4', '#1a1a24'], category: 'gaming' },
  { id: 'c64', name: 'C64', icon: '💾', colors: ['#352879', '#70a4b2', '#1a1a4a'], category: 'gaming' },
  { id: 'msdos', name: 'MS-DOS', icon: '📟', colors: ['#00aaaa', '#aaaaaa', '#000000'], category: 'gaming' },
];

/**
 * All themes combined
 */
export const allThemes: ThemeDefinition[] = [...baseThemes, ...gamingThemes];

/**
 * Theme IDs by category for quick lookup
 */
export const gamingThemeIds = gamingThemes.map((t) => t.id);

/**
 * Custom theme placeholder (colors loaded dynamically from localStorage)
 */
export const customTheme: ThemeDefinition = {
  id: 'custom',
  name: 'CUSTOM',
  icon: '✨',
  colors: ['#00fff7', '#ff00ff', '#0a0a0f'], // Default, overridden by localStorage
  category: 'custom',
};

/**
 * Get background color for meta theme-color
 */
export function getThemeBackgroundColor(themeId: string): string {
  if (themeId === 'custom') {
    const customColors = loadCustomTheme();
    return customColors?.background || '#0a0a0f';
  }
  const theme = allThemes.find((t) => t.id === themeId);
  return theme?.colors[2] || '#0a0a0f';
}

/**
 * Get theme by ID
 */
export function getThemeById(themeId: string): ThemeDefinition | undefined {
  if (themeId === 'custom') {
    // Return custom theme with current colors from localStorage
    const customColors = loadCustomTheme();
    if (customColors) {
      return {
        ...customTheme,
        colors: [customColors.primary, customColors.secondary, customColors.background],
      };
    }
    return customTheme;
  }
  return allThemes.find((t) => t.id === themeId);
}

/**
 * Check if theme is in gaming category
 */
export function isGamingTheme(themeId: string): boolean {
  return gamingThemeIds.includes(themeId);
}

/**
 * Check if theme is custom
 */
export function isCustomTheme(themeId: string): boolean {
  return themeId === 'custom';
}

/**
 * Default theme ID
 */
export const DEFAULT_THEME = 'cyberpunk';
