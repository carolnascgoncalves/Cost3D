import { fetch as expoFetch } from "expo/fetch";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { createSession } from "./session-client";
export { ApiError } from "./session-client";
export type { Account, TenantTheme } from "./session-client";
export const apiUrl = (
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === "android" ? "http://10.0.2.2:8080" : "http://localhost:8080")
).replace(/\/$/, "");
async function exclusive<T>(action: () => Promise<T>): Promise<T> {
  if (
    Platform.OS === "web" &&
    typeof navigator !== "undefined" &&
    navigator.locks
  ) {
    return navigator.locks.request("cost3d-session", action);
  }
  return action();
}
const session = createSession({
  web: Platform.OS === "web",
  url: apiUrl,
  exclusive,
  upload:
    Platform.OS === "web"
      ? undefined
      : (url, body, headers) =>
          expoFetch(url, { method: "POST", headers, body }),
  fetch: (...args) => fetch(...args),
  storage: {
    get: () => SecureStore.getItemAsync("cost3d.refresh"),
    set: (value) => SecureStore.setItemAsync("cost3d.refresh", value),
    clear: () => SecureStore.deleteItemAsync("cost3d.refresh"),
  },
});
export const {
  login,
  logout,
  request,
  refreshSession,
  clearSession,
  onSessionExpired,
} = session;
