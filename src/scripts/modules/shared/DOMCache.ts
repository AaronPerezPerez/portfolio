/**
 * DOMCache - Cached DOM Element References
 *
 * Reduces repeated querySelector calls by caching elements.
 * Automatically invalidates on View Transitions.
 */

type ElementCache = Map<string, Element | null>;

class DOMCacheImpl {
  private cache: ElementCache = new Map();
  private initialized = false;

  constructor() {
    // Listen for View Transitions to invalidate cache
    if (typeof document !== 'undefined') {
      document.addEventListener('astro:after-swap', () => this.clear());
    }
  }

  /**
   * Get a cached element or query and cache it
   */
  get<T extends Element = Element>(selector: string): T | null {
    if (this.cache.has(selector)) {
      return this.cache.get(selector) as T | null;
    }

    const element = document.querySelector<T>(selector);
    this.cache.set(selector, element);
    return element;
  }

  /**
   * Get multiple elements (not cached, returns fresh NodeList)
   */
  getAll<T extends Element = Element>(selector: string): NodeListOf<T> {
    return document.querySelectorAll<T>(selector);
  }

  /**
   * Get element by ID (shorthand)
   */
  byId<T extends HTMLElement = HTMLElement>(id: string): T | null {
    const selector = `#${id}`;
    if (this.cache.has(selector)) {
      return this.cache.get(selector) as T | null;
    }

    const element = document.getElementById(id) as T | null;
    this.cache.set(selector, element);
    return element;
  }

  /**
   * Invalidate a specific cached element
   */
  invalidate(selector: string): void {
    this.cache.delete(selector);
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size (for debugging)
   */
  get size(): number {
    return this.cache.size;
  }
}

/**
 * Global DOMCache instance
 */
export const DOMCache = new DOMCacheImpl();
