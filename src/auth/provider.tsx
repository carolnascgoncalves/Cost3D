import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import * as session from "@/api/session";
import { Platform } from "react-native";
type Auth = {
  account: session.Account | null;
  loading: boolean;
  error: string;
  offline: boolean;
  cachedTheme: session.TenantTheme | null;
  saveTheme: (theme: session.TenantTheme) => Promise<void>;
  restore: () => Promise<void>;
  signIn: (email: string, senha: string) => Promise<void>;
  signOut: () => Promise<void>;
};
const Context = createContext<Auth>(null!);
export function AuthProvider({ children }: React.PropsWithChildren) {
  const [account, setAccount] = useState<session.Account | null>(null);
  const accountRef = useRef<session.Account | null>(null);
  const themeRef = useRef<session.TenantTheme | null>(null);
  const [cachedTheme, setCachedTheme] = useState<session.TenantTheme | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");
  function updateAccount(value: session.Account | null) {
    accountRef.current = value;
    setAccount(value);
  }
  async function refresh(showLoading: boolean) {
    if (showLoading && !accountRef.current) setLoading(true);
    setOffline(false);
    setError("");
    try {
      await session.refreshSession();
      const next = await session.request<session.Account>("/auth/me");
      updateAccount(next);
      if (themeRef.current?.id !== next.tenantId) {
        themeRef.current = null;
        setCachedTheme(null);
      }
      void session.saveWorkspaceCache({
        account: next,
        theme: themeRef.current,
      });
    } catch (e) {
      setOffline(e instanceof session.ApiError && e.status === 0);
      if (e instanceof session.ApiError && e.status === 401) {
        await session.clearSession();
        updateAccount(null);
        themeRef.current = null;
        setCachedTheme(null);
        await session.clearWorkspaceCache();
      } else
        setError(
          e instanceof Error
            ? e.message
            : "Não foi possível restaurar sua sessão.",
        );
    } finally {
      setLoading(false);
    }
  }
  const restore = useCallback(async () => {
    await refresh(true);
  }, []);
  const saveTheme = useCallback(async (theme: session.TenantTheme) => {
    themeRef.current = theme;
    setCachedTheme(theme);
    const current = accountRef.current;
    if (current) await session.saveWorkspaceCache({ account: current, theme });
  }, []);
  useEffect(() => {
    session.onSessionExpired(() => {
      updateAccount(null);
      themeRef.current = null;
      setCachedTheme(null);
      void session.clearWorkspaceCache();
    });
    let active = true;
    void (async () => {
      const cached = await session.loadWorkspaceCache();
      if (active && cached) {
        accountRef.current = cached.account;
        themeRef.current = cached.theme;
        setAccount(cached.account);
        setCachedTheme(cached.theme);
        setLoading(false);
      }
      if (active) await refresh(false);
    })();
    return () => {
      active = false;
    };
  }, []);
  return (
    <Context.Provider
      value={{
        account,
        loading,
        offline,
        cachedTheme,
        saveTheme,
        error,
        restore,
        signIn: async (email, senha) => {
          const next = await session.login(email, senha);
          updateAccount(next);
          themeRef.current = null;
          setCachedTheme(null);
          await session.saveWorkspaceCache({ account: next, theme: null });
          setError("");
        },
        signOut: async () => {
          try {
            await session.logout();
            updateAccount(null);
            themeRef.current = null;
            setCachedTheme(null);
            await session.clearWorkspaceCache();
          } catch (e) {
            if (Platform.OS !== "web") {
              updateAccount(null);
              themeRef.current = null;
              setCachedTheme(null);
              await session.clearWorkspaceCache();
            }
            throw e;
          }
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useAuth = () => useContext(Context);
