"use client";

import { useCallback, useEffect, useState } from "react";

type State<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  /** True while a manual refresh runs but stale data is still on screen. */
  refreshing: boolean;
};

/**
 * Fetches a /api/dev/* endpoint, exposing loading/error/refresh state.
 * `immediate: false` defers the first fetch until refresh() is called — used by
 * the expensive health and database probes.
 */
export function useDevResource<T>(url: string, options: { immediate?: boolean } = {}) {
  const immediate = options.immediate ?? true;
  const [state, setState] = useState<State<T>>({
    data: null,
    error: null,
    loading: immediate,
    refreshing: false,
  });

  const load = useCallback(async () => {
    setState((s) => ({
      ...s,
      loading: s.data === null,
      refreshing: s.data !== null,
      error: null,
    }));
    try {
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Request failed (HTTP ${res.status})`);
      setState({ data: json as T, error: null, loading: false, refreshing: false });
    } catch (e: any) {
      setState((s) => ({
        ...s,
        error: `${e?.message || e}`,
        loading: false,
        refreshing: false,
      }));
    }
  }, [url]);

  useEffect(() => {
    if (immediate) load();
  }, [immediate, load]);

  return { ...state, refresh: load, setData: (data: T) => setState((s) => ({ ...s, data })) };
}
