import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Minimal async query hook for the mock API. Keeps the previous data while refetching so filter
 * changes show a subtle busy state instead of flashing skeletons.
 */
export function useMockQuery<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const reqId = useRef(0);

  const run = useCallback(() => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    fn()
      .then((d) => {
        if (id === reqId.current) setData(d);
      })
      .catch((e: unknown) => {
        if (id === reqId.current) setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (id === reqId.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  return { data, error, loading, initialLoading: loading && data === null, reload: run };
}
