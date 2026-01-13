import * as React from "react";
import { clearAuth, getAuth, setAuth } from "../lib/storage";
import { getMe, logout as apiLogout } from "../api/services/auth.service";

const AuthContext = React.createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuthState] = React.useState(() => getAuth());
  const [booting, setBooting] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const hasToken = auth?.tokens?.access_token;
        if (!hasToken) {
          if (!cancelled) setBooting(false);
          return;
        }

        const resp = await getMe();
        const user = resp?.data?.user;
        if (user) {
          const next = { ...auth, user };
          setAuth(next);
          if (!cancelled) setAuthState(next);
        }
      } catch {
        clearAuth();
        if (!cancelled) setAuthState(null);
      } finally {
        if (!cancelled) setBooting(false);
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = React.useCallback((payload) => {
    // payload is backend verifyOtp response envelope
    const user = payload?.data?.user;
    const tokens = payload?.data?.tokens;
    const next = { user, tokens };
    setAuth(next);
    setAuthState(next);
  }, []);

  const logout = React.useCallback(async () => {
    try {
      const refresh_token = auth?.tokens?.refresh_token;
      if (refresh_token) await apiLogout({ refresh_token });
    } catch {
      // ignore
    } finally {
      clearAuth();
      setAuthState(null);
    }
  }, [auth]);

  const value = React.useMemo(
    () => ({
      auth,
      booting,
      isAuthed: !!auth?.tokens?.access_token,
      roles: auth?.user?.roles || [],
      user: auth?.user || null,
      login,
      logout,
    }),
    [auth, booting, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
