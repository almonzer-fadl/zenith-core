import { z } from "zod";
import { auditLog } from "@/lib/audit";
import { handleApiError, ok } from "@/lib/api";
import { revokeRefreshToken } from "@/lib/auth";
import { getRequestId } from "@/lib/observability";

const logoutSchema = z.object({ refreshToken: z.string().min(1), userId: z.string().optional() });

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    const body = logoutSchema.parse(await request.json());
    await revokeRefreshToken(body.refreshToken);
    if (body.userId) {
      await auditLog({ userId: body.userId, action: "auth.logout", entity: "session", requestId, ip: request.headers.get("x-forwarded-for"), userAgent: request.headers.get("user-agent") });
    }
    return ok({ revoked: true }, 200, requestId);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
