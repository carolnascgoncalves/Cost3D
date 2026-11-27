import { useCallback, useEffect, useMemo, useState } from "react";
import type { ImageSource } from "expo-image";
import { apiUrl, getAccessToken, request } from "@/api/session";
import { useAuth } from "@/auth/provider";

export function useApiImage(path: string | null) {
  const { account } = useAuth();
  const tenant = account?.tenantId ?? account?.id ?? "account";
  const [tokenRevision, setTokenRevision] = useState(0);
  const [refreshed, setRefreshed] = useState(false);
  const [failedPath, setFailedPath] = useState("");

  useEffect(() => {
    setRefreshed(false);
    setFailedPath("");
  }, [path]);

  const source = useMemo<ImageSource | null>(() => {
    const token = getAccessToken();
    if (!path || !token) return null;
    return {
      uri: `${apiUrl}/api/v1${path}`,
      headers: { Authorization: `Bearer ${token}` },
      cacheKey: `cost3d:${tenant}:${path}`,
    };
  }, [path, tenant, tokenRevision]);

  const onError = useCallback(() => {
    if (!path) return;
    if (refreshed) {
      setFailedPath(path);
      return;
    }
    setRefreshed(true);
    void request("/auth/me")
      .then(() => {
        setFailedPath("");
        setTokenRevision((value) => value + 1);
      })
      .catch(() => setFailedPath(path));
  }, [path, refreshed]);

  const retry = useCallback(() => {
    setRefreshed(false);
    setFailedPath("");
    setTokenRevision((value) => value + 1);
  }, []);

  return { source, failed: failedPath === path, onError, retry };
}
