/**
 * TopicsChart
 * Horizontal bar chart showing top topics
 */

import { Chart, getBaseOptions, getThemeColors, CHART_COLORS } from './config';
import type { ChartConfiguration } from 'chart.js';

export interface TopicData {
  topic: string;
  count: number;
  percentage: number;
}

export class TopicsChart {
  private chart: Chart | null = null;
  private canvas: HTMLCanvasElement;

  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
      throw new Error(`Canvas element "${canvasId}" not found`);
    }
    this.canvas = canvas;
  }

  render(data: TopicData[]): void {
    // Destroy existing chart if any
    if (this.chart) {
      this.chart.destroy();
    }

    const colors = getThemeColors();
    const baseOptions = getBaseOptions();

    // Color palette for topics
    const colorPalette = Object.values(CHART_COLORS);

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: data.map((d) => this.formatTopicLabel(d.topic)),
        datasets: [
          {
            data: data.map((d) => d.count),
            backgroundColor: data.map(
              (_, i) => colorPalette[i % colorPalette.length]
            ),
            borderWidth: 0,
            borderRadius: 4,
          },
        ],
      },
      options: {
        ...baseOptions,
        indexAxis: 'y', // Horizontal bars
        plugins: {
          ...baseOptions.plugins as Record<string, unknown>,
          tooltip: {
            ...(baseOptions.plugins as Record<string, unknown>).tooltip as Record<string, unknown>,
            callbacks: {
              label: (context) => {
                const topic = data[context.dataIndex];
                return `${topic.count} mentions (${topic.percentage.toFixed(1)}%)`;
              },
            },
          },
        },
        scales: {
          x: {
            ...(baseOptions.scales as Record<string, unknown>).x as Record<string, unknown>,
            beginAtZero: true,
            ticks: {
              ...((baseOptions.scales as Record<string, unknown>).x as Record<string, unknown>).ticks as Record<string, unknown>,
              stepSize: 1,
              callback: (value) =>
                Number.isInteger(value) ? value : null,
            },
          },
          y: {
            ...(baseOptions.scales as Record<string, unknown>).y as Record<string, unknown>,
            grid: {
              display: false,
            },
          },
        },
      } as ChartConfiguration<'bar'>['options'],
    };

    this.chart = new Chart(this.canvas, config);
  }

  private formatTopicLabel(topic: string): string {
    // Capitalize first letter and limit length
    const formatted = topic.charAt(0).toUpperCase() + topic.slice(1);
    return formatted.length > 15 ? formatted.slice(0, 15) + '...' : formatted;
  }

  destroy(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }
}

/**
 * Simple HTML/CSS-based topics renderer (fallback/alternative)
 */
export function renderSimpleTopics(containerId: string, data: TopicData[]): void {
  const container = document.getElementById(containerId);
  if (!container) return;

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  // Color palette
  const colorPalette = Object.values(CHART_COLORS);

  container.innerHTML = data
    .map((topic, i) => {
      const width = (topic.count / maxCount) * 100;
      const color = colorPalette[i % colorPalette.length];

      return `
      <div class="space-y-1">
        <div class="flex justify-between text-xs font-mono">
          <span class="text-[var(--text-primary)]">${topic.topic}</span>
          <span class="text-[var(--text-muted)]">${topic.count} (${topic.percentage.toFixed(1)}%)</span>
        </div>
        <div class="w-full bg-[var(--bg-secondary)] rounded overflow-hidden h-6">
          <div
            class="topic-bar"
            style="width: ${width}%; background: ${color};"
          ></div>
        </div>
      </div>
    `;
    })
    .join('');
}
