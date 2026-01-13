const KEY = "freshveg_admin_auth_v1";

export function getAuth() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAuth(auth) {
  localStorage.setItem(KEY, JSON.stringify(auth));
}

export function clearAuth() {
  localStorage.removeItem(KEY);
}

export function getAccessToken() {
  return getAuth()?.tokens?.access_token || null;
}

export function getRefreshToken() {
  return getAuth()?.tokens?.refresh_token || null;
}

export function getRoles() {
  return getAuth()?.user?.roles || [];
}
