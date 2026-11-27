import { useApiQuery, clearApiQueryCache } from "./use-api-query";

/** Compatibility exports; all reads now share the same 30-second cache. */
export const clearCachedApiQuery = clearApiQueryCache;
export function useCachedApiQuery<T>(path: string | null) {
  return useApiQuery<T>(path);
}
