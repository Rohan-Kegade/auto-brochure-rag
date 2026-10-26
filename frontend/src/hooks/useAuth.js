import { createContext, useContext } from "react";

export const AuthContext = createContext(null);

/** { user, isLoading, login, signup, logout } from the nearest AuthProvider. */
export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth must be used inside an AuthProvider.");
  return auth;
}
