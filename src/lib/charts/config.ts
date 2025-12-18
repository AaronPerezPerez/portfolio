/**
 * Chart.js Configuration
 * Base configuration and theme integration
 */

import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
  BarController,
  BarElement,
  DoughnutController,
  ArcElement,
} from 'chart.js';

// Register Chart.js components
Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
  BarController,
  BarElement,
  DoughnutController,
  ArcElement
);

export { Chart };

/**
 * Get theme colors from CSS variables
 */
export function getThemeColors(): {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  textMuted: string;
  border: string;
  grid: string;
} {
  const style = getComputedStyle(document.documentElement);

  return {
    primary: style.getPropertyValue('--primary').trim() || '#00ffff',
    secondary: style.getPropertyValue('--secondary').trim() || '#ff6b6b',
    background: style.getPropertyValue('--bg-primary').trim() || '#0a0a0f',
    text: style.getPropertyValue('--text-primary').trim() || '#ffffff',
    textMuted: style.getPropertyValue('--text-muted').trim() || '#888888',
    border: style.getPropertyValue('--border-color').trim() || '#333333',
    grid: 'rgba(255, 255, 255, 0.1)',
  };
}

/**
 * Base chart options with theme integration
 */
export function getBaseOptions(): Record<string, unknown> {
  const colors = getThemeColors();

  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 300,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: colors.background,
        titleColor: colors.text,
        bodyColor: colors.textMuted,
        borderColor: colors.border,
        borderWidth: 1,
        padding: 12,
        titleFont: {
          family: 'monospace',
          size: 12,
        },
        bodyFont: {
          family: 'monospace',
          size: 11,
        },
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: {
          color: colors.grid,
          drawBorder: false,
        },
        ticks: {
          color: colors.textMuted,
          font: {
            family: 'monospace',
            size: 10,
          },
        },
      },
      y: {
        grid: {
          color: colors.grid,
          drawBorder: false,
        },
        ticks: {
          color: colors.textMuted,
          font: {
            family: 'monospace',
            size: 10,
          },
        },
      },
    },
  };
}

/**
 * Color palette for charts
 */
export const CHART_COLORS = {
  cyan: '#00ffff',
  magenta: '#ff6b6b',
  green: '#4ecdc4',
  yellow: '#ffd93d',
  purple: '#a855f7',
  orange: '#fb923c',
  blue: '#3b82f6',
  gray: '#6b7280',
} as const;

/**
 * Language-specific colors
 */
export const LANGUAGE_COLORS = {
  es: '#ff6b6b',
  en: '#4ecdc4',
  other: '#a8a8a8',
} as const;
