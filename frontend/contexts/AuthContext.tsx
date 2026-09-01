"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  AuthUser,
  getToken,
  getSavedUser,
  clearAuth,
  getMeApi,
} from "@/lib/authClient";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  setUser: (u: AuthUser | null) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    const me = await getMeApi();
    if (me) {
      setUser(me);
      localStorage.setItem("auth_user", JSON.stringify(me));
    } else {
      // Token invalid or expired
      clearAuth();
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Instant restore from cache (avoids flash)
    const cached = getSavedUser();
    if (cached) setUser(cached);

    // Background verification
    refreshUser();
  }, [refreshUser]);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
    window.location.href = "/";
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, setUser, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
