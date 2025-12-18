/**
 * EventBus - Simple Pub/Sub for Component Communication
 *
 * Use this for decoupled communication between components,
 * especially useful with View Transitions where components
 * may be re-initialized.
 */

type EventCallback<T = unknown> = (data: T) => void;
type UnsubscribeFn = () => void;

interface EventSubscription {
  callback: EventCallback;
  once: boolean;
}

class EventBusImpl {
  private events = new Map<string, Set<EventSubscription>>();

  /**
   * Subscribe to an event
   */
  on<T = unknown>(event: string, callback: EventCallback<T>): UnsubscribeFn {
    return this.subscribe(event, callback as EventCallback, false);
  }

  /**
   * Subscribe to an event (fires only once)
   */
  once<T = unknown>(event: string, callback: EventCallback<T>): UnsubscribeFn {
    return this.subscribe(event, callback as EventCallback, true);
  }

  /**
   * Emit an event with data
   */
  emit<T = unknown>(event: string, data?: T): void {
    const subscriptions = this.events.get(event);
    if (!subscriptions) return;

    const toRemove: EventSubscription[] = [];

    subscriptions.forEach((sub) => {
      sub.callback(data);
      if (sub.once) {
        toRemove.push(sub);
      }
    });

    // Remove one-time subscriptions
    toRemove.forEach((sub) => subscriptions.delete(sub));
  }

  /**
   * Remove all listeners for an event
   */
  off(event: string): void {
    this.events.delete(event);
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events.clear();
  }

  /**
   * Get count of listeners for an event
   */
  listenerCount(event: string): number {
    return this.events.get(event)?.size ?? 0;
  }

  private subscribe(
    event: string,
    callback: EventCallback,
    once: boolean
  ): UnsubscribeFn {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }

    const subscription: EventSubscription = { callback, once };
    this.events.get(event)!.add(subscription);

    // Return unsubscribe function
    return () => {
      this.events.get(event)?.delete(subscription);
    };
  }
}

/**
 * Global EventBus instance
 * Survives View Transitions as it's module-scoped
 */
export const EventBus = new EventBusImpl();

/**
 * Common event names for type safety
 */
export const Events = {
  // Theme events
  THEME_CHANGED: 'theme:changed',
  THEME_SELECTOR_OPENED: 'theme:selector:opened',
  THEME_SELECTOR_CLOSED: 'theme:selector:closed',

  // Chat events
  CHAT_OPENED: 'chat:opened',
  CHAT_CLOSED: 'chat:closed',
  CHAT_MESSAGE_SENT: 'chat:message:sent',
  CHAT_MESSAGE_RECEIVED: 'chat:message:received',

  // Navigation events
  PAGE_TRANSITION_START: 'page:transition:start',
  PAGE_TRANSITION_END: 'page:transition:end',

  // UI events
  MODAL_OPENED: 'modal:opened',
  MODAL_CLOSED: 'modal:closed',
} as const;

export type EventName = (typeof Events)[keyof typeof Events];
