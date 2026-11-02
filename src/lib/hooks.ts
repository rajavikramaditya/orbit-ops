"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { allClientMetrics, buildTodayPriorities, ClientMetrics, PriorityRow } from "@/lib/selectors";
import { HealthStatus } from "@/lib/types";

export function useMetrics(): { metrics: ClientMetrics[]; byId: Map<string, ClientMetrics>; healthMap: Map<string, HealthStatus>; priorities: PriorityRow[] } {
  const store = useStore();
  return useMemo(() => {
    const metrics = allClientMetrics(store.state, store.today);
    const byId = new Map(metrics.map((m) => [m.client.id, m]));
    const healthMap = new Map(metrics.map((m) => [m.client.id, m.health.status]));
    const priorities = buildTodayPriorities(store.state, store.today, healthMap);
    return { metrics, byId, healthMap, priorities };
  }, [store.state, store.today]);
}

export function useTeamName() {
  const store = useStore();
  return (id?: string) => store.state.team.find((t) => t.id === id)?.name ?? "Unassigned";
}
