import * as React from "react";
import { clearAuth, getAuth, setAuth } from "../lib/storage";
import { getMe, logout as apiLogout } from "../api/services/auth.service";
import { refreshAccessToken as apiRefreshAccessToken } from "../api/axios";
import { useToast } from "../components/toast/toast-context";
import { AUTH_UPDATED_EVENT, SESSION_EXPIRED_EVENT } from "./auth-events";

const AuthContext = React.createContext(null);
const ACCESS_DENIED_MESSAGE = "This account does not have access to the admin panel.";

function isActiveAdmin(user) {
  return user?.status === "active" && user?.roles?.includes("admin");
}

function getAuthData(payload) {
  return payload?.data?.user ? payload.data : payload;
}

export function AuthProvider({ children }) {
  const [auth, setAuthState] = React.useState(() => getAuth());
  const [booting, setBooting] = React.useState(true);
  const [accessDenied, setAccessDenied] = React.useState(false);
  const toast = useToast();

  const clearSession = React.useCallback(({ denied = false } = {}) => {
    clearAuth();
    setAuthState(null);
    setAccessDenied(denied);
  }, []);

  const login = React.useCallback(
    (payload) => {
      const data = getAuthData(payload);
      const user = data?.user;
      const tokens = data?.tokens;

      if (!isActiveAdmin(user) || !tokens?.access_token || !tokens?.refresh_token) {
        clearSession({ denied: true });
        const error = new Error(ACCESS_DENIED_MESSAGE);
        error.code = "ACCESS_DENIED";
        throw error;
      }

      const next = { user, tokens };
      setAuth(next);
      setAuthState(next);
      setAccessDenied(false);
      return next;
    },
    [clearSession]
  );

  const refreshAccessToken = React.useCallback(async () => {
    const accessToken = await apiRefreshAccessToken();
    setAuthState(getAuth());
    return accessToken;
  }, []);

  const restoreSession = React.useCallback(async () => {
    const storedAuth = getAuth();

    if (!storedAuth?.tokens?.access_token || !storedAuth?.tokens?.refresh_token) {
      clearSession();
      return false;
    }

    try {
      const response = await getMe();
      const data = response?.data;
      const user = data?.user || data;

      if (!isActiveAdmin(user)) {
        clearSession({ denied: true });
        return false;
      }

      const next = { ...getAuth(), user };
      setAuth(next);
      setAuthState(next);
      setAccessDenied(false);
      return true;
    } catch {
      clearSession();
      return false;
    }
  }, [clearSession]);

  React.useEffect(() => {
    let cancelled = false;

    restoreSession().finally(() => {
      if (!cancelled) setBooting(false);
    });

    return () => {
      cancelled = true;
    };
  }, [restoreSession]);

  React.useEffect(() => {
    const syncAuth = () => setAuthState(getAuth());
    const expireSession = () => {
      setAuthState(null);
      setAccessDenied(false);
      toast.error("Session expired", "Your session has expired. Please log in again.");
    };

    window.addEventListener(AUTH_UPDATED_EVENT, syncAuth);
    window.addEventListener(SESSION_EXPIRED_EVENT, expireSession);
    return () => {
      window.removeEventListener(AUTH_UPDATED_EVENT, syncAuth);
      window.removeEventListener(SESSION_EXPIRED_EVENT, expireSession);
    };
  }, [toast]);

  const logout = React.useCallback(async () => {
    const currentAuth = getAuth();

    try {
      if (currentAuth?.tokens?.refresh_token) {
        await apiLogout({ refresh_token: currentAuth.tokens.refresh_token });
      }
    } catch {
      // Local logout must always succeed, even if the API is unavailable.
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = React.useMemo(() => {
    const accessToken = auth?.tokens?.access_token || null;
    const refreshToken = auth?.tokens?.refresh_token || null;
    const isAuthenticated = Boolean(accessToken && refreshToken && isActiveAdmin(auth?.user));

    return {
      auth,
      user: auth?.user || null,
      accessToken,
      refreshToken,
      roles: auth?.user?.roles || [],
      isAuthenticated,
      isAuthed: isAuthenticated,
      booting,
      accessDenied,
      login,
      logout,
      refreshAccessToken,
      restoreSession,
      clearSession,
    };
  }, [auth, booting, accessDenied, login, logout, refreshAccessToken, restoreSession, clearSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
