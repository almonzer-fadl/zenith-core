import { z } from "zod";
import { auditLog } from "@/lib/audit";
import { handleApiError, ok } from "@/lib/api";
import { rotateRefreshToken } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getRequestId } from "@/lib/observability";

const refreshSchema = z.object({ refreshToken: z.string().min(1), deviceName: z.string().max(120).optional() });

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "local";
    await enforceRateLimit({ key: `refresh:${ip}`, windowSec: 60, max: 30 });
    const body = refreshSchema.parse(await request.json());
    const result = await rotateRefreshToken(body.refreshToken, { userAgent: request.headers.get("user-agent"), ip, deviceName: body.deviceName ?? null });
    await auditLog({ userId: result.userId, action: "auth.refresh", entity: "session", requestId, ip, userAgent: request.headers.get("user-agent") });
    return ok({ accessToken: result.accessToken, refreshToken: result.refreshToken, tokenType: "Bearer", userId: result.userId }, 200, requestId);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
