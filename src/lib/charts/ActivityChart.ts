/**
 * ActivityChart
 * Line chart showing message activity over time
 */

import { Chart, getBaseOptions, getThemeColors } from './config';
import type { ChartConfiguration } from 'chart.js';

export interface ActivityData {
  date: string;
  count: number;
}

export class ActivityChart {
  private chart: Chart | null = null;
  private canvas: HTMLCanvasElement;

  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
      throw new Error(`Canvas element "${canvasId}" not found`);
    }
    this.canvas = canvas;
  }

  render(data: ActivityData[]): void {
    // Destroy existing chart if any
    if (this.chart) {
      this.chart.destroy();
    }

    const colors = getThemeColors();
    const baseOptions = getBaseOptions();

    const labels = data.map((d) => this.formatDate(d.date));
    const values = data.map((d) => d.count);

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            data: values,
            borderColor: colors.primary,
            backgroundColor: `${colors.primary}20`,
            borderWidth: 2,
            fill: true,
            tension: 0.3,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: colors.primary,
            pointBorderColor: colors.background,
            pointBorderWidth: 2,
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
              maxTicksLimit: 7,
            },
          },
          y: {
            ...(baseOptions.scales as Record<string, unknown>).y as Record<string, unknown>,
            beginAtZero: true,
            ticks: {
              ...((baseOptions.scales as Record<string, unknown>).y as Record<string, unknown>).ticks as Record<string, unknown>,
              stepSize: 1,
              callback: (value) =>
                Number.isInteger(value) ? value : null,
            },
          },
        },
      } as ChartConfiguration<'line'>['options'],
    };

    this.chart = new Chart(this.canvas, config);
  }

  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
  }

  destroy(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }
}
