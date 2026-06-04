"use client";

import { useCallback, useState } from "react";

/**
 * Client-side starred-opportunity state with optimistic toggling. Seed it with
 * the ids the server already knows are starred.
 */
export function useFavorites(initial: string[]) {
  const [ids, setIds] = useState<Set<string>>(() => new Set(initial));

  const toggle = useCallback(async (opportunityId: string) => {
    let willStar = false;
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(opportunityId)) {
        next.delete(opportunityId);
        willStar = false;
      } else {
        next.add(opportunityId);
        willStar = true;
      }
      return next;
    });

    try {
      const res = await fetch("/api/favorites", {
        method: willStar ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId }),
      });
      if (!res.ok) throw new Error("request failed");
    } catch {
      // Roll back on failure.
      setIds((prev) => {
        const next = new Set(prev);
        if (willStar) next.delete(opportunityId);
        else next.add(opportunityId);
        return next;
      });
    }
  }, []);

  return { ids, toggle };
}
