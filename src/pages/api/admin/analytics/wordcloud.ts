/**
 * Word Cloud Analytics API
 * Extract and count word frequencies from user messages
 */

import type { APIContext } from 'astro';
import {
  withAdminAuthAndDatabase,
  createSuccessResponse,
  createErrorResponse,
} from '../../../../infrastructure/http';
import { sql } from '../../../../db';

export const prerender = false;

// Stopwords in English and Spanish
const STOPWORDS = new Set([
  // English
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for',
  'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his',
  'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my',
  'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if',
  'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like',
  'time', 'no', 'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your',
  'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look',
  'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two',
  'how', 'our', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give',
  'day', 'most', 'us', 'is', 'are', 'was', 'were', 'been', 'being', 'has', 'had',
  'does', 'did', 'doing', 'am', 'hello', 'hi', 'hey', 'thanks', 'thank', 'please',
  'yes', 'no', 'ok', 'okay', 'yeah', 'yep', 'nope', 'sure', 'well', 'very',
  // Spanish
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al',
  'en', 'y', 'que', 'es', 'no', 'se', 'lo', 'por', 'con', 'para', 'como',
  'pero', 'su', 'sus', 'le', 'les', 'más', 'mas', 'ya', 'o', 'este', 'esta',
  'esto', 'estos', 'estas', 'ese', 'esa', 'eso', 'esos', 'esas', 'mi', 'tu',
  'me', 'te', 'si', 'sin', 'sobre', 'entre', 'cuando', 'donde', 'quien',
  'cual', 'todo', 'toda', 'todos', 'todas', 'otro', 'otra', 'otros', 'otras',
  'ser', 'estar', 'tener', 'hacer', 'poder', 'decir', 'ir', 'ver', 'dar',
  'saber', 'querer', 'llegar', 'pasar', 'deber', 'poner', 'parecer', 'quedar',
  'creer', 'hablar', 'llevar', 'dejar', 'seguir', 'encontrar', 'llamar',
  'venir', 'pensar', 'salir', 'volver', 'tomar', 'conocer', 'vivir', 'sentir',
  'hola', 'gracias', 'bueno', 'buena', 'bien', 'muy', 'mucho', 'poco',
  // Common filler words
  'would', 'could', 'should', 'might', 'must', 'shall', 'may', 'will',
  'have', 'has', 'had', 'been', 'being', 'was', 'were', 'are', 'is', 'am',
]);

interface WordCount {
  word: string;
  count: number;
  size: number; // Relative size for visualization (10-100)
}

/**
 * GET /api/admin/analytics/wordcloud
 * Get word frequency data for word cloud visualization
 */
export const GET = withAdminAuthAndDatabase(
  async (context: APIContext, d1: D1Database) => {
    try {
      const url = new URL(context.request.url);
      const limit = parseInt(url.searchParams.get('limit') || '100', 10);
      const minLength = parseInt(url.searchParams.get('minLength') || '3', 10);

      // Get all user messages (not deleted)
      const result = await d1
        .prepare(`
          SELECT m.content
          FROM messages m
          INNER JOIN conversations c ON m.conversation_id = c.id
          WHERE m.role = 'user'
            AND m.deleted_at IS NULL
            AND c.deleted_at IS NULL
        `)
        .all<{ content: string }>();

      // Process all messages to extract words
      const wordCounts = new Map<string, number>();

      for (const row of result.results) {
        const words = extractWords(row.content, minLength);
        for (const word of words) {
          if (!STOPWORDS.has(word)) {
            wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
          }
        }
      }

      // Sort by count and take top N
      const sortedWords = Array.from(wordCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);

      // Calculate relative sizes (10-100 scale)
      const maxCount = sortedWords[0]?.[1] || 1;
      const minCount = sortedWords[sortedWords.length - 1]?.[1] || 1;
      const range = maxCount - minCount || 1;

      const words: WordCount[] = sortedWords.map(([word, count]) => ({
        word,
        count,
        size: Math.round(10 + ((count - minCount) / range) * 90),
      }));

      return createSuccessResponse({
        words,
        totalWords: wordCounts.size,
        totalMessages: result.results.length,
      });
    } catch (error) {
      console.error('[Word Cloud Error]:', error);
      return createErrorResponse('Failed to generate word cloud data', 500);
    }
  }
);

/**
 * Extract words from text
 */
function extractWords(text: string, minLength: number): string[] {
  return text
    .toLowerCase()
    // Remove URLs
    .replace(/https?:\/\/\S+/g, '')
    // Remove email addresses
    .replace(/\S+@\S+\.\S+/g, '')
    // Remove special characters but keep accented letters
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    // Split by whitespace
    .split(/\s+/)
    // Filter by minimum length
    .filter((word) => word.length >= minLength);
}
