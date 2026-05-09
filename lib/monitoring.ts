import { collections } from "@/db/collections";

export async function recordMonitoringEvent(input: {
  userId?: string;
  route: string;
  method: string;
  status: number;
  durationMs: number;
  requestId: string;
}) {
  const c = await collections();
  const now = new Date();
  await c.monitoringEvents.insertOne({
    userId: input.userId ?? "anonymous",
    route: input.route,
    method: input.method,
    status: input.status,
    durationMs: input.durationMs,
    requestId: input.requestId,
    createdAt: now,
    updatedAt: now,
  });
}

export async function getMonitoringSummary(minutes: number) {
  const c = await collections();
  const since = new Date(Date.now() - minutes * 60_000);
  const [events, errors, p95Agg] = await Promise.all([
    c.monitoringEvents.countDocuments({ createdAt: { $gte: since } }),
    c.monitoringEvents.countDocuments({ createdAt: { $gte: since }, status: { $gte: 500 } }),
    c.monitoringEvents.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $sort: { durationMs: 1 } },
      { $group: { _id: null, durations: { $push: "$durationMs" }, avg: { $avg: "$durationMs" } } },
    ]).toArray(),
  ]);

  const durations = (p95Agg[0]?.durations ?? []) as number[];
  const idx = durations.length ? Math.floor(durations.length * 0.95) : 0;
  const p95 = durations.length ? durations[Math.min(idx, durations.length - 1)] : 0;

  return {
    windowMinutes: minutes,
    totalRequests: events,
    error5xx: errors,
    errorRate: events ? Number((errors / events).toFixed(4)) : 0,
    avgDurationMs: Number((p95Agg[0]?.avg ?? 0).toFixed(2)),
    p95DurationMs: p95,
  };
}
