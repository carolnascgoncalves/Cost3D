import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { request } from "@/api/session";
export function useApiQuery<T>(path: string | null, keepPrevious = false) {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!path) {
        setData(undefined);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      if (!keepPrevious) setData(undefined);
      request<T>(path)
        .then((value) => {
          if (active) setData(value);
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
    }, [path, revision, keepPrevious]),
  );
  return { data, loading, error, retry: () => setRevision((v) => v + 1) };
}
