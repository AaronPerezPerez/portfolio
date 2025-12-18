/**
 * Charts Module - Public API
 */

// Configuration
export { Chart, getThemeColors, getBaseOptions, CHART_COLORS, LANGUAGE_COLORS } from './config';

// Chart Components
export { ActivityChart, type ActivityData } from './ActivityChart';
export { HourlyHeatmap, renderSimpleHeatmap, type HourlyData } from './HourlyHeatmap';
export { LanguageChart, renderSimpleDonut, type LanguageData } from './LanguageChart';
export { TopicsChart, renderSimpleTopics, type TopicData } from './TopicsChart';
