// Simple auth helper for session management
export const AUTH_KEY = 'mbg_session';

export function getSession() {
  if (typeof window === 'undefined') return null;
  try {
    const s = localStorage.getItem(AUTH_KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

export function setSession(user) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_KEY);
}

export function requireRole(session, ...roles) {
  if (!session) return false;
  return roles.includes(session.role);
}
