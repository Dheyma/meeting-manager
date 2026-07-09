export const AUTH_KEY = "meeting_mgr_session";
export const ADMIN_NAME = "sunil rasaily";

export interface AuthUser {
  personId: string;
  name: string;
}

export function isAdmin(user: AuthUser | null): boolean {
  return user?.name?.toLowerCase() === ADMIN_NAME;
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

export function clearStoredUser() {
  localStorage.removeItem(AUTH_KEY);
}
