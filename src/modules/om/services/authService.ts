import { AuthUser } from '../types';

export const HARDCODED_CREDENTIALS = {
  uid: 'Operational',
  pw: 'Operational@123',
};

const STORAGE_KEY = 'intuitive_om_auth_state';

/**
 * Retrieve saved login session from localStorage or sessionStorage
 */
export function getSavedAuthUser(): AuthUser | null {
  try {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      return JSON.parse(local) as AuthUser;
    }
    const session = sessionStorage.getItem(STORAGE_KEY);
    if (session) {
      return JSON.parse(session) as AuthUser;
    }
  } catch (err) {
    console.error('Error reading auth state from storage:', err);
  }
  return null;
}

/**
 * Validates credentials against hardcoded user and persists login state
 */
export function authenticateUser(
  uid: string,
  pw: string,
  rememberMe: boolean = true
): { success: boolean; error?: string; user?: AuthUser } {
  const trimmedUid = uid.trim();

  // Validate credentials exactly as requested: uid="Operational", pw="Operational@123"
  if (trimmedUid === HARDCODED_CREDENTIALS.uid && pw === HARDCODED_CREDENTIALS.pw) {
    const user: AuthUser = {
      uid: trimmedUid,
      loginTime: new Date().toISOString(),
      rememberMe,
    };

    try {
      const payload = JSON.stringify(user);
      if (rememberMe) {
        localStorage.setItem(STORAGE_KEY, payload);
      } else {
        sessionStorage.setItem(STORAGE_KEY, payload);
      }
    } catch (err) {
      console.error('Error saving auth state:', err);
    }

    return { success: true, user };
  }

  return {
    success: false,
    error: 'Invalid User ID or Password. Please try again.',
  };
}

/**
 * Clears saved user session
 */
export function logoutUser(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Error clearing auth state:', err);
  }
}
