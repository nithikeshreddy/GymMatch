import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { errorMessage } from "../api/client";

export function useResource<T>(loader: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<{
    data: T | undefined;
    loading: boolean;
    error: string;
  }>({ data: undefined, loading: true, error: "" });
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    // Start in the promise chain so effect cleanup can cancel StrictMode's first request.
    void Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      setState((previous) => ({ ...previous, loading: true, error: "" }));
      try {
        const data = await loader(controller.signal);
        if (!controller.signal.aborted)
          setState({ data, loading: false, error: "" });
      } catch (error) {
        if (!controller.signal.aborted && !axios.isCancel(error)) {
          setState((previous) => ({
            ...previous,
            loading: false,
            error: errorMessage(error),
          }));
        }
      }
    });
    return () => controller.abort();
  }, [loader, revision]);
  return { ...state, reload };
}
