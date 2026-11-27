import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { request } from "@/api/session";
import { useAuth } from "@/auth/provider";

type Entry = { value: unknown; savedAt: number };
const cache = new Map<string, Entry>();
const pending = new Map<string, Promise<unknown>>();
const CACHE_MS = 5 * 60 * 1000;
const MAX_ENTRIES = 30;

export function clearCachedApiQuery(prefix?: string) {
  for (const key of cache.keys()) if (!prefix || key.includes(prefix)) cache.delete(key);
  for (const key of pending.keys()) if (!prefix || key.includes(prefix)) pending.delete(key);
}

export function useCachedApiQuery<T>(path: string | null) {
  const { account } = useAuth();
  const key = path ? `${account?.tenantId ?? account?.id ?? "account"}:${path}` : "";
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    if (!path) { setData(undefined); setLoading(false); return; }
    const cached = cache.get(key);
    if (cached && Date.now() - cached.savedAt < CACHE_MS) {
      setData(cached.value as T); setLoading(false); setError(""); return;
    }
    setData(undefined); setLoading(true); setError("");
    const task = pending.get(key) ?? request<T>(path).then(value => {
      cache.set(key, { value, savedAt: Date.now() });
      while (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value!);
      return value;
    }).finally(() => pending.delete(key));
    pending.set(key, task);
    task.then(value => { if (active) setData(value as T); })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : "Não foi possível carregar os dados."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [key, path, revision]));
  return { data, loading, error, retry: () => { if (key) cache.delete(key); setRevision(v => v + 1); } };
}
