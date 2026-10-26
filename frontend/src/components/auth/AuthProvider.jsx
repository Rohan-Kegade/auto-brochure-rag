import { useCallback, useEffect, useMemo, useState } from "react";
import { getToken, setToken, setUnauthorizedHandler } from "../../api/api";
import {
  deleteAccountApi,
  fetchMeApi,
  loginApi,
  logoutApi,
  signupApi,
  updateProfileApi,
} from "../../api/auth";
import { AuthContext } from "../../hooks/useAuth";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Only a saved token needs checking with the server before first render.
  const [isLoading, setIsLoading] = useState(() => Boolean(getToken()));

  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    if (!getToken()) return;
    let cancelled = false;
    fetchMeApi()
      .then((me) => !cancelled && setUser(me))
      // A 401 has already cleared the session; anything else (backend down)
      // leaves the token so a reload can try again.
      .catch(() => {})
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  const startSession = ({ token, user: me }) => {
    setToken(token);
    setUser(me);
    return me;
  };

  const value = useMemo(
    () => ({
      user,
      isLoading,
      login: async (credentials) => startSession(await loginApi(credentials)),
      signup: async (details) => startSession(await signupApi(details)),
      logout: async () => {
        // Log out locally even if the server can't be reached.
        await logoutApi().catch(() => {});
        clearSession();
      },
      updateProfile: async (details) => setUser(await updateProfileApi(details)),
      deleteAccount: async (details) => {
        await deleteAccountApi(details);
        clearSession();
      },
    }),
    [user, isLoading, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
