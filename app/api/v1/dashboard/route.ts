import { handleApiError, ok } from "@/lib/api";
import { requireBearerUserId } from "@/lib/auth";
import { collections } from "@/db/collections";

export async function GET(request: Request) {
  try {
    const userId = await requireBearerUserId(request);
    const c = await collections();
    const [biometrics, telemetry, sleep] = await Promise.all([
      c.biometrics.find({ userId }).sort({ timestamp: -1 }).limit(1).toArray(),
      c.telemetry.find({ userId }).sort({ timestamp: -1 }).limit(1).toArray(),
      c.sleepLogs.find({ userId }).sort({ timestamp: -1 }).limit(1).toArray(),
    ]);
    return ok({ biometrics: biometrics[0] ?? null, telemetry: telemetry[0] ?? null, sleep: sleep[0] ?? null });
  } catch (error) {
    return handleApiError(error);
  }
}
