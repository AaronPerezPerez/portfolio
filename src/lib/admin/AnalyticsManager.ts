/**
 * AnalyticsManager
 * Handles loading and rendering analytics data
 */

import type { GlobalStats } from './state';
import {
  ActivityChart,
  renderSimpleHeatmap,
  renderSimpleDonut,
  renderSimpleTopics,
  type ActivityData,
  type HourlyData,
  type LanguageData,
  type TopicData,
} from '../charts';

export interface AnalyticsCallbacks {
  onStatsUpdated: (stats: GlobalStats) => void;
  onUnauthorized: () => void;
}

export class AnalyticsManager {
  private callbacks: AnalyticsCallbacks;
  private activityChart: ActivityChart | null = null;

  constructor(callbacks: AnalyticsCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Load all analytics data
   */
  async load(): Promise<void> {
    try {
      // Load stats for header
      const statsResponse = await fetch('/api/admin/conversations');
      if (statsResponse.ok) {
        const data = (await statsResponse.json()) as { stats: GlobalStats };
        this.callbacks.onStatsUpdated(data.stats);
      }

      // Load all analytics data in parallel
      const [activityRes, hourlyRes, languagesRes, topicsRes] = await Promise.all([
        fetch('/api/admin/analytics/activity'),
        fetch('/api/admin/analytics/hourly'),
        fetch('/api/admin/analytics/languages'),
        fetch('/api/admin/analytics/topics'),
      ]);

      // Render each chart
      if (activityRes.ok) {
        const data = (await activityRes.json()) as { activity: ActivityData[] };
        this.renderActivity(data.activity);
      }

      if (hourlyRes.ok) {
        const data = (await hourlyRes.json()) as { hourly: HourlyData[] };
        this.renderHourly(data.hourly);
      }

      if (languagesRes.ok) {
        const data = (await languagesRes.json()) as {
          languages: LanguageData[];
          total: number;
        };
        this.renderLanguages(data.languages, data.total);
      }

      if (topicsRes.ok) {
        const data = (await topicsRes.json()) as { topics: TopicData[] };
        this.renderTopics(data.topics);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  }

  /**
   * Render activity chart
   */
  private renderActivity(data: ActivityData[]): void {
    try {
      // Try Chart.js first
      this.activityChart = new ActivityChart('activity-chart');
      this.activityChart.render(data);
    } catch {
      // Fallback to canvas rendering
      this.renderActivityFallback(data);
    }
  }

  /**
   * Fallback canvas rendering for activity chart
   */
  private renderActivityFallback(data: ActivityData[]): void {
    const canvas = document.getElementById('activity-chart');
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = (canvas.width = canvas.parentElement?.clientWidth || 400);
    const height = (canvas.height = 200);
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };

    const maxCount = Math.max(...data.map((d) => d.count), 1);
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    // Get CSS custom properties
    const style = getComputedStyle(document.documentElement);
    const primaryColor = style.getPropertyValue('--primary').trim() || '#00ffff';
    const textColor = style.getPropertyValue('--text-muted').trim() || '#888';

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // Draw line chart
    if (data.length > 0) {
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 2;
      ctx.beginPath();

      data.forEach((d, i) => {
        const x = padding.left + (i / (data.length - 1 || 1)) * chartWidth;
        const y = padding.top + chartHeight - (d.count / maxCount) * chartHeight;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Draw dots
      ctx.fillStyle = primaryColor;
      data.forEach((d, i) => {
        const x = padding.left + (i / (data.length - 1 || 1)) * chartWidth;
        const y = padding.top + chartHeight - (d.count / maxCount) * chartHeight;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Y-axis labels
    ctx.fillStyle = textColor;
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const value = Math.round((maxCount * (4 - i)) / 4);
      const y = padding.top + (chartHeight / 4) * i + 4;
      ctx.fillText(value.toString(), padding.left - 8, y);
    }
  }

  /**
   * Render hourly heatmap
   */
  private renderHourly(data: HourlyData[]): void {
    renderSimpleHeatmap('hourly-heatmap', data);
  }

  /**
   * Render language distribution
   */
  private renderLanguages(data: LanguageData[], total: number): void {
    renderSimpleDonut('language-chart', 'language-legend', data, total);
  }

  /**
   * Render topics chart
   */
  private renderTopics(data: TopicData[]): void {
    renderSimpleTopics('topics-chart', data);
  }

  /**
   * Cleanup charts
   */
  destroy(): void {
    if (this.activityChart) {
      this.activityChart.destroy();
      this.activityChart = null;
    }
  }
}
