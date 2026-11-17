import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from "react";
import type { TenantTheme } from "@/api/session";
import { createTheme } from "./colors";
const Context = createContext(createTheme());
export function ThemeProvider({
  value,
  children,
}: PropsWithChildren<{ value?: TenantTheme | null }>) {
  const theme = useMemo(() => createTheme(value || undefined), [value]);
  return <Context.Provider value={theme}>{children}</Context.Provider>;
}
export const useTheme = () => useContext(Context);
