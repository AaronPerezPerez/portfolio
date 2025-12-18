/**
 * LanguageChart
 * Doughnut chart showing language distribution
 */

import { Chart, getBaseOptions, getThemeColors, LANGUAGE_COLORS } from './config';
import type { ChartConfiguration } from 'chart.js';

export interface LanguageData {
  code: string;
  name: string;
  count: number;
  percentage: number;
}

export class LanguageChart {
  private chart: Chart | null = null;
  private canvas: HTMLCanvasElement;
  private legendContainer: HTMLElement | null;

  constructor(canvasId: string, legendId?: string) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
      throw new Error(`Canvas element "${canvasId}" not found`);
    }
    this.canvas = canvas;
    this.legendContainer = legendId
      ? document.getElementById(legendId)
      : null;
  }

  render(data: LanguageData[], total: number): void {
    // Destroy existing chart if any
    if (this.chart) {
      this.chart.destroy();
    }

    const colors = getThemeColors();
    const baseOptions = getBaseOptions();

    const backgroundColors = data.map(
      (d) => LANGUAGE_COLORS[d.code as keyof typeof LANGUAGE_COLORS] ?? LANGUAGE_COLORS.other
    );

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: data.map((d) => d.name),
        datasets: [
          {
            data: data.map((d) => d.count),
            backgroundColor: backgroundColors,
            borderColor: colors.background,
            borderWidth: 2,
          },
        ],
      },
      options: {
        ...baseOptions,
        cutout: '65%',
        plugins: {
          ...baseOptions.plugins as Record<string, unknown>,
          tooltip: {
            ...(baseOptions.plugins as Record<string, unknown>).tooltip as Record<string, unknown>,
            callbacks: {
              label: (context) => {
                const lang = data[context.dataIndex];
                return `${lang.count} messages (${lang.percentage.toFixed(1)}%)`;
              },
            },
          },
        },
        scales: undefined, // Doughnut doesn't use scales
      } as ChartConfiguration<'doughnut'>['options'],
    };

    this.chart = new Chart(this.canvas, config);

    // Render legend if container exists
    if (this.legendContainer) {
      this.renderLegend(data, total);
    }
  }

  private renderLegend(data: LanguageData[], total: number): void {
    if (!this.legendContainer) return;

    this.legendContainer.innerHTML = data
      .map((lang) => {
        const color =
          LANGUAGE_COLORS[lang.code as keyof typeof LANGUAGE_COLORS] ??
          LANGUAGE_COLORS.other;
        return `
        <div class="flex items-center gap-2">
          <div
            class="w-3 h-3 rounded-full"
            style="background: ${color};"
          ></div>
          <span class="text-[var(--text-muted)]">${lang.name}</span>
          <span class="text-[var(--text-primary)]">${lang.percentage.toFixed(1)}%</span>
        </div>
      `;
      })
      .join('');
  }

  destroy(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }
}

/**
 * Simple CSS-based donut chart renderer (fallback/alternative)
 */
export function renderSimpleDonut(
  containerId: string,
  legendId: string,
  data: LanguageData[],
  total: number
): void {
  const chartContainer = document.getElementById(containerId);
  const legendContainer = document.getElementById(legendId);
  if (!chartContainer || !legendContainer) return;

  // Build conic gradient
  let offset = 0;
  const segments = data.map((lang) => {
    const color =
      LANGUAGE_COLORS[lang.code as keyof typeof LANGUAGE_COLORS] ??
      LANGUAGE_COLORS.other;
    const segment = {
      color,
      percentage: lang.percentage,
      offset,
    };
    offset += lang.percentage;
    return segment;
  });

  const gradientStops = segments
    .map((s) => `${s.color} ${s.offset}% ${s.offset + s.percentage}%`)
    .join(', ');

  chartContainer.innerHTML = `
    <div
      style="
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background: conic-gradient(${gradientStops || 'rgba(255,255,255,0.1) 0% 100%'});
        position: relative;
      "
    >
      <div
        style="
          position: absolute;
          inset: 25%;
          background: var(--bg-primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        "
      >
        <span class="text-xl font-bold font-mono">${total}</span>
      </div>
    </div>
  `;

  // Render legend
  legendContainer.innerHTML = data
    .map((lang) => {
      const color =
        LANGUAGE_COLORS[lang.code as keyof typeof LANGUAGE_COLORS] ??
        LANGUAGE_COLORS.other;
      return `
      <div class="flex items-center gap-2">
        <div
          class="w-3 h-3 rounded-full"
          style="background: ${color};"
        ></div>
        <span class="text-[var(--text-muted)]">${lang.name}</span>
        <span class="text-[var(--text-primary)]">${lang.percentage.toFixed(1)}%</span>
      </div>
    `;
    })
    .join('');
}
