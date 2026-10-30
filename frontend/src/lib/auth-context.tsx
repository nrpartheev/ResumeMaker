import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, ApiError, auth as authStore, type Profile } from "./api";

type AuthState = {
  token: string | null;
  profile: Profile | null;
  loading: boolean;
  isAuthed: boolean;
  hasProfile: boolean;
  refreshProfile: () => Promise<void>;
  setToken: (t: string) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    authStore.clear();
    setTokenState(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!authStore.get()) {
      setProfile(null);
      return;
    }
    try {
      const p = await api<Profile>("/profile");
      setProfile(p ?? null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        clearSession();
        return;
      }
      setProfile(null);
    }
  }, [clearSession]);

  useEffect(() => {
    setTokenState(authStore.get());
    refreshProfile().finally(() => setLoading(false));
  }, [refreshProfile]);

  const setToken = useCallback(async (t: string) => {
    authStore.set(t);
    setTokenState(t);
    await refreshProfile();
  }, [refreshProfile]);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const value = useMemo<AuthState>(() => ({
    token,
    profile,
    loading,
    isAuthed: !!token,
    hasProfile: !!profile && Object.keys(profile).length > 0,
    refreshProfile,
    setToken,
    logout,
  }), [token, profile, loading, refreshProfile, setToken, logout]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
