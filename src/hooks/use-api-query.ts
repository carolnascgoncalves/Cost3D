import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { request } from "@/api/session";
import { useAuth } from "@/auth/provider";

type Entry = { value: unknown; savedAt: number; bytes: number };
const cache = new Map<string, Entry>();
const pending = new Map<string, Promise<unknown>>();
const FRESH_MS = 30_000;
const MAX_BYTES = 8 * 1024 * 1024;
let cacheBytes = 0;

function cached(key: string) {
  const entry = cache.get(key);
  if (!entry) return undefined;
  cache.delete(key);
  cache.set(key, entry);
  return entry;
}

function store(key: string, value: unknown) {
  let bytes = 0;
  try {
    bytes = JSON.stringify(value).length * 2;
  } catch {
    return;
  }
  if (bytes > 2 * 1024 * 1024) return;
  const previous = cache.get(key);
  if (previous) cacheBytes -= previous.bytes;
  cache.delete(key);
  cache.set(key, { value, savedAt: Date.now(), bytes });
  cacheBytes += bytes;
  while (cacheBytes > MAX_BYTES && cache.size) {
    const oldestKey = cache.keys().next().value;
    if (!oldestKey) break;
    cacheBytes -= cache.get(oldestKey)?.bytes ?? 0;
    cache.delete(oldestKey);
  }
}

export function clearApiQueryCache(prefix?: string) {
  for (const [key, entry] of cache) {
    if (!prefix || key.includes(prefix)) {
      cache.delete(key);
      cacheBytes -= entry.bytes;
    }
  }
  for (const key of pending.keys())
    if (!prefix || key.includes(prefix)) pending.delete(key);
}

/** Shared stale-while-revalidate cache. Fresh results are reused for 30 seconds. */
export function useApiQuery<T>(path: string | null, keepPrevious = false) {
  const { account } = useAuth();
  const namespace = account?.tenantId ?? account?.id ?? "anonymous";
  const key = `${namespace}:${path ?? ""}`;
  const initial = path ? cached(key) : undefined;
  const [result, setResult] = useState<{ key: string; value: T } | undefined>(
    () => (initial ? { key, value: initial.value as T } : undefined),
  );
  const [loading, setLoading] = useState(!!path && !initial);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const data = !path
    ? keepPrevious && result?.key.startsWith(`${namespace}:`)
      ? result.value
      : undefined
    : result?.key === key
      ? result.value
      : keepPrevious && result?.key.startsWith(`${namespace}:`)
        ? result.value
        : undefined;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!path) {
        if (!keepPrevious) setResult(undefined);
        setLoading(false);
        setError("");
        return;
      }

      const prior = cached(key);
      if (prior) {
        setResult({ key, value: prior.value as T });
        setLoading(false);
      } else {
        if (!keepPrevious) setResult(undefined);
        setLoading(!keepPrevious);
      }
      setError("");
      if (prior && Date.now() - prior.savedAt < FRESH_MS)
        return () => {
          active = false;
        };

      let task = pending.get(key) as Promise<T> | undefined;
      if (!task) {
        task = request<T>(path)
          .then((value) => {
            store(key, value);
            return value;
          })
          .finally(() => pending.delete(key));
        pending.set(key, task);
      }
      task
        .then((value) => {
          if (active) setResult({ key, value });
        })
        .catch((e) => {
          if (active)
            setError(
              e instanceof Error
                ? e.message
                : "Não foi possível carregar os dados.",
            );
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [key, path, revision, keepPrevious]),
  );

  const retry = useCallback(() => {
    clearApiQueryCache(key);
    setRevision((value) => value + 1);
  }, [key]);
  return { data, loading, error, retry };
}
