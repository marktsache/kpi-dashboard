"use client";

import { useEffect, useState } from "react";

/**
 * Fetches the count of missing KPI weeks for the current year.
 * Used by the Sidebar to show a notification badge.
 */
export function useMissingWeeks(): { count: number; loading: boolean } {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/kpi/missing-weeks")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch");
        return r.json();
      })
      .then((data: { count: number }) => setCount(data.count))
      .catch(() => setCount(0))
      .finally(() => setLoading(false));
  }, []);

  return { count, loading };
}
