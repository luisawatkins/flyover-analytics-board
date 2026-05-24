import { useEffect, useState } from "react";
import {
  boardMetricsSchema,
  type BoardMetrics,
} from "../../shared/boardMetrics";

type BoardMetricsState = {
  data: BoardMetrics | null;
  loading: boolean;
  error: string;
  lastUpdated: Date | null;
};

export const useBoardMetrics = (pollIntervalMs = 30_000) => {
  const [state, setState] = useState<BoardMetricsState>({
    data: null,
    loading: true,
    error: "",
    lastUpdated: null,
  });

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const response = await fetch("/metrics/board");
        if (!response.ok) {
          throw new Error(`Request failed with ${response.status}`);
        }
        const json: unknown = await response.json();
        const parsed = boardMetricsSchema.parse(json);
        if (isMounted) {
          setState({
            data: parsed,
            loading: false,
            error: "",
            lastUpdated: new Date(),
          });
        }
      } catch (err) {
        if (isMounted) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: (err as Error).message,
          }));
        }
      }
    };

    load();
    const interval = window.setInterval(load, pollIntervalMs);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [pollIntervalMs]);

  return state;
};
