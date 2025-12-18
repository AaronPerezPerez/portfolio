/**
 * ContentAnalyzer Domain Service
 * Analyzes message content for language, topics, and other metadata
 */

// Topic patterns for categorization
const TOPIC_PATTERNS: Record<string, RegExp> = {
  'Tech Stack': /stack|tecnolog|typescript|react|node|frontend|backend|framework|lenguaje|language|programming/i,
  'Experience': /experiencia|experience|años|years|worked|trabajado|proyecto|project|portfolio/i,
  'Availability': /disponible|available|hire|contratar|freelance|trabajo|work|remote|remoto|time/i,
  'Pricing': /precio|price|rate|cobr|hora|hour|cost|presupuesto|budget|cuánto/i,
  'Contact': /contact|email|hablar|llamar|meet|reunion|meeting|correo|linkedin|whatsapp/i,
  'Skills': /skill|habilidad|conocimiento|saber|sabes|conoces|dominas|learning|aprender/i,
  'About': /quién|who|about|sobre|cuéntame|tell|yourself|ti|presentar|introduce/i,
};

// Lead detection keywords
const LEAD_KEYWORDS = [
  'precio', 'contratar', 'disponible', 'contacto', 'presupuesto',
  'rate', 'hire', 'available', 'contact', 'budget', 'cost', 'quote',
];

export interface ContentAnalysis {
  language: 'es' | 'en' | 'unknown';
  topics: string[];
  isLead: boolean;
  leadScore: number;
  wordCount: number;
}

export class ContentAnalyzer {
  /**
   * Analyzes content and returns metadata
   */
  static analyze(content: string): ContentAnalysis {
    const lowerContent = content.toLowerCase();
    const words = content.split(/\s+/).filter(w => w.length > 0);

    return {
      language: this.detectLanguage(content),
      topics: this.detectTopics(content),
      isLead: this.detectLead(lowerContent),
      leadScore: this.calculateLeadScore(lowerContent),
      wordCount: words.length,
    };
  }

  /**
   * Detects the language of content
   */
  static detectLanguage(content: string): 'es' | 'en' | 'unknown' {
    const lowerText = content.toLowerCase();

    const spanishPatterns = [
      /\b(hola|qué|cómo|cuál|está|están|para|por|con|una|uno|que|eres|puedes|cuéntame|buenas|dónde|cuánto|cuántos|tengo|tienes)\b/gi,
      /[áéíóúñ¿¡]/g,
    ];

    const englishPatterns = [
      /\b(the|what|how|your|with|for|you|are|this|have|can|do|does|tell|about|hello|hi|hey|nice|great|cool|where|when|why)\b/gi,
    ];

    let esScore = 0;
    let enScore = 0;

    for (const pattern of spanishPatterns) {
      const matches = lowerText.match(pattern);
      esScore += matches ? matches.length : 0;
    }

    for (const pattern of englishPatterns) {
      const matches = lowerText.match(pattern);
      enScore += matches ? matches.length : 0;
    }

    if (esScore > enScore) return 'es';
    if (enScore > esScore) return 'en';
    return 'unknown';
  }

  /**
   * Detects topics in content
   */
  static detectTopics(content: string): string[] {
    const topics: string[] = [];

    for (const [topic, pattern] of Object.entries(TOPIC_PATTERNS)) {
      if (pattern.test(content)) {
        topics.push(topic);
      }
    }

    return topics.length > 0 ? topics : ['Other'];
  }

  /**
   * Detects if content indicates a potential lead
   */
  static detectLead(lowerContent: string): boolean {
    return LEAD_KEYWORDS.some(keyword => lowerContent.includes(keyword));
  }

  /**
   * Calculates a lead quality score (0-100)
   */
  static calculateLeadScore(lowerContent: string): number {
    let score = 0;

    // Keywords matching (up to 60 points)
    const matchedKeywords = LEAD_KEYWORDS.filter(k => lowerContent.includes(k));
    score += Math.min(matchedKeywords.length * 15, 60);

    // Length bonus (longer messages = more engaged) - up to 20 points
    const wordCount = lowerContent.split(/\s+/).length;
    if (wordCount > 10) score += 10;
    if (wordCount > 20) score += 10;

    // Question mark presence (showing interest) - 10 points
    if (lowerContent.includes('?')) score += 10;

    // Contact info request - 10 points
    if (/email|contact|linkedin|whatsapp/i.test(lowerContent)) score += 10;

    return Math.min(score, 100);
  }

  /**
   * Batch analyze multiple messages
   */
  static batchAnalyze(messages: string[]): {
    languages: Record<string, number>;
    topics: Record<string, number>;
    leadCount: number;
    avgLeadScore: number;
  } {
    const languages: Record<string, number> = { es: 0, en: 0, unknown: 0 };
    const topics: Record<string, number> = {};
    let leadCount = 0;
    let totalLeadScore = 0;

    for (const msg of messages) {
      const analysis = this.analyze(msg);

      languages[analysis.language]++;

      for (const topic of analysis.topics) {
        topics[topic] = (topics[topic] || 0) + 1;
      }

      if (analysis.isLead) leadCount++;
      totalLeadScore += analysis.leadScore;
    }

    return {
      languages,
      topics,
      leadCount,
      avgLeadScore: messages.length > 0 ? totalLeadScore / messages.length : 0,
    };
  }
}
