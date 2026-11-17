import React, { createContext, useContext, useEffect, useState } from "react";
import * as session from "@/api/session";
import { Platform } from "react-native";
type Auth = {
  account: session.Account | null;
  loading: boolean;
  error: string;
  restore: () => Promise<void>;
  signIn: (email: string, senha: string) => Promise<void>;
  signOut: () => Promise<void>;
};
const Context = createContext<Auth>(null!);
export function AuthProvider({ children }: React.PropsWithChildren) {
  const [account, setAccount] = useState<session.Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function restore() {
    setLoading(true);
    setError("");
    try {
      await session.refreshSession();
      setAccount(await session.request<session.Account>("/auth/me"));
    } catch (e) {
      if (e instanceof session.ApiError && e.status === 401)
        await session.clearSession();
      else
        setError(
          e instanceof Error
            ? e.message
            : "Não foi possível restaurar sua sessão.",
        );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    session.onSessionExpired(() => setAccount(null));
    void restore();
  }, []);
  return (
    <Context.Provider
      value={{
        account,
        loading,
        error,
        restore,
        signIn: async (email, senha) => {
          setAccount(await session.login(email, senha));
          setError("");
        },
        signOut: async () => {
          try {
            await session.logout();
            setAccount(null);
          } catch (e) {
            if (Platform.OS !== "web") setAccount(null);
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
