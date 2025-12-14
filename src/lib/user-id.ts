const USER_ID_KEY = 'aaron-chat-user-id';

export function getUserId(): string {
  if (typeof window === 'undefined') return '';

  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}

export function clearUserId(): void {
  localStorage.removeItem(USER_ID_KEY);
}
