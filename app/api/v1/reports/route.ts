import { handleApiError, ok } from "@/lib/api";
import { requireBearerUserId } from "@/lib/auth";
import { collections } from "@/db/collections";
import { analyzeStability } from "@/lib/analytics";

export async function GET(request: Request) {
  try {
    const userId = await requireBearerUserId(request);
    const c = await collections();
    const [biometrics, telemetry] = await Promise.all([
      c.biometrics.find({ userId }).sort({ timestamp: 1 }).toArray(),
      c.telemetry.find({ userId }).sort({ timestamp: 1 }).toArray(),
    ]);

    const analysis = analyzeStability(
      biometrics.map((b) => ({ level: Number(b.bgLevel ?? 0), timestamp: new Date(b.timestamp) })),
      telemetry.map((t) => ({ distanceKm: Number(t.distanceKm ?? 0), paceSeconds: Number(t.paceSeconds ?? 0), avgHr: Number(t.avgHr ?? 0), rpe: Number(t.rpe ?? 0), timestamp: new Date(t.timestamp) }))
    );

    return ok({ biometrics, telemetry, analysis });
  } catch (error) {
    return handleApiError(error);
  }
}
