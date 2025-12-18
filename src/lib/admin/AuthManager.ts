/**
 * AuthManager
 * Handles authentication for admin panel
 */

export interface AuthCallbacks {
  onAuthenticated: () => void;
  onUnauthenticated: () => void;
  onError: (message: string) => void;
}

export class AuthManager {
  private callbacks: AuthCallbacks;

  constructor(callbacks: AuthCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Check if user is authenticated
   */
  async checkAuth(): Promise<boolean> {
    try {
      const response = await fetch('/api/admin/auth');
      const data = (await response.json()) as { authenticated?: boolean };

      if (data.authenticated) {
        this.callbacks.onAuthenticated();
        return true;
      } else {
        this.callbacks.onUnauthenticated();
        return false;
      }
    } catch {
      this.callbacks.onUnauthenticated();
      return false;
    }
  }

  /**
   * Login with password
   */
  async login(password: string): Promise<boolean> {
    if (!password) {
      this.callbacks.onError('Password required');
      return false;
    }

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        this.callbacks.onAuthenticated();
        return true;
      } else {
        this.callbacks.onError('Invalid password');
        return false;
      }
    } catch {
      this.callbacks.onError('Authentication failed');
      return false;
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      await fetch('/api/admin/auth', { method: 'DELETE' });
    } finally {
      this.callbacks.onUnauthenticated();
    }
  }
}
