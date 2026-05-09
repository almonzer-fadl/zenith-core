import { recordMonitoringEvent } from "@/lib/monitoring";

export async function monitorResponse(params: {
  startedAt: number;
  route: string;
  method: string;
  requestId: string;
  status: number;
  userId?: string;
}) {
  const durationMs = Date.now() - params.startedAt;
  await recordMonitoringEvent({
    userId: params.userId,
    route: params.route,
    method: params.method,
    status: params.status,
    durationMs,
    requestId: params.requestId,
  });
}
