import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from "react";
import type { TenantTheme } from "@/api/session";
import { useWindowDimensions } from "react-native";
import { createMobileTheme, createTheme } from "./colors";
const StoreName = createContext("Cost3D");
export const useStoreName = () => useContext(StoreName);
const Context = createContext(createTheme());
export function ThemeProvider({
  value,
  children,
}: PropsWithChildren<{ value?: TenantTheme | null }>) {
  const mobile = useWindowDimensions().width < 900;
  const theme = useMemo(
    () => (mobile ? createMobileTheme : createTheme)(value || undefined),
    [value, mobile],
  );
  return (
    <StoreName.Provider value={value?.nome || "Cost3D"}>
      <Context.Provider value={theme}>{children}</Context.Provider>
    </StoreName.Provider>
  );
}
export const useTheme = () => useContext(Context);
