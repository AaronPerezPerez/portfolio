/**
 * DOM Helpers - Common Utilities
 */

/**
 * Event delegation helper
 * Use one listener on a container instead of N listeners on children
 *
 * @example
 * delegateEvent(container, 'click', '.item', (e, target) => {
 *   console.log('Clicked item:', target.dataset.id);
 * });
 */
export function delegateEvent<T extends Element = Element>(
  container: Element,
  eventType: string,
  selector: string,
  handler: (event: Event, target: T) => void
): () => void {
  const listener = (event: Event) => {
    const target = (event.target as Element).closest<T>(selector);
    if (target && container.contains(target)) {
      handler(event, target);
    }
  };

  container.addEventListener(eventType, listener);

  // Return cleanup function
  return () => container.removeEventListener(eventType, listener);
}

/**
 * Wait for an element to appear in DOM
 */
export function waitForElement<T extends Element = Element>(
  selector: string,
  timeout = 5000
): Promise<T | null> {
  return new Promise((resolve) => {
    const element = document.querySelector<T>(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver((_, obs) => {
      const el = document.querySelector<T>(selector);
      if (el) {
        obs.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Timeout fallback
    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Check if element is in viewport
 */
export function isInViewport(element: Element, threshold = 0): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= -threshold &&
    rect.left >= -threshold &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) + threshold &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth) + threshold
  );
}

/**
 * Animate element with Web Animations API
 */
export function animate(
  element: Element,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions = {}
): Animation {
  const defaultOptions: KeyframeAnimationOptions = {
    duration: 300,
    easing: 'ease-out',
    fill: 'forwards',
  };

  return element.animate(keyframes, { ...defaultOptions, ...options });
}

/**
 * Simple class toggle with optional callback
 */
export function toggleClass(
  element: Element,
  className: string,
  force?: boolean,
  callback?: (isActive: boolean) => void
): boolean {
  const result = element.classList.toggle(className, force);
  callback?.(result);
  return result;
}
