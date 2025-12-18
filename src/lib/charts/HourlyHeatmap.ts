/**
 * HourlyHeatmap
 * Bar chart showing message distribution by hour
 */

import { Chart, getBaseOptions, getThemeColors } from './config';
import type { ChartConfiguration } from 'chart.js';

export interface HourlyData {
  hour: number;
  count: number;
}

export class HourlyHeatmap {
  private chart: Chart | null = null;
  private canvas: HTMLCanvasElement;

  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
      throw new Error(`Canvas element "${canvasId}" not found`);
    }
    this.canvas = canvas;
  }

  render(data: HourlyData[]): void {
    // Destroy existing chart if any
    if (this.chart) {
      this.chart.destroy();
    }

    const colors = getThemeColors();
    const baseOptions = getBaseOptions();

    // Ensure we have 24 hours of data
    const hourlyData = Array.from({ length: 24 }, (_, i) => {
      const found = data.find((d) => d.hour === i);
      return found?.count ?? 0;
    });

    const maxCount = Math.max(...hourlyData, 1);

    // Generate gradient colors based on intensity
    const backgroundColors = hourlyData.map((count) => {
      const intensity = count / maxCount;
      const alpha = 0.2 + intensity * 0.8;
      return `rgba(0, 255, 255, ${alpha})`;
    });

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: Array.from({ length: 24 }, (_, i) => `${i}h`),
        datasets: [
          {
            data: hourlyData,
            backgroundColor: backgroundColors,
            borderColor: colors.primary,
            borderWidth: 0,
            borderRadius: 2,
          },
        ],
      },
      options: {
        ...baseOptions,
        plugins: {
          ...baseOptions.plugins as Record<string, unknown>,
          tooltip: {
            ...(baseOptions.plugins as Record<string, unknown>).tooltip as Record<string, unknown>,
            callbacks: {
              title: (items) => `${items[0].label}:00`,
              label: (context) => `${context.parsed.y} messages`,
            },
          },
        },
        scales: {
          x: {
            ...(baseOptions.scales as Record<string, unknown>).x as Record<string, unknown>,
            ticks: {
              ...((baseOptions.scales as Record<string, unknown>).x as Record<string, unknown>).ticks as Record<string, unknown>,
              maxRotation: 0,
              callback: (_, index) =>
                index % 6 === 0 ? `${index}h` : '',
            },
          },
          y: {
            ...(baseOptions.scales as Record<string, unknown>).y as Record<string, unknown>,
            display: false,
            beginAtZero: true,
          },
        },
      } as ChartConfiguration<'bar'>['options'],
    };

    this.chart = new Chart(this.canvas, config);
  }

  destroy(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }
}

/**
 * Simple CSS-based heatmap renderer (fallback/alternative)
 */
export function renderSimpleHeatmap(
  containerId: string,
  data: HourlyData[]
): void {
  const container = document.getElementById(containerId);
  if (!container) return;

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  container.innerHTML = data
    .map((d) => {
      const intensity = d.count / maxCount;
      const height = Math.max(4, Math.round(intensity * 100));
      const opacity = 0.2 + intensity * 0.8;

      return `
      <div
        class="heatmap-bar"
        style="height: ${height}px; background: rgba(0, 255, 255, ${opacity});"
        title="${d.hour}:00 - ${d.count} messages"
      ></div>
    `;
    })
    .join('');
}
