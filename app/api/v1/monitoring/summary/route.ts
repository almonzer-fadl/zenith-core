import { handleApiError, ok } from "@/lib/api";
import { getMonitoringSummary } from "@/lib/monitoring";
import { requireBearerUserId } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await requireBearerUserId(request);
    const url = new URL(request.url);
    const minutes = Math.max(1, Math.min(1440, Number(url.searchParams.get("minutes") ?? "60")));
    const summary = await getMonitoringSummary(minutes);
    return ok(summary);
  } catch (error) {
    return handleApiError(error);
  }
}
