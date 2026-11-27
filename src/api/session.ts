import { fetch as expoFetch } from "expo/fetch";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { createSession } from "./session-client";
export { ApiError } from "./session-client";
export type { Account, TenantTheme } from "./session-client";
export type CachedWorkspace = {
  account: import("./session-client").Account;
  theme: import("./session-client").TenantTheme | null;
};
export const apiUrl = (
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === "android" ? "http://10.0.2.2:8080" : "http://localhost:8080")
).replace(/\/$/, "");
const workspaceCacheKey = "cost3d.workspace.v1";
export async function loadWorkspaceCache(): Promise<CachedWorkspace | null> {
  try {
    const raw =
      Platform.OS === "web"
        ? typeof localStorage !== "undefined"
          ? localStorage.getItem(workspaceCacheKey)
          : null
        : await SecureStore.getItemAsync(workspaceCacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedWorkspace;
    return parsed?.account?.id ? parsed : null;
  } catch {
    return null;
  }
}
export async function saveWorkspaceCache(value: CachedWorkspace) {
  try {
    const raw = JSON.stringify(value);
    if (Platform.OS === "web") {
      if (typeof localStorage !== "undefined")
        localStorage.setItem(workspaceCacheKey, raw);
    } else {
      await SecureStore.setItemAsync(workspaceCacheKey, raw);
    }
  } catch {
    // Offline startup remains available from memory when device storage is unavailable.
  }
}
export async function clearWorkspaceCache() {
  try {
    if (Platform.OS === "web") {
      if (typeof localStorage !== "undefined")
        localStorage.removeItem(workspaceCacheKey);
    } else {
      await SecureStore.deleteItemAsync(workspaceCacheKey);
    }
  } catch {}
}
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
  getAccessToken,
  refreshSession,
  clearSession,
  onSessionExpired,
} = session;
