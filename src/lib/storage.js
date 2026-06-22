const KEY = "freshveg_admin_auth_v1"; // stores non-sensitive user info
const TOKENS_KEY = `${KEY}_tokens`; // tokens persisted to sessionStorage for shorter lifetime

export function getAuth() {
  try {
    const raw = localStorage.getItem(KEY);
    const tokensRaw = sessionStorage.getItem(TOKENS_KEY);

    const userPart = raw ? JSON.parse(raw) : null;
    const tokensPart = tokensRaw ? JSON.parse(tokensRaw) : null;

    if (!userPart && !tokensPart) return null;

    return { ...(userPart || {}), tokens: tokensPart || (userPart?.tokens ?? null) };
  } catch {
    return null;
  }
}

export function setAuth(auth) {
  try {
    const { tokens, user, ...rest } = auth || {};

    // persist non-sensitive parts (user/profile) in localStorage so UI can show basic info
    const profile = { user, ...rest };
    localStorage.setItem(KEY, JSON.stringify(profile));

    // persist tokens into sessionStorage (cleared when tab/window closes)
    if (tokens) sessionStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
    else sessionStorage.removeItem(TOKENS_KEY);
  } catch {
    // ignore storage failures
  }
}

export function clearAuth() {
  try {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(TOKENS_KEY);
  } catch {
    // ignore
  }
}

export function getAccessToken() {
  try {
    const t = sessionStorage.getItem(TOKENS_KEY);
    return t ? JSON.parse(t)?.access_token || null : null;
  } catch {
    return null;
  }
}

export function getRefreshToken() {
  try {
    const t = sessionStorage.getItem(TOKENS_KEY);
    return t ? JSON.parse(t)?.refresh_token || null : null;
  } catch {
    return null;
  }
}

export function getRoles() {
  try {
    const raw = localStorage.getItem(KEY);
    const profile = raw ? JSON.parse(raw) : null;
    return profile?.user?.roles || [];
  } catch {
    return [];
  }
}
