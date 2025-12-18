/**
 * LiveManager
 * Handles Server-Sent Events for live user activity
 */

import type { LiveUser } from './state';

export interface LiveCallbacks {
  onUpdate: (count: number, users: LiveUser[]) => void;
  onDisconnect: () => void;
}

export class LiveManager {
  private eventSource: EventSource | null = null;
  private callbacks: LiveCallbacks;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private isActive = false;

  constructor(callbacks: LiveCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Start the SSE connection
   */
  start(): void {
    if (this.eventSource) {
      this.stop();
    }

    this.isActive = true;

    try {
      this.eventSource = new EventSource('/api/admin/live');

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.callbacks.onUpdate(data.count, data.users);
        } catch (e) {
          console.error('Failed to parse SSE data:', e);
        }
      };

      this.eventSource.onerror = () => {
        this.callbacks.onDisconnect();
        this.scheduleReconnect();
      };
    } catch (e) {
      console.error('Failed to start SSE:', e);
      this.callbacks.onDisconnect();
    }
  }

  /**
   * Stop the SSE connection
   */
  stop(): void {
    this.isActive = false;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.callbacks.onDisconnect();
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    if (!this.isActive) return;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    // Reconnect after 30 seconds
    this.reconnectTimeout = setTimeout(() => {
      if (this.isActive) {
        this.start();
      }
    }, 30000);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN;
  }
}
